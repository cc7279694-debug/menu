import type { RecipeDetails } from "./recipe-model";
import { LocalImage } from "./local-image";

/** The same saved preparation text/time is read in detail and kitchen reference. */
export function RecipePreparations({ preparations }: { preparations: RecipeDetails["preparations"] }) {
  return <ol className="v2-preparation-list">
    {preparations.map((preparation, index) => <li key={index}>
      <span aria-hidden="true">{index + 1}</span><div>
        <p>{preparation.instruction}</p><p className="v2-secondary">
          {preparation.minutes !== null ? `约 ${preparation.minutes} 分钟` : ""}
          {preparation.timingText ? `${preparation.minutes !== null ? " · " : ""}${preparation.timingText}` : ""}
          {preparation.minutes === null && !preparation.timingText ? "时间未记录" : ""}
        </p>
      </div>
    </li>)}
  </ol>;
}

export function RecipeStepContent({
  recipe,
  stepIndex,
  onImage,
  cooking = false,
}: {
  recipe: RecipeDetails;
  stepIndex: number;
  onImage?: (path: string, title: string) => void;
  cooking?: boolean;
}) {
  const step = recipe.steps[stepIndex];
  if (!step) return null;
  return (
    <div className="v2-reading-step min-w-0 space-y-3">
      <p className={cooking ? "v2-cook-instruction" : "v2-step-instruction whitespace-pre-wrap break-words leading-relaxed"}>
        {step.instruction}
      </p>
      {step.imagePath && (
        onImage ? <button className={`v2-step-image-button${cooking ? " v2-cook-image-button" : ""}`} aria-label={`查看步骤 ${stepIndex + 1} 大图`}
          onClick={() => onImage(step.imagePath!, `步骤 ${stepIndex + 1} 图片`)}>
        <LocalImage
          path={step.imagePath}
          alt={`步骤 ${stepIndex + 1} 参考图`}
          className={cooking ? "v2-cook-image" : "v2-step-image"}
        /></button> : <LocalImage
          path={step.imagePath}
          alt={`步骤 ${stepIndex + 1} 参考图`}
          className="max-h-72 w-full rounded-xl object-cover"
        />
      )}
      {recipe.keyTips
        .filter((t) => t.stepNumber === stepIndex + 1)
        .map((t, i) => (
          <p
            key={i}
            className={cooking ? "v2-cook-tip" : "whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-base"}
          >
            注意：{t.instruction}
          </p>
        ))}
    </div>
  );
}
