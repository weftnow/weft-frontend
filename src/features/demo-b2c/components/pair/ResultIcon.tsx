export type ResultIconKind =
  | "values"
  | "humour"
  | "opens-up"
  | "pace"
  | "life-stage";

/** One quiet line icon per measured dimension. */
export function ResultIcon({ kind }: { kind: ResultIconKind }) {
  return (
    <svg
      aria-hidden
      className="ctest-result-icon-svg"
      data-result-icon={kind}
      fill="none"
      viewBox="0 0 24 24"
    >
      {kind === "values" && (
        <path d="M12 20.2 4.7 13A4.8 4.8 0 0 1 11.5 6l.5.6.5-.6a4.8 4.8 0 0 1 6.8 6.9L12 20.2Z" />
      )}
      {kind === "humour" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.6 10h.1M15.3 10h.1M8.5 14.1c1.8 2 5.2 2 7 0" />
        </>
      )}
      {kind === "opens-up" && (
        <>
          <path d="M5.2 17.5 3.8 21l4-1.6c1.2.6 2.6.9 4.2.9 4.9 0 8.8-3.6 8.8-8.1S16.9 4 12 4s-8.8 3.6-8.8 8.2c0 2 .7 3.8 2 5.3Z" />
          <path d="M8.2 12.2h.1M12 12.2h.1M15.8 12.2h.1" />
        </>
      )}
      {kind === "pace" && (
        <>
          <circle cx="12" cy="13" r="7.8" />
          <path d="M9.2 3h5.6M12 13V8.5M12 13l3.2 2" />
        </>
      )}
      {kind === "life-stage" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m14.8 8.2-1.6 5-5 1.6 1.6-5 5-1.6Z" />
        </>
      )}
    </svg>
  );
}

export function traitIconKind(
  label: string,
  traits: { humour: string; opensUp: string; pace: string; lifeStage: string },
): Exclude<ResultIconKind, "values"> {
  if (label === traits.humour) return "humour";
  if (label === traits.opensUp) return "opens-up";
  if (label === traits.pace) return "pace";
  return "life-stage";
}
