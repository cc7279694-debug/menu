import { createContext, useContext, useMemo, type ReactNode } from "react";

export type V2Theme = "warm-ivory" | "pure-glass" | "soft-sage";
export const v2Themes = [
  { id: "warm-ivory", label: "米色 · Warm Ivory" },
  { id: "pure-glass", label: "白色 · Pure Glass" },
  { id: "soft-sage", label: "淡绿色 · Soft Sage" },
] as const;

export function resolveV2Theme(value?: string | null): V2Theme {
  return v2Themes.find((theme) => theme.id === value)?.id ?? "warm-ivory";
}

type Appearance = Readonly<{ theme: V2Theme; solid: boolean }>;
const AppearanceContext = createContext<Appearance>({ theme: "warm-ivory", solid: false });

/** Presentation-only context shared by core UI and showcase; never persistence. */
export function V2AppearanceProvider({ theme, solid, children }: Appearance & { children: ReactNode }) {
  const value = useMemo(() => ({ theme, solid }), [theme, solid]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useV2Appearance(): Appearance { return useContext(AppearanceContext); }

/** Opt-in attributes for existing portalled controls; no second theme state. */
export function useV2DialogAppearance(appearance?: "v2") {
  const { theme, solid } = useV2Appearance();
  return appearance === "v2" ? { className: "recipio-ui-v2 v2-themed-dialog", "data-v2-theme": theme, "data-v2-solid": solid } : undefined;
}
