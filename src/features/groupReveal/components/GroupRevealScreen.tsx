"use client";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { initialsFor } from "../model/groupReveal.model";
import { useGroupReveal } from "../hooks/useGroupReveal";
import { groupRevealLanguageFor, groupRevealMessages } from "../i18n/groupReveal.messages";
import styles from "./GroupReveal.module.css";

export function GroupRevealScreen({ formToken }: { formToken: string }) {
 const router = useRouter();
 const heading = useRef<HTMLHeadingElement>(null);
 const { group, error, confirmationError, confirming, remaining, retry, confirm } = useGroupReveal(formToken);
 const messages = useMemo(() => groupRevealMessages[groupRevealLanguageFor(
   typeof navigator === "undefined" ? undefined : navigator.language,
 )], []);
 useEffect(() => { if (group && remaining === 0) heading.current?.focus(); }, [group, remaining]);
 const content = error ? <><p role="status">{messages.unavailable}</p><button className={styles.secondaryButton} onClick={() => void retry()}>{messages.retry}</button></>
   : !group ? <><p role="status">{messages.waiting}</p><p>{messages.waitingDetail}</p></>
   : remaining > 0 ? <><p className={styles.eyebrow}>{messages.waiting}</p><p className={styles.countdown} aria-live="polite">{messages.countdown.replace("{seconds}", String(Math.ceil(remaining / 1_000)))}</p></>
   : <><p className={styles.eyebrow}>{messages.matchComplete} · {group.tablemates.length} {messages.connections}</p><h1 ref={heading} tabIndex={-1}>{messages.circleReady}</h1><p className={styles.table}>{messages.table} {group.group_index + 1} · {group.colour}</p><ul className={styles.members}>{group.tablemates.map(mate => <li key={`${mate.display_name}-${mate.role}`} className={styles.member}><span className={styles.avatar} aria-hidden="true">{initialsFor(mate.display_name)}</span><div><h2>{mate.display_name}</h2><p>{mate.role}{mate.company ? <><span aria-hidden="true"> · </span>{mate.company}</> : null}</p><p className={styles.profile}>{mate.profile}</p></div></li>)}</ul>{confirmationError ? <p role="alert">{messages.confirmationError}</p> : null}<div className={styles.actionDock}><button className={styles.primaryButton} disabled={confirming} onClick={() => group.confirmed ? router.push(`/questionnaire/${encodeURIComponent(formToken)}/conversation`) : void confirm()}>{group.confirmed ? messages.startConversation : confirming ? messages.starting : messages.foundGroup}</button></div></>;
 return <main className={styles.shell}><section className={styles.frame}>{content}</section></main>;
}
