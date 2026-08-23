import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RecipeEditor } from "@/features/recipes/components/recipe-editor";

const userId = "11111111-1111-4111-8111-111111111111";

describe("RecipeEditor", () => {
  it("starts with editable basics and lets the user add ingredients and steps", async () => {
    const user = userEvent.setup();
    render(
      <RecipeEditor
        mode="create"
        userId={userId}
        categories={[]}
        tags={[]}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "新建菜谱" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("食材名称")).toHaveLength(1);
    expect(screen.getAllByLabelText("步骤说明")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "添加食材" }));
    await user.click(screen.getByRole("button", { name: "添加步骤" }));

    expect(screen.getAllByLabelText("食材名称")).toHaveLength(2);
    expect(screen.getAllByLabelText("步骤说明")).toHaveLength(2);
  });

  it("keeps entered data when validation fails and calls save only with valid data", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const saveRecipe = vi.fn().mockResolvedValue({
      ok: true,
      data: { recipeId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    });
    render(
      <RecipeEditor
        mode="create"
        userId={userId}
        categories={[]}
        tags={[]}
        onSaved={onSaved}
        saveRecipe={saveRecipe}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "保存菜谱" })[0]);
    expect(await screen.findByText("请先填写菜谱名称")).toBeInTheDocument();
    expect(saveRecipe).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("菜名"), "番茄炒蛋");
    await user.type(screen.getAllByLabelText("食材名称")[0], "番茄");
    await user.type(screen.getAllByLabelText("步骤说明")[0], "切块。");
    await user.click(screen.getAllByRole("button", { name: "保存菜谱" })[0]);

    await waitFor(() => expect(saveRecipe).toHaveBeenCalledTimes(1));
    expect(saveRecipe.mock.calls[0][0]).toMatchObject({ title: "番茄炒蛋" });
    expect(onSaved).toHaveBeenCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
