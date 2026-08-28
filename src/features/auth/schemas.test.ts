import { describe, expect, it } from "vitest";

import { emailSchema, nextPathSchema } from "@/features/auth/schemas";

describe("authentication schemas", () => {
  it("normalizes a valid email", () => {
    expect(emailSchema.parse("  Cook@Example.com ")).toBe("cook@example.com");
  });

  it("rejects external redirect targets", () => {
    expect(nextPathSchema.parse("/recipes")).toBe("/recipes");
    expect(nextPathSchema.parse("https://evil.example")).toBe("/recipes");
    expect(nextPathSchema.parse("//evil.example")).toBe("/recipes");
  });
});
