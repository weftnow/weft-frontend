"use client";

import { motion, useReducedMotion } from "motion/react";
import type { FastQuestionRound } from "../types/fastQuestions.types";
import styles from "./FastQuestions.module.css";

export type QuestionDisplayProps = {
  round: FastQuestionRound;
};

function presentQuestion(question: string): string {
  return question.replaceAll("'", "’");
}

export function QuestionDisplay({ round }: QuestionDisplayProps) {
  const reducedMotion = Boolean(useReducedMotion());

  return (
    <motion.h1
      animate={{ opacity: 1, y: 0 }}
      className={styles.question}
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      key={round.id}
      transition={{ duration: reducedMotion ? 0.01 : 0.2, ease: "easeOut" }}
    >
      {presentQuestion(round.question)}
    </motion.h1>
  );
}
