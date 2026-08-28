import { describe, expect, it } from "vitest";

import {
  emailSchema,
  nextPathSchema,
  otpSchema,
} from "@/features/auth/schemas";

describe("authentication schemas", () => {
  it("normalizes a valid email", () => {
    expect(emailSchema.parse("  Cook@Example.com ")).toBe("cook@example.com");
  });

  it("rejects external redirect targets", () => {
    expect(nextPathSchema.parse("/recipes")).toBe("/recipes");
    expect(nextPathSchema.parse("https://evil.example")).toBe("/recipes");
    expect(nextPathSchema.parse("//evil.example")).toBe("/recipes");
  });

  it("accepts exactly six digits", () => {
    expect(otpSchema.parse("123456")).toBe("123456");
    expect(() => otpSchema.parse("12345")).toThrow();
    expect(() => otpSchema.parse("12345a")).toThrow();
  });
});
