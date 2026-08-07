import Image from "next/image";

/**
 * The questionnaire's ambient visual signature. CSS moves the two paths as a
 * whole, keeping this component server-safe and the motion inexpensive.
 */
export function QuestionnaireWeave() {
  return (
    <div aria-hidden="true" className="ctest-weave">
      <svg
        className="ctest-weave-lines"
        preserveAspectRatio="none"
        viewBox="0 0 1200 120"
      >
        <g className="ctest-weave-thread ctest-weave-thread--ember">
          <path d="M-80 18 C180 20 230 112 520 78 S900 22 1280 70" />
        </g>
        <g className="ctest-weave-thread ctest-weave-thread--signal">
          <path d="M-80 92 C190 110 290 28 560 70 S920 104 1280 34" />
        </g>
      </svg>
      <span className="ctest-weave-mark">
        <Image alt="" height={38} loading="eager" src="/icon.svg" width={38} />
      </span>
    </div>
  );
}
