/**
 * The ember and signal threads interlacing once -- the same two threads
 * WeaveCanvas draws across the landing page, here joining two names.
 * pathLength=1 lets the CSS draw-in animate dashoffset without measuring.
 */
export function ThreadCross() {
  return (
    <svg aria-hidden className="ctest-threads" viewBox="0 0 100 36" preserveAspectRatio="none">
      <path d="M 0 8 C 34 8, 66 28, 100 28" data-thread="ember" pathLength={1} />
      <path d="M 0 28 C 34 28, 66 8, 100 8" data-thread="signal" pathLength={1} />
    </svg>
  );
}
