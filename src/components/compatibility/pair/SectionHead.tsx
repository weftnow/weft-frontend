/** The ember rule tick + mono label that opens every result section. */
export function SectionHead({ label }: { label: string }) {
  return (
    <div className="ctest-card-head">
      <span aria-hidden className="ctest-rule" />
      <h2 className="ctest-section-label">{label}</h2>
    </div>
  );
}
