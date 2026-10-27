import { useState, type ComponentProps, type ReactNode } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { BookOpen, Check, CircleHelp, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useV2Appearance } from "./appearance";

type ButtonVariant = "primary" | "secondary" | "text" | "icon" | "danger" | "select";
type V2ButtonProps = Omit<ComponentProps<typeof ButtonPrimitive>, "className"> & {
  variant?: ButtonVariant; busy?: boolean; className?: string;
};

/** Same Base UI button behavior as existing shadcn, with native-only V2 appearance. */
export function V2Button({ variant = "primary", busy = false, disabled, children, className, ...props }: V2ButtonProps) {
  return <ButtonPrimitive {...props} type={props.type ?? "button"} disabled={disabled || busy}
    aria-busy={busy || undefined} className={cn("v2-button", `v2-button--${variant}`, className)}>
    {busy ? <LoaderCircle className="v2-spinner" aria-hidden="true" /> : null}{children}
  </ButtonPrimitive>;
}

/** Positioned Dialog, not a custom focus trap or a second Back/IME state machine. */
export function V2Sheet({ open, onOpenChange, title, description, children, kind = "sheet", dark = false, initialFocus }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string;
  children: ReactNode; kind?: "sheet" | "dialog"; dark?: boolean;
  initialFocus?: ComponentProps<typeof DialogPrimitive.Popup>["initialFocus"];
}) {
  const { theme, solid } = useV2Appearance();
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal className="recipio-ui-v2 v2-portal" data-v2-theme={theme} data-v2-solid={solid} data-v2-dark={dark || undefined}>
      <DialogPrimitive.Backdrop className="v2-backdrop" />
      <DialogPrimitive.Popup initialFocus={initialFocus} className={cn("v2-sheet", kind === "dialog" && "v2-sheet--dialog")}>
        <header className="v2-sheet-header">
          <div><DialogPrimitive.Title className="v2-section-title">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="v2-secondary">{description}</DialogPrimitive.Description></div>
          <DialogPrimitive.Close render={<V2Button variant="icon" aria-label={`关闭${title}`} />}><X aria-hidden="true" /></DialogPrimitive.Close>
        </header>
        <div className="v2-sheet-body">{children}</div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}

export function StateBadge({ kind, children }: { kind: "explicit" | "inferred" | "missing"; children?: ReactNode }) {
  const Icon = kind === "explicit" ? Check : kind === "inferred" ? TriangleAlert : CircleHelp;
  return <span className={cn("v2-state-badge", `v2-state-badge--${kind}`)}>
    <Icon aria-hidden="true" />{children ?? ({ explicit: "来源明确", inferred: "AI 推断", missing: "缺失待确认" }[kind])}
  </span>;
}

export function V2Image({ src, alt, className, placeholder = "尚未添加图片", eager = false }: {
  src: string | null; alt: string; className?: string; placeholder?: string; eager?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!src || failedUrl === src) return <div className={cn("v2-image-placeholder", className)}>
    <BookOpen aria-hidden="true" /><span>{src ? "图片暂不可用" : placeholder}</span>
  </div>;
  return <img src={src} alt={alt} width="1000" height="750" loading={eager ? "eager" : "lazy"}
    decoding="async" onError={() => setFailedUrl(src)} className={className} />;
}

export function IngredientsList({ ingredients, renderAmount }: {
  ingredients: readonly { name: string; amount: string }[];
  renderAmount?: (ingredient: { name: string; amount: string }, index: number) => ReactNode;
}) {
  return ingredients.length ? <dl className="v2-ingredients">{ingredients.map((ingredient, i) =>
    <div key={i}><dt>{ingredient.name}</dt><dd>{renderAmount ? renderAmount(ingredient, i) : ingredient.amount || "用量未填写"}</dd></div>,
  )}</dl> : <p className="v2-secondary">还没有食材，可以随时补充。</p>;
}
