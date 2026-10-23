import { useLayoutEffect, type RefObject } from "react";

/** Reserve the measured overlay height, including enlarged text and safe-area padding. */
export function useControlClearance(root: RefObject<HTMLElement | null>, control: RefObject<HTMLElement | null>, active = true) {
  useLayoutEffect(() => {
    const owner = root.current;
    const bar = control.current;
    if (!owner || !bar || !active || typeof ResizeObserver === "undefined") return;
    const measure = () => owner.style.setProperty("--v2-controls-height", `${Math.ceil(bar.getBoundingClientRect().height)}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => { observer.disconnect(); owner.style.removeProperty("--v2-controls-height"); };
  }, [root, control, active]);
}
