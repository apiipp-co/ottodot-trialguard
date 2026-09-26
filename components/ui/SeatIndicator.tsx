type Props = { confirmed: number; capacity?: number; label?: boolean };

export function SeatIndicator({ confirmed, capacity = 4, label = true }: Props) {
  return <div className="seat-wrap" aria-label={`${confirmed} of ${capacity} seats confirmed`}>
    <span className="seat-dots" aria-hidden="true">
      {Array.from({ length: capacity }, (_, index) => <i className={index < confirmed ? "seat filled" : "seat"} key={index} />)}
    </span>
    {label && <span>{confirmed}/{capacity} confirmed</span>}
  </div>;
}
