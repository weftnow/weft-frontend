/**
 * The typographic units every section is assembled from.
 */

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="kami-eyebrow">{children}</span>;
}

/**
 * A section headline, broken where the copy says to break.
 *
 * `<br>` rather than a block per line: the lines are one sentence, and
 * splitting them into separate elements makes a screen reader announce three
 * fragments where a reader sees one heading.
 */
export function Headline({
  lines,
  className = "",
  as: Tag = "h2",
}: {
  lines: readonly string[];
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <Tag className={`kami-display kami-display--section ${className}`.trim()}>
      {lines.map((line, index) => (
        <span key={line}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
    </Tag>
  );
}

/**
 * A handwritten note in the margin.
 *
 * Decoration, and hidden from assistive technology: these are asides in a
 * second voice, and read aloud between a heading and its body they interrupt
 * the sentence the section is making. Nothing here may be the only place a
 * fact appears.
 */
export function Hand({
  children,
  className = "",
  tilt = "left",
  style,
}: {
  children: string;
  className?: string;
  tilt?: "left" | "right";
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={`kami-hand ${tilt === "right" ? "kami-hand--right" : ""} ${className}`.trim()}
      style={style}
    >
      {children.split("\n").map((line) => (
        <span className="block" key={line}>
          {line}
        </span>
      ))}
    </span>
  );
}
