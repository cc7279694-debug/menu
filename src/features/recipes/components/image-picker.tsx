"use client";

import { useEffect, useState } from "react";

type ImagePickerProps = {
  label: string;
  value?: File | null;
  previewUrl?: string | null;
  onChange: (file: File | null) => void;
};

export function ImagePicker({ label, value, previewUrl, onChange }: ImagePickerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setObjectUrl(null);
      return;
    }
    const nextUrl = URL.createObjectURL(value);
    setObjectUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [value]);

  const imageUrl = objectUrl ?? previewUrl ?? null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={`image-${label}`}>
        {label}
      </label>
      {imageUrl ? (
        <img
          alt={`${label}预览`}
          className="aspect-video w-full max-w-md rounded-xl border object-cover"
          src={imageUrl}
        />
      ) : (
        <div className="flex aspect-video max-w-md items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
          尚未选择图片
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          accept="image/jpeg,image/png,image/webp"
          className="block max-w-full text-sm"
          id={`image-${label}`}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          type="file"
        />
        {(value || previewUrl) && (
          <button className="text-sm text-muted-foreground underline" onClick={() => onChange(null)} type="button">
            移除图片
          </button>
        )}
      </div>
    </div>
  );
}
