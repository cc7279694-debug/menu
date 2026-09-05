import { act, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "fake-indexeddb/auto";
import { __resetOfflineDatabaseForTests } from "@/features/offline/database";
import { createCookingSession } from "@/features/cooking/session-storage";
import { getCookingSession, putCookingSession } from "@/features/cooking/cooking-session-repository";
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
  preparationCount: 0,
  maxLeadTimeMinutes: null,
  personalNotes: null,
  ingredients: [],
  steps: [{ id: "step-1", instruction: "炒熟", imagePath: null, imageUrl: null, timerSeconds: null, sortOrder: 1, ingredientLinks: [] }],
  preparations: [],
};

const USER_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(async () => {
  await __resetOfflineDatabaseForTests();
  localStorage.clear();
});

describe("CookingEntry", () => {
  it("uses the recipe base servings by default and links to the normal cooking start", () => {
    render(<CookingEntry recipe={recipe} />);

    expect(screen.getByLabelText("目标份数")).toHaveValue(2);
    expect(screen.getByRole("link", { name: "开始烹饪" })).toHaveAttribute(
      "href",
      "/recipes/recipe-1/cook?servings=2",
    );
  });

  it("calls out advance preparations before starting", () => {
    render(<CookingEntry recipe={{ ...recipe, preparations: [{ id: "prep-1", recipeIngredientId: null, ingredientName: null, instruction: "腌制", leadTimeMinutes: 30, timingText: null, sortOrder: 1 }], preparationCount: 1, maxLeadTimeMinutes: 30 }} />);
    expect(screen.getByText("这道菜有 1 项提前准备，请先确认。")).toBeInTheDocument();
  });

  it.each(["0.24", "1000.01", "2.345"])('shows inline validation for "%s"', async (value) => {
    const user = userEvent.setup();
    render(<CookingEntry recipe={recipe} />);

    await user.clear(screen.getByLabelText("目标份数"));
    await user.type(screen.getByLabelText("目标份数"), value);

    expect(screen.getByText("请输入 0.25 到 1000 之间且最多两位小数的份数。")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "开始烹饪" })).not.toBeInTheDocument();
  });

  it("shows resume and restart links for a valid saved session", async () => {
    await putCookingSession(USER_ID, createCookingSession(recipe, 4, 1_000));

    render(<CookingEntry recipe={recipe} userId={USER_ID} />);

    await waitFor(() => expect(screen.getByLabelText("目标份数")).toHaveValue(4));
    expect(screen.getByRole("link", { name: "继续上次烹饪" })).toHaveAttribute(
      "href",
      "/recipes/recipe-1/cook?servings=4",
    );
    expect(screen.getByRole("link", { name: "重新开始" })).toHaveAttribute(
      "href",
      "/recipes/recipe-1/cook?servings=4&restart=1",
    );
  });

  it("preserves the session when resuming and clears it before restarting", async () => {
    const user = userEvent.setup();
    const session = createCookingSession(recipe, 4, 1_000);
    await putCookingSession(USER_ID, session);
    render(<CookingEntry recipe={recipe} userId={USER_ID} />);

    await user.click(await screen.findByRole("link", { name: "继续上次烹饪" }));
    expect(await getCookingSession(USER_ID, recipe)).not.toBeNull();

    await user.click(screen.getByRole("link", { name: "重新开始" }));
    await waitFor(async () => expect(await getCookingSession(USER_ID, recipe)).toBeNull());
  });

  it("keeps server markup storage-free and restores a saved session after hydration", async () => {
    await putCookingSession(USER_ID, createCookingSession(recipe, 4, 1_000));
    const getItem = vi.spyOn(localStorage, "getItem");
    const setItem = vi.spyOn(localStorage, "setItem");
    const container = document.createElement("div");
    document.body.append(container);

    container.innerHTML = renderToString(<CookingEntry recipe={recipe} userId={USER_ID} />);

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(container.querySelector("input")).toHaveValue(2);

    const onRecoverableError = vi.fn();
    const root = hydrateRoot(container, <CookingEntry recipe={recipe} userId={USER_ID} />, { onRecoverableError });
    await waitFor(() => expect(container.querySelector("input")).toHaveValue(4));
    expect(container.querySelector("a")).toHaveTextContent("继续上次烹饪");
    expect(onRecoverableError).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    container.remove();
  });
});
