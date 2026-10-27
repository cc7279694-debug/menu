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

export function aiInputSource(snapshot: AiIntakeState, isCurrent?: () => boolean): IntakeSourceContext | null {
  void snapshot; void isCurrent;
  return null;
}

export function webIntakeSource(snapshot: LinkImportState, selected: ParserCandidate | null, aiDraft?: AiReviewDraft | null, isCurrent?: () => boolean): IntakeSourceContext | null {
  void snapshot; void selected; void aiDraft; void isCurrent;
  return null;
}

export function finderIntakeSource(snapshot: FindState, aiDraft: AiReviewDraft | null, isCurrent?: () => boolean): IntakeSourceContext | null {
  void snapshot; void aiDraft; void isCurrent;
  return null;
}
