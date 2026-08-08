"use client";

import Image from "next/image";
import styles from "./FastQuestions.module.css";

export type FastQuestionsCompletionProps = {
  onContinue: () => void;
};

export function FastQuestionsCompletion({ onContinue }: FastQuestionsCompletionProps) {
  return (
    <section aria-labelledby="fast-questions-completion-heading" className={styles.completion}>
      <Image alt="" aria-hidden className={styles.completionMark} height={42} src="/icon.svg" width={42} />
      <h1 id="fast-questions-completion-heading">Fast questions complete.</h1>
      <p>Nice. Now that everyone’s had a chance to speak, let’s go a little deeper.</p>
      <button className={styles.continueButton} onClick={onContinue} type="button">
        Continue
      </button>
    </section>
  );
}
