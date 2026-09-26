-- Ottodot TrialGuard: PostgreSQL is the source of truth for seat allocation.
-- gen_random_uuid() is built into supported PostgreSQL versions (and available
-- in Supabase's PostgreSQL distribution), so no extension bootstrap is needed.

create type booking_status as enum ('pending_payment', 'confirmed', 'payment_failed', 'cancelled');
create type payment_outcome as enum ('success', 'failure');

create table parents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index idx_students_parent_id on students(parent_id);

create table trial_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  teacher_name text not null,
  starts_at timestamptz not null,
  capacity integer not null default 4 check (capacity between 1 and 4),
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references parents(id),
  student_id uuid not null references students(id),
  trial_class_id uuid not null references trial_classes(id),
  status booking_status not null default 'pending_payment',
  status_reason text check (status_reason in ('class_full', 'duplicate_confirmed_booking', 'payment_failed') or status_reason is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_bookings_trial_class on bookings(trial_class_id);
create index idx_bookings_student on bookings(student_id);
create index idx_bookings_parent on bookings(parent_id);
create unique index uniq_confirmed_student_trial_class
  on bookings(student_id, trial_class_id) where status = 'confirmed';

create table payment_attempts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  outcome payment_outcome not null,
  created_at timestamptz not null default now()
);
create index idx_payment_attempts_booking on payment_attempts(booking_id);

-- The browser never receives the secret key. The server uses the service role;
-- public Data API roles have no table access or policies for this demo.
alter table parents enable row level security;
alter table students enable row level security;
alter table trial_classes enable row level security;
alter table bookings enable row level security;
alter table payment_attempts enable row level security;

-- Browser roles are intentionally denied: every request is authorized by the
-- application server using the service role, whose key never reaches a client.
-- PGlite omits Supabase roles, so keep the schema portable for integration tests.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
     and exists (select 1 from pg_roles where rolname = 'authenticated') then
    create policy parents_server_only on parents for all to anon, authenticated using (false) with check (false);
    create policy students_server_only on students for all to anon, authenticated using (false) with check (false);
    create policy trial_classes_server_only on trial_classes for all to anon, authenticated using (false) with check (false);
    create policy bookings_server_only on bookings for all to anon, authenticated using (false) with check (false);
    create policy payment_attempts_server_only on payment_attempts for all to anon, authenticated using (false) with check (false);
  end if;
end;
$$;

create or replace function touch_booking_updated_at()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bookings_set_updated_at before update on bookings
for each row execute function touch_booking_updated_at();

-- This function runs as one PostgreSQL transaction. The class row lock makes all
-- confirmations for the same class queue before reading the confirmed count.
create or replace function process_mock_payment(
  p_booking_id uuid,
  p_outcome payment_outcome
)
returns table (booking_id uuid, final_status booking_status, reason text)
language plpgsql
set search_path = public, pg_temp as $$
declare
  v_booking bookings%rowtype;
  v_capacity integer;
  v_confirmed_count integer;
  v_duplicate_exists boolean;
begin
  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  -- Idempotency: terminal bookings receive no second payment attempt or update.
  if v_booking.status <> 'pending_payment' then
    return query select v_booking.id, v_booking.status, v_booking.status_reason;
    return;
  end if;

  insert into payment_attempts (booking_id, outcome) values (p_booking_id, p_outcome);

  if p_outcome = 'failure' then
    update bookings set status = 'payment_failed', status_reason = 'payment_failed' where id = p_booking_id;
    return query select p_booking_id, 'payment_failed'::booking_status, 'payment_failed'::text;
    return;
  end if;

  select capacity into v_capacity from trial_classes where id = v_booking.trial_class_id for update;
  if not found then
    raise exception 'TRIAL_CLASS_NOT_FOUND';
  end if;

  select exists (
    select 1 from bookings
    where student_id = v_booking.student_id and trial_class_id = v_booking.trial_class_id
      and status = 'confirmed' and id <> p_booking_id
  ) into v_duplicate_exists;

  if v_duplicate_exists then
    update bookings set status = 'cancelled', status_reason = 'duplicate_confirmed_booking' where id = p_booking_id;
    return query select p_booking_id, 'cancelled'::booking_status, 'duplicate_confirmed_booking'::text;
    return;
  end if;

  select count(*) into v_confirmed_count from bookings
  where trial_class_id = v_booking.trial_class_id and status = 'confirmed';

  if v_confirmed_count >= v_capacity then
    update bookings set status = 'cancelled', status_reason = 'class_full' where id = p_booking_id;
    return query select p_booking_id, 'cancelled'::booking_status, 'class_full'::text;
    return;
  end if;

  update bookings set status = 'confirmed', status_reason = null where id = p_booking_id;
  return query select p_booking_id, 'confirmed'::booking_status, null::text;
end;
$$;

-- Resets only the dedicated Reliability Lab class, then returns two pending
-- booking IDs. The two payment RPCs still compete through process_mock_payment.
create or replace function prepare_last_seat_race()
returns table (booking_a uuid, booking_b uuid)
language plpgsql
set search_path = public, pg_temp as $$
declare
  v_class_id uuid := '00000000-0000-0000-0000-000000000104';
  v_booking_a uuid := gen_random_uuid();
  v_booking_b uuid := gen_random_uuid();
begin
  perform 1 from trial_classes where id = v_class_id for update;
  if not found then
    raise exception 'RACE_CLASS_NOT_FOUND';
  end if;

  delete from bookings where trial_class_id = v_class_id;
  insert into bookings (id, parent_id, student_id, trial_class_id, status)
  select gen_random_uuid(), parent_id, id, v_class_id, 'confirmed'
  from students where id in (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003'
  );
  insert into bookings (id, parent_id, student_id, trial_class_id, status)
  select v_booking_a, parent_id, id, v_class_id, 'pending_payment'
  from students where id = '00000000-0000-0000-0000-000000000007';
  insert into bookings (id, parent_id, student_id, trial_class_id, status)
  select v_booking_b, parent_id, id, v_class_id, 'pending_payment'
  from students where id = '00000000-0000-0000-0000-000000000008';

  return query select v_booking_a, v_booking_b;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke all on function process_mock_payment(uuid, payment_outcome) from public;
    revoke all on function prepare_last_seat_race() from public;
    grant execute on function process_mock_payment(uuid, payment_outcome) to service_role;
    grant execute on function prepare_last_seat_race() to service_role;
  end if;
end;
$$;
