import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  loadMealPlanWeekAction: vi.fn(),
  saveMealPlanEntryAction: vi.fn(),
  setMealPlanStatusAction: vi.fn(),
  deleteMealPlanEntryAction: vi.fn(),
  generateMealPlanShoppingListAction: vi.fn(),
}));

vi.mock("@/features/meal-plans/actions", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { MealPlanPage } from "@/features/meal-plans/components/meal-plan-page";

describe("MealPlanPage", () => {
  beforeEach(() => {
    actions.loadMealPlanWeekAction.mockResolvedValue({ ok: true, data: [] });
  });

  it("renders three daily slots and allows more than one dish in the same slot", async () => {
    actions.loadMealPlanWeekAction.mockResolvedValue({
      ok: true,
      data: [
        {
          id: "entry-a",
          recipeId: "recipe-a",
          recipeTitle: "番茄炒蛋",
          recipeBaseServings: 2,
          mealSlot: "dinner",
          plannedAt: new Date().toISOString(),
          targetServings: 2,
          status: "planned",
          note: null,
          preparations: [],
        },
        {
          id: "entry-b",
          recipeId: "recipe-b",
          recipeTitle: "青椒肉丝",
          recipeBaseServings: 2,
          mealSlot: "dinner",
          plannedAt: new Date().toISOString(),
          targetServings: 2,
          status: "planned",
          note: null,
          preparations: [],
        },
      ],
    });

    render(<MealPlanPage recipes={[
      { id: "recipe-a", title: "番茄炒蛋", coverUrl: null, baseServings: 2 },
      { id: "recipe-b", title: "青椒肉丝", coverUrl: null, baseServings: 2 },
    ]} />);

    expect(await screen.findByRole("heading", { name: "周菜单" })).toBeInTheDocument();
    expect(screen.getAllByText("早餐").length).toBeGreaterThan(0);
    expect(screen.getAllByText("午餐").length).toBeGreaterThan(0);
    expect(screen.getAllByText("晚餐").length).toBeGreaterThan(0);
    expect(await screen.findByText("番茄炒蛋")).toBeInTheDocument();
    expect(screen.getByText("青椒肉丝")).toBeInTheDocument();
  });

  it("opens an add form with the selected slot default time", async () => {
    const user = userEvent.setup();
    render(<MealPlanPage recipes={[
      { id: "recipe-a", title: "番茄炒蛋", coverUrl: null, baseServings: 2 },
    ]} />);

    const buttons = await screen.findAllByRole("button", { name: /添加晚餐/ });
    await user.click(buttons[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect((screen.getByLabelText("开做时间") as HTMLInputElement).value).toMatch(/T18:00$/);
  });
});
