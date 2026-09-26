import { createClient } from "@supabase/supabase-js";

type Table = { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown>; Relationships: [] };
type SupabaseDatabase = {
  public: {
    Tables: Record<string, Table>;
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
  };
};

let client: ReturnType<typeof createClient<SupabaseDatabase>> | undefined;

export function supabaseServer() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured on the server.");
  client ??= createClient<SupabaseDatabase>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  return client;
}
