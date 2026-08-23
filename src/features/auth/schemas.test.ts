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

  it("accepts exactly six digits for email OTP", () => {
    expect(otpSchema.parse("012345")).toBe("012345");
    expect(() => otpSchema.parse("12345")).toThrow();
    expect(() => otpSchema.parse("12345a")).toThrow();
  });

  it("rejects external redirect targets", () => {
    expect(nextPathSchema.parse("/recipes")).toBe("/recipes");
    expect(nextPathSchema.parse("https://evil.example")).toBe("/recipes");
    expect(nextPathSchema.parse("//evil.example")).toBe("/recipes");
  });
});
