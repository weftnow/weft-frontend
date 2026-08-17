import styles from "./Dashboard.module.css";

export type Stat = {
  /** Rendered at full size. Pass a string when the figure carries a unit. */
  value: string | number;
  /** The denominator, set small beside the value: "61 / 64", "4.6 / 5". */
  of?: string | number;
  label: string;
};

/**
 * The counts a card is actually about.
 *
 * Tiles rather than bare figures because two or three numbers in a row need
 * edges to be countable at a glance, and `auto-fit` in the stylesheet means the
 * same component carries two of them or four without a variant.
 *
 * `lead` marks the one card per tab that carries the ember. Giving every tile
 * on the page the accent flattens the tab back into an undifferentiated wall of
 * orange, so this is deliberately something a caller has to ask for.
 */
export function StatTiles({ stats, lead = false }: { stats: Stat[]; lead?: boolean }) {
  return (
    <ul className={styles.tiles}>
      {stats.map((stat) => (
        <li className={`${styles.tile} ${lead ? styles.tileLead : ""}`} key={stat.label}>
          <span className={styles.tileValue}>
            {stat.value}
            {stat.of === undefined ? null : <small> / {stat.of}</small>}
          </span>
          <span className={styles.tileLabel}>{stat.label}</span>
        </li>
      ))}
    </ul>
  );
}
