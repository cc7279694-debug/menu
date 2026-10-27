import type { AiReviewDraft } from "../ai/contract";
import type { AiTemporaryImage } from "../ai/native-bridge";
import type { AiIntakeState } from "../ai/service";
import type { RecipeCandidate as FinderCandidate } from "../find-recipe/contract";
import type { FindState } from "../find-recipe/service";
import type { RecipeCandidate as ParserCandidate, VisiblePageText } from "../link-import/contract";
import type { LinkImportState } from "../link-import/service";

type SourceOwner = Readonly<{ identity: object; isCurrent: () => boolean }>;
export type IntakeSourceContext = SourceOwner & (
  | Readonly<{ kind: "ai-input"; text: string; images: readonly Readonly<AiTemporaryImage>[]; operationId: string }>
  | Readonly<{ kind: "web-parser" | "web-ai"; visible: Readonly<VisiblePageText>; selected: Readonly<ParserCandidate> | null }>
  | Readonly<{ kind: "finder"; selected: Readonly<Pick<FinderCandidate, "title" | "sourceHost" | "summary">> }>
);

const available = () => true;

/** Borrow the current owner's source; never copy it into an independently-lived cache. */
export function aiInputSource(snapshot: AiIntakeState, isCurrent: () => boolean = available): IntakeSourceContext | null {
  if (snapshot.phase !== "preview" || !snapshot.draft || !snapshot.operationId || !isCurrent()) return null;
  if (!snapshot.input.text.trim() && !snapshot.images.length) return null;
  return { kind: "ai-input", identity: snapshot.draft, isCurrent, text: snapshot.input.text, images: snapshot.images, operationId: snapshot.operationId };
}

export function webIntakeSource(snapshot: LinkImportState, selected: ParserCandidate | null, aiDraft?: AiReviewDraft | null, isCurrent: () => boolean = available): IntakeSourceContext | null {
  if (!snapshot.visible || !isCurrent()) return null;
  if (selected && (snapshot.selectedId !== selected.id || !snapshot.parsed?.candidates.includes(selected))) return null;
  if (aiDraft) {
    if (snapshot.phase !== "ai-preview") return null;
    return { kind: "web-ai", identity: aiDraft, isCurrent, visible: snapshot.visible, selected };
  }
  if (snapshot.phase !== "ready") return null;
  if (!snapshot.visible.text.trim() && !snapshot.visible.title.trim() && !selected) return null;
  return { kind: "web-parser", identity: selected ?? snapshot.visible, isCurrent, visible: snapshot.visible, selected };
}

export function finderIntakeSource(snapshot: FindState, aiDraft: AiReviewDraft | null, isCurrent: () => boolean = available): IntakeSourceContext | null {
  if (snapshot.phase !== "preview" || !aiDraft || !snapshot.selected || !isCurrent()) return null;
  return { kind: "finder", identity: aiDraft, isCurrent, selected: snapshot.selected };
}
