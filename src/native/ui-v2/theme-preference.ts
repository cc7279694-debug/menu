import { useCallback, useEffect, useRef, useState } from "react";
import type { V2Theme } from "./appearance";
import { readNativeThemePreference, readThemeCache, usesNativeThemePreference, validTheme,
  writeNativeThemePreference, writeThemeCache } from "./theme-preference-storage";

// Display preference only. Never included in recipe storage or Backup v2.
export function useV2ThemePreference() {
  const [native] = useState(usesNativeThemePreference);
  const [theme, setTheme] = useState(readThemeCache);
  const [warning, setWarning] = useState<string>();
  const mounted = useRef(true), selection = useRef(0), writes = useRef<Promise<void>>(Promise.resolve());
  const lastSaved = useRef(theme), initialRead = useRef<Promise<void> | null>(null);
  const initializeNative = useCallback(() => {
    if (initialRead.current) return initialRead.current;
    initialRead.current = readNativeThemePreference().then(value => {
      if (value !== null) lastSaved.current = value;
      if (mounted.current && selection.current === 0 && value !== null) {
        setTheme(value); writeThemeCache(value);
      }
    }, () => {
      if (mounted.current && selection.current === 0) setWarning("已保存的外观暂时无法读取，当前仍可正常使用。");
    });
    return initialRead.current;
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (native) void initializeNative();
    return () => { mounted.current = false; };
  }, [native, initializeNative]);
  function changeTheme(value: V2Theme) {
    const next = validTheme(value);
    if (next === null || !mounted.current) return;
    const choice = ++selection.current;
    if (!native) {
      setTheme(next);
      setWarning(writeThemeCache(next) ? undefined : "外观未能保存，重启后可能恢复原主题。");
      return;
    }
    // Only a completed Native write confirms the displayed theme. A later choice
    // owns the eventual UI update; earlier writes remain ordered, never concurrent.
    const previous = writes.current;
    const write = initializeNative().then(() => previous).then(() => writeNativeThemePreference(next));
    writes.current = write.catch(() => {});
    void write.then(() => {
      lastSaved.current = next;
      if (mounted.current && choice === selection.current) {
        setTheme(next); writeThemeCache(next); setWarning(undefined);
      }
    }, () => {
      if (mounted.current && choice === selection.current) {
        setTheme(lastSaved.current); writeThemeCache(lastSaved.current);
        setWarning("本次外观未能保存，已保留上次确认的主题。");
      }
    });
  }
  return { theme, changeTheme, warning };
}
