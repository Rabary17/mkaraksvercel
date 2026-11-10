export function Icon({
  name,
  filled,
  size = 24,
  className = "",
}: {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span aria-hidden className={`material-symbols-rounded ${filled ? "filled" : ""} ${className}`} style={{ fontSize: size }}>
      {name}
    </span>
  );
}
