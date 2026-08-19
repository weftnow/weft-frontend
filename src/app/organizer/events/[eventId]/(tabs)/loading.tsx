import styles from "@/features/organizer-dashboard/components/Dashboard.module.css";

/**
 * What fills the panel between clicking a tab and the tab arriving.
 *
 * Every tab is force-dynamic and each one waits on the backend, which waits on
 * a database in another region — so the gap is real and measured in seconds on
 * a slow link. Without this file Next held the old tab on screen until the new
 * one was ready, so a click produced no visible response at all and read as a
 * dead button rather than as a wait.
 *
 * The header and the tab bar are the layout's, so they stay put above this and
 * the tab you pressed highlights immediately. Only the panel below redraws.
 *
 * Card-shaped rather than a spinner: every tab opens with cards, so the shape
 * that arrives is the shape that was already there. A spinner would replace a
 * layout with a dot and then throw a layout back at you.
 */
export default function TabLoading() {
  return (
    <div className={styles.cardGrid} aria-hidden="true">
      <div className={`${styles.card} ${styles.wide} ${styles.skeleton}`}>
        <span className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
        <span className={styles.skeletonLine} />
        <span className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
      </div>
      <div className={`${styles.card} ${styles.major} ${styles.skeleton}`}>
        <span className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
        <span className={styles.skeletonLine} />
      </div>
      <div className={`${styles.card} ${styles.minor} ${styles.skeleton}`}>
        <span className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
        <span className={styles.skeletonLine} />
      </div>
    </div>
  );
}
