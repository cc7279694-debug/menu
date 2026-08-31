"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { validateImageFile } from "@/features/media/image-validation";

export type CookingPhotoDraft = {
  photoId: string;
  file: File;
  previewUrl: string;
};

type CookingPhotoPickerProps = {
  photos: CookingPhotoDraft[];
  onChange(photos: CookingPhotoDraft[]): void;
  disabled?: boolean;
};

function revokePreview(url: string) {
  try { URL.revokeObjectURL(url); } catch { /* jsdom and older browsers may not expose object URLs. */ }
}

export function CookingPhotoPicker({ photos, onChange, disabled = false }: CookingPhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  const [error, setError] = useState<string | null>(null);
  photosRef.current = photos;

  useEffect(() => () => {
    for (const photo of photosRef.current) revokePreview(photo.previewUrl);
  }, []);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const selected = [...fileList];
    if (photos.length + selected.length > 3) {
      setError("每次最多上传 3 张成品照片");
    }
    const next = [...photos];
    for (const file of selected.slice(0, Math.max(0, 3 - photos.length))) {
      const validation = validateImageFile(file);
      if (!validation.ok) {
        setError(validation.message);
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      next.push({ photoId: crypto.randomUUID(), file, previewUrl });
    }
    onChange(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(photoId: string) {
    const target = photos.find((photo) => photo.photoId === photoId);
    if (target) revokePreview(target.previewUrl);
    onChange(photos.filter((photo) => photo.photoId !== photoId));
  }

  return (
    <section aria-labelledby="cooking-photo-picker-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium" id="cooking-photo-picker-title">成品照片（可选）</h3>
        <Button disabled={disabled || photos.length >= 3} onClick={() => inputRef.current?.click()} type="button" variant="outline">添加照片</Button>
      </div>
      <input
        aria-label="选择成品照片"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled || photos.length >= 3}
        multiple
        onChange={(event) => addFiles(event.target.files)}
        ref={inputRef}
        type="file"
      />
      {error ? <p aria-live="polite" className="text-sm text-destructive" role="alert">{error}</p> : null}
      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, index) => (
            <div className="space-y-1" key={photo.photoId}>
              <img alt={`成品照片预览 ${index + 1}`} className="aspect-square w-full rounded-lg border object-cover" height={160} src={photo.previewUrl} width={160} />
              <Button aria-label={`移除成品照片 ${index + 1}`} className="min-h-9 w-full" disabled={disabled} onClick={() => removePhoto(photo.photoId)} size="sm" type="button" variant="ghost">移除</Button>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted-foreground">添加一到三张成品照片，方便下次对比改进。</p>}
    </section>
  );
}
