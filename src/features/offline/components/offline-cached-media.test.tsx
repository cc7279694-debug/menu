import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getRecipeMedia = vi.hoisted(() => vi.fn());
vi.mock("@/features/offline/media-cache", () => ({ getRecipeMedia }));

import { OfflineCachedMedia } from "./offline-cached-media";

describe("OfflineCachedMedia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn().mockReturnValue("blob:cached-image"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("renders a cached image when the media blob exists", async () => {
    getRecipeMedia.mockResolvedValue({ blob: new Blob(["image"], { type: "image/webp" }) });

    render(<OfflineCachedMedia userId="user-a" recipeId="recipe-a" mediaId="cover" alt="番茄炒蛋封面" />);

    expect(await screen.findByRole("img", { name: "番茄炒蛋封面" })).toHaveAttribute("src", "blob:cached-image");
  });

  it("keeps an accessible placeholder when no cached image exists", async () => {
    getRecipeMedia.mockResolvedValue(null);

    render(<OfflineCachedMedia userId="user-a" recipeId="recipe-a" mediaId="cover" alt="番茄炒蛋封面" />);

    expect(await screen.findByLabelText("番茄炒蛋封面暂不可用")).toBeInTheDocument();
  });

  it("keeps an accessible placeholder when only the media reference exists", async () => {
    getRecipeMedia.mockResolvedValue({ blob: null, sourceKey: "recipe-media/cover.webp" });

    render(<OfflineCachedMedia userId="user-a" recipeId="recipe-a" mediaId="cover" alt="番茄炒蛋封面" />);

    expect(await screen.findByLabelText("番茄炒蛋封面暂不可用")).toBeInTheDocument();
  });
});
