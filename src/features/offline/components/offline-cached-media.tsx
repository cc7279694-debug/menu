"use client";

import { useEffect, useState } from "react";

import { getRecipeMedia } from "@/features/offline/media-cache";

type OfflineCachedMediaProps = {
  userId: string;
  recipeId: string;
  mediaId: string;
  alt: string;
  fallbackLabel?: string;
  className?: string;
  fallbackClassName?: string;
};

export function OfflineCachedMedia({
  userId,
  recipeId,
  mediaId,
  alt,
  fallbackLabel,
  className,
  fallbackClassName,
}: OfflineCachedMediaProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    void getRecipeMedia(userId, recipeId, mediaId)
      .then((media) => {
        if (cancelled || !media?.blob || typeof URL.createObjectURL !== "function") return;
        createdUrl = URL.createObjectURL(media.blob);
        setObjectUrl(createdUrl);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (createdUrl && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(createdUrl);
    };
  }, [mediaId, recipeId, userId]);

  // Blob URLs are generated at runtime and cannot be optimized by next/image.
  if (objectUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt} className={className} decoding="async" src={objectUrl} />;
  }

  return (
    <div
      aria-label={fallbackLabel ?? `${alt}暂不可用`}
      className={fallbackClassName ?? className}
      role="img"
    >
      离线暂无图片
    </div>
  );
}
