"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import {
  getPortraitDisclosureState,
  getPortraitTransforms,
  togglePortraitExpanded,
} from "@/lib/interactions";
import { GestureIcon } from "./GestureIcon";
import type { MediaAsset } from "./MediaPlaceholder";

export function PortraitStack({
  portraits,
}: {
  portraits: readonly [MediaAsset, MediaAsset, MediaAsset] | readonly MediaAsset[];
}) {
  const reduce = Boolean(useReducedMotion());
  const [expanded, setExpanded] = useState(false);
  const [instant, setInstant] = useState(false);
  const pointerType = useRef<string>("");
  const expandedAtPointerDown = useRef(false);
  const effectiveExpanded = getPortraitDisclosureState(expanded, reduce);
  const transforms = getPortraitTransforms(expanded, reduce);

  return (
    <button
      aria-expanded={effectiveExpanded}
      aria-label={reduce ? "Matched attendee group" : "Show the matched attendee group"}
      className="portrait-stack-control disabled:cursor-default"
      disabled={reduce}
      onBlur={() => {
        setInstant(true);
        setExpanded(false);
      }}
      onClick={(event) => {
        if (!reduce && pointerType.current !== "mouse" && event.detail > 0) {
          setInstant(false);
          setExpanded(togglePortraitExpanded(expandedAtPointerDown.current));
        }
      }}
      onFocus={() => {
        setInstant(true);
        setExpanded(true);
      }}
      onPointerDown={(event) => {
        pointerType.current = event.pointerType;
        expandedAtPointerDown.current = expanded;
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          setInstant(false);
          setExpanded(true);
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          setInstant(false);
          setExpanded(false);
        }
      }}
      type="button"
    >
      <span className="portrait-stack-stage">
        {portraits.slice(0, 3).map((portrait, index) => (
          <motion.span
            animate={{ transform: transforms[index] }}
            className="portrait-stack-card"
            key={portrait.src}
            style={{ left: `${index * 188}px`, zIndex: index === 1 ? 3 : index + 1 }}
            transition={
              instant || reduce
                ? { duration: 0 }
                : { type: "spring", duration: 0.42, bounce: 0.1 }
            }
          >
            <Image
              alt={portrait.alt}
              className="h-full w-full object-cover"
              height={portrait.height}
              sizes="(max-width: 640px) 30vw, 180px"
              src={portrait.src}
              width={portrait.width}
            />
          </motion.span>
        ))}
      </span>
      <span aria-hidden="true" className="portrait-stack-gesture">
        <GestureIcon
          className={`portrait-stack-icon ${effectiveExpanded ? "is-hidden" : ""}`}
          gesture="point"
        />
        <GestureIcon
          className={`portrait-stack-icon ${effectiveExpanded ? "" : "is-hidden"}`}
          gesture="peace"
        />
      </span>
    </button>
  );
}
