import { useLayoutEffect, type ComponentProps } from "react";
import { V2Sheet } from "./components";

/** Existing modal owns focus; only its open state consumes the native page Back. */
export function NativeV2Sheet(props: ComponentProps<typeof V2Sheet>) {
  const { open, onOpenChange } = props;
  useLayoutEffect(() => {
    if (!open) return;
    const back = (event: Event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      onOpenChange(false);
    };
    window.addEventListener("recipio:back", back, true);
    return () => window.removeEventListener("recipio:back", back, true);
  }, [open, onOpenChange]);
  return <V2Sheet {...props} />;
}
