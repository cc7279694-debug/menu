import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createCookingSession, saveCookingSession } from "@/features/cooking/session-storage";
import type { RecipeDetail } from "@/features/recipes/types";

import { CookingEntry } from "./cooking-entry";

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, ...props }: ComponentProps<"a">) => (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

const recipe: RecipeDetail = {
  id: "recipe-1",
  updatedAt: "2026-08-23T12:00:00.000Z",
  title: "番茄炒蛋",
  description: null,
  coverUrl: null,
  coverPath: null,
  baseServings: 2,
  prepMinutes: null,
  cookMinutes: null,
  isFavorite: false,
  category: null,
  tags: [],
  personalNotes: null,
  ingredients: [],
  steps: [{ id: "step-1", instruction: "炒熟", imagePath: null, imageUrl: null, timerSeconds: null, sortOrder: 1, ingredientLinks: [] }],
};

beforeEach(() => localStorage.clear());

describe("CookingEntry", () => {
  it("uses the recipe base servings by default and links to the normal cooking start", () => {
    render(<CookingEntry recipe={recipe} />);

    expect(screen.getByLabelText("目标份数")).toHaveValue(2);
    expect(screen.getByRole("link", { name: "开始烹饪" })).toHaveAttribute(
      "href",
      "/recipes/recipe-1/cook?servings=2",
    );
  });

  it.each(["0.24", "1000.01", "2.345"])('shows inline validation for "%s"', async (value) => {
    const user = userEvent.setup();
    render(<CookingEntry recipe={recipe} />);

    await user.clear(screen.getByLabelText("目标份数"));
    await user.type(screen.getByLabelText("目标份数"), value);

    expect(screen.getByText("请输入 0.25 到 1000 之间且最多两位小数的份数。")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "开始烹饪" })).not.toBeInTheDocument();
  });

  it("shows resume and restart links for a valid saved session", () => {
    saveCookingSession(localStorage, createCookingSession(recipe, 4, 1_000));

    render(<CookingEntry recipe={recipe} />);

    expect(screen.getByLabelText("目标份数")).toHaveValue(4);
    expect(screen.getByRole("link", { name: "继续上次烹饪" })).toHaveAttribute(
      "href",
      "/recipes/recipe-1/cook?servings=4",
    );
    expect(screen.getByRole("link", { name: "重新开始" })).toHaveAttribute(
      "href",
      "/recipes/recipe-1/cook?servings=4&restart=1",
    );
  });

  it("preserves storage when resuming and clears it before restarting", async () => {
    const user = userEvent.setup();
    const session = createCookingSession(recipe, 4, 1_000);
    saveCookingSession(localStorage, session);
    render(<CookingEntry recipe={recipe} />);

    await user.click(screen.getByRole("link", { name: "继续上次烹饪" }));
    expect(localStorage.getItem("food-sequence:cooking:v1:recipe-1")).toBe(JSON.stringify(session));

    await user.click(screen.getByRole("link", { name: "重新开始" }));
    expect(localStorage.getItem("food-sequence:cooking:v1:recipe-1")).toBeNull();
  });
});
