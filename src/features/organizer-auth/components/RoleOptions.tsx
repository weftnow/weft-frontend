"use client";

import { useRef, type KeyboardEvent } from "react";
import type { OrganizerAuthMessages } from "../i18n/organizerAuth.messages";
import { ORGANIZER_ROLES, type OrganizerRole } from "../types/organizerAuth.types";
import styles from "./OrganizerAuth.module.css";

type RoleLabels = OrganizerAuthMessages["roles"];

export function RoleOptions({
  labels,
  selected,
  onChange,
}: {
  labels: RoleLabels;
  selected: OrganizerRole | null;
  onChange: (role: OrganizerRole) => void;
}) {
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const keyOffsets: Record<string, number> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
    };
    let nextIndex = index;
    if (event.key in keyOffsets) {
      nextIndex = (index + keyOffsets[event.key] + ORGANIZER_ROLES.length)
        % ORGANIZER_ROLES.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = ORGANIZER_ROLES.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onChange(ORGANIZER_ROLES[nextIndex]);
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={styles.roleGrid} role="radiogroup">
      {ORGANIZER_ROLES.map((role, index) => (
        <button
          aria-checked={selected === role}
          className={styles.roleOption}
          data-auth-autofocus={
            selected === role || (selected === null && index === 0)
              ? "true"
              : undefined
          }
          key={role}
          onClick={() => onChange(role)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          ref={(element) => { optionRefs.current[index] = element; }}
          role="radio"
          tabIndex={selected === role || (selected === null && index === 0) ? 0 : -1}
          type="button"
        >
          {labels[role]}
        </button>
      ))}
    </div>
  );
}
