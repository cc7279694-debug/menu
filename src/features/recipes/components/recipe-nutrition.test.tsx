import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { RecipeNutritionCard, RecipeNutritionEditor } from "@/features/recipes/components/recipe-nutrition";
import type { RecipeSaveInput } from "@/features/recipes/schemas";

function NutritionEditorHarness({ reason }: { reason?: string }) {
  const { control, formState: { errors }, register, setValue } = useForm<RecipeSaveInput>({
    defaultValues: { nutrition: null },
  });
  return (
    <RecipeNutritionEditor
      analysisDisabledReason={reason}
      control={control}
      errors={errors}
      register={register}
      setValue={setValue}
    />
  );
}

describe("RecipeNutritionCard", () => {
  it("shows only the supplied per-serving metrics and estimated marker", () => {
    render(
      <RecipeNutritionCard
        nutrition={{
          caloriesKcal: 420,
          proteinGrams: null,
          fatGrams: 18.5,
          carbsGrams: null,
          isEstimated: true,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "每份营养" })).toBeInTheDocument();
    expect(screen.getByText("420千卡")).toBeInTheDocument();
    expect(screen.getByText("18.5克")).toBeInTheDocument();
    expect(screen.getByText("AI 参考值")).toBeInTheDocument();
    expect(screen.queryByText("蛋白质")).not.toBeInTheDocument();
  });

  it("stays hidden when nutrition is unavailable", () => {
    const { container } = render(<RecipeNutritionCard nutrition={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps manual fields available while disabling offline AI analysis", () => {
    render(<NutritionEditorHarness reason="AI 营养分析需要联网；现有营养数据仍可手动修改。" />);

    expect(screen.getByRole("button", { name: "AI 营养分析" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("AI 营养分析需要联网");
    expect(screen.getByLabelText("热量（千卡）")).toBeEnabled();
  });
});
