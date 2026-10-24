import { useState } from "react";
import { resolveV2Theme, type V2Theme } from "./appearance";

// Display preference only. Never included in recipe storage or Backup v2.
const key = "recipio.ui-v2.theme.v1";
function readTheme(): V2Theme {
  try { return resolveV2Theme(typeof window === "undefined" ? null : window.localStorage.getItem(key)); }
  catch { return "warm-ivory"; }
}
export function useV2ThemePreference() {
  const [theme, setTheme] = useState(readTheme);
  function changeTheme(value: V2Theme) {
    const next = resolveV2Theme(value);
    setTheme(next);
    try { window.localStorage.setItem(key, next); }
    catch { /* A blocked/quota-limited preference store must not break local work. */ }
  }
  return { theme, changeTheme };
}
