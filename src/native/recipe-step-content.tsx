import type { RecipeDetails } from "./recipe-model";
import { LocalImage } from "./local-image";
export function RecipeStepContent({
  recipe,
  stepIndex,
}: {
  recipe: RecipeDetails;
  stepIndex: number;
}) {
  const step = recipe.steps[stepIndex];
  if (!step) return null;
  return (
    <div className="min-w-0 space-y-3">
      <p className="whitespace-pre-wrap break-words leading-relaxed">
        {step.instruction}
      </p>
      {step.imagePath && (
        <LocalImage
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
            className="whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-base"
          >
            注意：{t.instruction}
          </p>
        ))}
    </div>
  );
}
