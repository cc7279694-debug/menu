import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AppLoading from "./loading";

describe("authenticated app loading state", () => {
  it("announces that the next page is loading", () => {
    render(<AppLoading />);

    expect(screen.getByRole("status", { name: "页面加载中" })).toBeInTheDocument();
    expect(screen.getByText("正在加载…")).toBeInTheDocument();
  });
});
