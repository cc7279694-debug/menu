import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import {
  getLocalDatabase,
  LOCAL_LIBRARY_MEDIA_OWNER,
} from "@/features/offline/local-db";
import { localImagePath } from "./recipe-model";

const scope = LOCAL_LIBRARY_MEDIA_OWNER;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
interface LocalImagePickerPlugin {
  pickImage(): Promise<{ cancelled?: boolean; path?: string }>;
}
let nativePicker: LocalImagePickerPlugin | undefined;
export function usesNativeImagePicker(): boolean {
  return Capacitor.getPlatform() === "android";
}
/** Android copies the selected URI before returning; no WebView FileReader required. */
export async function pickLocalImage(): Promise<string | null> {
  if (!usesNativeImagePicker()) throw new Error("本地系统选图仅适用于 Android");
  nativePicker ??= registerPlugin<LocalImagePickerPlugin>("LocalImagePicker");
  const result = await nativePicker.pickImage();
  return result.cancelled === true ? null : localImagePath.parse(result.path);
}
export async function saveLocalImage(file: File): Promise<string> {
  const extension = extensions[file.type];
  if (!extension || !file.size)
    throw new Error("请选择有效的 JPG、PNG、WebP 或 AVIF 图片");
  const path = `images/${crypto.randomUUID()}.${extension}`;
  if (Capacitor.getPlatform() === "android") {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.readAsDataURL(file);
    });
    await Filesystem.writeFile({
      directory: Directory.Data,
      path,
      data,
      recursive: true,
    });
  } else {
    await (
      await getLocalDatabase()
    ).media.put({
      userId: scope,
      recipeId: "library",
      mediaId: path,
      sourceKey: path,
      mimeType: file.type,
      byteSize: file.size,
      cachedAt: new Date().toISOString(),
      blob: file,
    });
  }
  return path;
}
/** URL is for this renderer only; callers revoke browser Blob URLs on unmount. */
export async function resolveLocalImage(path: string): Promise<string> {
  localImagePath.parse(path);
  if (Capacitor.getPlatform() === "android") {
    const { uri } = await Filesystem.getUri({
      directory: Directory.Data,
      path,
    });
    return Capacitor.convertFileSrc(uri);
  }
  const record = await (
    await getLocalDatabase()
  ).media.get([scope, "library", path]);
  if (!record?.blob) throw new Error("本地图片不存在");
  return URL.createObjectURL(record.blob);
}
