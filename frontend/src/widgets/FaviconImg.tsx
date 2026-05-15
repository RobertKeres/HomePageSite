import { useState } from "react";

/** Tries each URL until one loads (handles blocked third-party favicon CDNs). */
export function FaviconImg({
  urls,
  alt = "",
  className,
}: {
  urls: string[];
  alt?: string;
  className?: string;
}) {
  const clean = urls.filter(Boolean);
  const [idx, setIdx] = useState(0);

  if (clean.length === 0) return null;

  const src = clean[Math.min(idx, clean.length - 1)];

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setIdx((i) => (i < clean.length - 1 ? i + 1 : i));
      }}
    />
  );
}
