import Image from "next/image";
import { isPending, type Asset as AssetValue } from "@/content";

/**
 * One image slot, which may not have an image yet.
 *
 * The design calls for photography we have not shot (Kami, the four cities,
 * two more attendee portraits). Pointing `next/image` at a path that does not
 * exist fails the build, and shipping an unrelated photo to fill the hole is
 * worse than an obvious gap — so a pending slot renders a stand-in that names
 * what belongs there. Swapping one in later is a content.ts edit and nothing
 * else.
 */
export function Asset({
  asset,
  sizes,
  priority = false,
  className = "",
}: {
  asset: AssetValue;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (isPending(asset)) {
    return (
      <div
        aria-hidden="true"
        className={`kami-pending ${className}`.trim()}
        data-pending="true"
      >
        <span>{asset.label}</span>
      </div>
    );
  }

  if (asset.type === "video") {
    return (
      <video
        aria-label={asset.alt || undefined}
        autoPlay
        className={className}
        height={asset.height}
        loop
        muted
        playsInline
        preload={priority ? "auto" : "metadata"}
        width={asset.width}
      >
        <source src={asset.src} />
      </video>
    );
  }

  return (
    <Image
      alt={asset.alt}
      className={className}
      height={asset.height}
      priority={priority}
      sizes={sizes}
      src={asset.src}
      width={asset.width}
    />
  );
}
