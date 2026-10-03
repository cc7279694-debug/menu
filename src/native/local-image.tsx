import { useEffect, useState } from "react";
import { resolveLocalImage } from "./media";
export function LocalImage({
  path,
  alt,
  className = "",
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let alive = true;
    let current = "";
    setUrl("");
    if (path)
      void resolveLocalImage(path)
        .then((value) => {
          current = value;
          if (alive) setUrl(value);
          else if (value.startsWith("blob:")) URL.revokeObjectURL(value);
        })
        .catch(() => {
          if (alive) setUrl("");
        });
    return () => {
      alive = false;
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
    };
  }, [path]);
  return url ? (
    <img src={url} alt={alt} className={className} onError={() => setUrl("")} />
  ) : (
    <div
      className={`${className} flex items-center justify-center bg-muted text-xs text-muted-foreground`}
      role="img"
      aria-label={alt}
    >
      {path ? "图片暂不可用" : "暂无图片"}
    </div>
  );
}
