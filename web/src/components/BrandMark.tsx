// The Aangan mark, as on the landing page: a marigold-to-jade frame around a
// glowing courtyard (the open centre of a home seen from above). The same mark
// is used by day and by night.
export function BrandMark({ size = 48, title }: { size?: number; title?: string }) {
  return (
    <span
      className="night-mark"
      style={{ width: size, height: size }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <i />
    </span>
  );
}
