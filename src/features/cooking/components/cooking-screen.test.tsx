import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RecipeDetail } from "@/features/recipes/types";
import { cookingSessionKey, createCookingSession } from "@/features/cooking/session-storage";

import { CookingScreen } from "./cooking-screen";

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalNotification = Object.getOwnPropertyDescriptor(globalThis, "Notification");
const originalWakeLock = Object.getOwnPropertyDescriptor(navigator, "wakeLock");

function restoreProperty(target: object, key: PropertyKey, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
  } else {
    Reflect.deleteProperty(target, key);
  }
}

function supportedWakeLock() {
  return {
    request: vi.fn().mockResolvedValue({
      released: false,
      release: vi.fn(async () => undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  };
}

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: ComponentProps<"a">) => <a {...props} href={href}>{children}</a>,
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
  ingredients: [
    { id: "tomato", name: "番茄", quantity: 1, quantityText: null, unit: "个", preparationNote: "切块", sortOrder: 1 },
    { id: "salt", name: "盐", quantity: null, quantityText: null, unit: null, preparationNote: null, sortOrder: 2 },
  ],
  steps: [
    {
      id: "step-1",
      instruction: "先切番茄",
      imagePath: null,
      imageUrl: null,
      timerSeconds: 60,
      sortOrder: 1,
      ingredientLinks: [{ recipeIngredientId: "tomato", quantityOverride: null, quantityTextOverride: null, note: "备用" }],
    },
    { id: "step-2", instruction: "下锅翻炒", imagePath: null, imageUrl: null, timerSeconds: 30, sortOrder: 2, ingredientLinks: [] },
    { id: "step-3", instruction: "装盘享用", imagePath: null, imageUrl: null, timerSeconds: null, sortOrder: 3, ingredientLinks: [] },
  ],
};

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, "wakeLock", { configurable: true, value: supportedWakeLock() });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: Object.assign(vi.fn(), { permission: "granted" }),
  });
});

afterEach(() => {
  vi.useRealTimers();
  restoreProperty(globalThis, "localStorage", originalLocalStorage);
  restoreProperty(globalThis, "Notification", originalNotification);
  restoreProperty(navigator, "wakeLock", originalWakeLock);
});

describe("CookingScreen", () => {
  it("keeps server markup storage-free and restores the saved step after hydration", async () => {
    const saved = createCookingSession(recipe, 2, 1_000);
    saved.currentStepId = "step-2";
    localStorage.setItem(cookingSessionKey(recipe.id), JSON.stringify(saved));
    const getItem = vi.spyOn(localStorage, "getItem");
    const setItem = vi.spyOn(localStorage, "setItem");
    const container = document.createElement("div");
    document.body.append(container);

    container.innerHTML = renderToString(<CookingScreen recipe={recipe} requestedServings={2} restart={false} />);

    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(container).toHaveTextContent("先切番茄");

    const onRecoverableError = vi.fn();
    const root = hydrateRoot(
      container,
      <CookingScreen recipe={recipe} requestedServings={2} restart={false} />,
      { onRecoverableError },
    );
    await waitFor(() => expect(container).toHaveTextContent("下锅翻炒"));
    expect(onRecoverableError).not.toHaveBeenCalled();

    await act(async () => root.unmount());
    container.remove();
  });

  it("renders only the current first step, scaled linked ingredients, and accessible progress", () => {
    render(<CookingScreen recipe={recipe} requestedServings={4} restart={false} />);

    expect(screen.getByRole("heading", { name: "番茄炒蛋" })).toBeInTheDocument();
    expect(screen.getByText("第 1 / 3 步")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
    expect(screen.getByText("先切番茄")).toBeInTheDocument();
    expect(screen.queryByText("下锅翻炒")).not.toBeInTheDocument();
    expect(screen.getByText("番茄")).toBeInTheDocument();
    expect(screen.getByText("预处理：切块")).toBeInTheDocument();
    expect(screen.getByText("本步备注：备用")).toBeInTheDocument();
    expect(screen.getByText("2 个")).toBeInTheDocument();
    expect(screen.queryByText("盐")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /查看步骤 .* 图片/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上一步" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "下一步" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "开始本步计时（01:00）" })).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "上一步" })).toHaveClass("min-h-11");
    expect(screen.getByRole("button", { name: "下一步" })).toHaveClass("min-h-11");
    expect(screen.getByRole("navigation", { name: "烹饪步骤" })).toHaveClass(
      "bottom-[calc(3.5rem+env(safe-area-inset-bottom))]",
    );
  });

  it("enlarges the current step image in an accessible dialog", async () => {
    const user = userEvent.setup();
    const recipeWithImage = {
      ...recipe,
      steps: recipe.steps.map((step, index) => index === 0 ? { ...step, imageUrl: "https://example.test/step-1.jpg" } : step),
    };

    render(<CookingScreen recipe={recipeWithImage} requestedServings={2} restart={false} />);
    expect(screen.getByRole("button", { name: "查看步骤 1 图片" })).toHaveClass("min-h-11");
    expect(screen.getByRole("img", { name: "步骤 1 图片，点击查看大图" })).toHaveAttribute("loading", "lazy");
    expect(screen.getByRole("img", { name: "步骤 1 图片，点击查看大图" })).toHaveAttribute("decoding", "async");
    await user.click(screen.getByRole("button", { name: "查看步骤 1 图片" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "番茄炒蛋，第 1 步图片" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭步骤图片" })).toHaveClass("min-h-11");
    await user.click(screen.getByRole("button", { name: "关闭步骤图片" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps parallel timers visible across steps and dismisses only the completed timer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-23T12:00:00.000Z"));
    render(<CookingScreen recipe={recipe} requestedServings={2} restart={false} />);

    fireEvent.click(screen.getByRole("button", { name: "开始本步计时（01:00）" }));
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    fireEvent.click(screen.getByRole("button", { name: "开始本步计时（00:30）" }));

    expect(screen.getByRole("listitem", { name: /第 1 步.*01:00/ })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /第 2 步.*00:30/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消第 1 步计时" })).toHaveClass("min-h-11");

    act(() => { vi.advanceTimersByTime(61_000); });
    expect(screen.getByRole("listitem", { name: /第 1 步.*已完成/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭第 1 步计时" }));
    expect(screen.queryByRole("listitem", { name: /第 1 步/ })).not.toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /第 2 步/ })).toBeInTheDocument();
  });

  it("clears the cooking session and offers recipe links after completing the last step", () => {
    render(<CookingScreen recipe={recipe} requestedServings={2} restart={false} />);
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect(localStorage.getItem(cookingSessionKey(recipe.id))).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "完成烹饪" }));

    expect(localStorage.getItem(cookingSessionKey(recipe.id))).toBeNull();
    expect(screen.getByText("烹饪完成")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看菜谱" })).toHaveAttribute("href", "/recipes/recipe-1");
    expect(screen.getByRole("link", { name: "编辑菜谱" })).toHaveAttribute("href", "/recipes/recipe-1/edit");
    expect(screen.getByRole("link", { name: "查看菜谱" })).toHaveClass("min-h-11");
    expect(screen.getByRole("link", { name: "编辑菜谱" })).toHaveClass("min-h-11");
  });

  it("keeps step navigation available with a non-blocking warning when Wake Lock is unsupported", async () => {
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: undefined });
    render(<CookingScreen recipe={recipe} requestedServings={2} restart={false} />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("此浏览器不支持屏幕常亮。"));
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect(screen.getByText("下锅翻炒")).toBeInTheDocument();
  });

  it("keeps step navigation available with a non-blocking warning when notifications are unsupported", () => {
    Object.defineProperty(globalThis, "Notification", { configurable: true, value: undefined });
    render(<CookingScreen recipe={recipe} requestedServings={2} restart={false} />);

    expect(screen.getByRole("status")).toHaveTextContent("此浏览器不支持计时完成通知。");
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect(screen.getByText("下锅翻炒")).toBeInTheDocument();
  });

  it("shows denied notification status without prompting until a timer is started", () => {
    const requestPermission = vi.fn();
    Object.defineProperty(globalThis, "Notification", {
      configurable: true,
      value: Object.assign(vi.fn(), { permission: "denied", requestPermission }),
    });
    render(<CookingScreen recipe={recipe} requestedServings={2} restart={false} />);

    expect(screen.getByRole("status")).toHaveTextContent("计时完成通知未获授权，页面内计时仍会继续。");
    expect(requestPermission).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect(screen.getByText("下锅翻炒")).toBeInTheDocument();
  });

  it("keeps step navigation available with a non-blocking warning when local storage throws", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new Error("blocked"); },
    });
    render(<CookingScreen recipe={recipe} requestedServings={2} restart={false} />);

    expect(screen.getByRole("status")).toHaveTextContent("无法保存烹饪进度，本次烹饪仍可继续。");
    fireEvent.click(screen.getByRole("button", { name: "下一步" }));
    expect(screen.getByText("下锅翻炒")).toBeInTheDocument();
  });
});
