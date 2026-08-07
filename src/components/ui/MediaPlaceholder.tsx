import Image from "next/image";

export type MediaAsset = {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly placeholder: boolean;
  readonly type?: "image" | "video";
};

export function MediaPlaceholder({
  media,
  className = "",
  loading,
  sizes,
  priority = false,
  controls = false,
}: {
  media: MediaAsset;
  className?: string;
  loading?: "eager" | "lazy";
  sizes: string;
  priority?: boolean;
  controls?: boolean;
}) {
  return (
    <figure className={`media-placeholder ${className}`.trim()}>
      {media.type === "video" ? (
        <video
          aria-label={media.alt}
          autoPlay={!controls}
          className="h-full w-full object-cover"
          controls={controls}
          height={media.height}
          loop={!controls}
          muted={!controls}
          playsInline
          preload={loading === "eager" ? "auto" : "metadata"}
          width={media.width}
        >
          <source src={media.src} />
        </video>
      ) : (
        <Image
          alt={media.alt}
          className="h-full w-full object-cover"
          height={media.height}
          loading={loading}
          priority={priority}
          sizes={sizes}
          src={media.src}
          width={media.width}
        />
      )}
    </figure>
  );
}
