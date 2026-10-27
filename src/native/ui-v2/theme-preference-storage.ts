import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { resolveV2Theme, type V2Theme } from "./appearance";

// Display enum only: no recipe data, credentials, image paths or Backup fields.
const cacheKey = "recipio.ui-v2.theme.v1";
const nativePath = "recipio-ui-v2-theme-v1.txt";

export function validTheme(value: unknown): V2Theme | null {
  return typeof value === "string" && resolveV2Theme(value) === value ? resolveV2Theme(value) : null;
}
export function usesNativeThemePreference(): boolean {
  return Capacitor.getPlatform() === "android";
}
export function readThemeCache(): V2Theme {
  try { return resolveV2Theme(typeof window === "undefined" ? null : window.localStorage.getItem(cacheKey)); }
  catch { return "warm-ivory"; }
}
export function writeThemeCache(theme: V2Theme): boolean {
  try { window.localStorage.setItem(cacheKey, theme); return true; }
  catch { return false; }
}
export async function readNativeThemePreference(): Promise<V2Theme | null> {
  try {
    const result = await Filesystem.readFile({ directory: Directory.Data, path: nativePath, encoding: Encoding.UTF8 });
    return validTheme(result.data) ?? "warm-ivory";
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "OS-PLUG-FILE-0008") return null;
    throw error;
  }
}
export async function writeNativeThemePreference(theme: V2Theme): Promise<void> {
  if (validTheme(theme) === null) throw new Error("Invalid display preference");
  await Filesystem.writeFile({ directory: Directory.Data, path: nativePath, data: theme, encoding: Encoding.UTF8 });
}
