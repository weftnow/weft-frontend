"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { OrganizerLanguage } from "../types/organizerAuth.types";
import { LanguageSelector } from "./LanguageSelector";
import styles from "./OrganizerAuth.module.css";

export function AuthShell({
  children,
  language,
  onLanguageChange,
  progress,
}: {
  children: ReactNode;
  language: OrganizerLanguage;
  onLanguageChange: (language: OrganizerLanguage) => void;
  progress?: { current: number; total: number; label: string };
}) {
  return (
    <main className={styles.shell} lang={language}>
      <div aria-hidden="true" className={styles.ambientEmber} />
      <div aria-hidden="true" className={styles.ambientSignal} />
      <header className={styles.header}>
        <Link aria-label="Weft home" className={styles.brand} href="/">
          <Image alt="" aria-hidden height={38} src="/icon.svg" width={38} />
          <span>weft</span>
        </Link>
        <LanguageSelector language={language} onChange={onLanguageChange} />
      </header>
      {progress ? (
        <div className={styles.progressWrap}>
          <div
            aria-label={progress.label}
            aria-valuemax={progress.total}
            aria-valuemin={1}
            aria-valuenow={progress.current}
            className={styles.progressTrack}
            role="progressbar"
          >
            <span style={{ width: `${(progress.current / progress.total) * 100}%` }} />
          </div>
          <span aria-hidden="true" className={styles.progressCount}>
            {progress.current}/{progress.total}
          </span>
        </div>
      ) : null}
      <div className={styles.stage}>{children}</div>
    </main>
  );
}
