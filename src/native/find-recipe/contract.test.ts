import { expect, it } from "vitest";
import { candidateSchema, searchInputSchema, canonicalSourceUrl, safeFinderError } from "./contract";
it("counts Unicode code points and trims input before validation", () => {
  expect(searchInputSchema.parse({ dish: " 🍚 ", preference: " 清淡 " })).toEqual({ dish: "🍚", preference: "清淡" });
  expect(searchInputSchema.safeParse({ dish: "🍚".repeat(120), preference: "🍚".repeat(500) }).success).toBe(true);
  for (const dish of [" ", "🍚".repeat(121)]) expect(searchInputSchema.safeParse({ dish, preference: "" }).success).toBe(false);
  expect(searchInputSchema.safeParse({ dish: "鸭", preference: "🍚".repeat(501) }).success).toBe(false);
});
it("canonical equality preserves query and path while normalizing only scheme host ports fragment", () => {
  expect(canonicalSourceUrl("HTTPS://WWW.EXAMPLE.COM:443/recipe?q=duck#x")).toBe("https://www.example.com/recipe?q=duck");
  expect(canonicalSourceUrl("https://www.example.com/Recipe?q=duck")).not.toBe(canonicalSourceUrl("https://www.example.com/recipe?q=duck"));
  expect(canonicalSourceUrl("https://www.example.com/recipe?q=other")).not.toBe(canonicalSourceUrl("https://www.example.com/recipe?q=duck"));
  expect(canonicalSourceUrl("https://www.example.com/a/../b?q=%2F")).toBe("https://www.example.com/a/../b?q=%2F");
  expect(canonicalSourceUrl("https://www.example.com")).not.toBe(canonicalSourceUrl("https://www.example.com/"));
});
it("blocks nonpublic and credential-bearing candidate URLs", () => {
  for (const sourceUrl of ["http://localhost/r", "http://127.0.0.1/r", "http://198.18.0.1/r", "http://192.168.0.1/r", "https://u:p@example.com/r", "https://example.com:8443/r", "javascript:alert(1)"]) {
    expect(candidateSchema.safeParse({ id: "1", title: "鸭", sourceUrl, sourceHost: "example.com", summary: "来源简介", highlights: [], totalMinutes: null, preparationHint: "" }).success).toBe(false);
  }
});
it("does not expose raw provider exceptions or URL tokens", () => {
  expect(safeFinderError(new Error("private token url"))).toMatchObject({ code: "invalid_output" });
  expect(safeFinderError({ code: "source_mismatch", message: "private token url" }).message).not.toContain("private");
});
it("distinguishes a missing candidate handoff without exposing Provider text", () => {
  const error = safeFinderError({ code: "candidate_output_missing", message: "private provider text" });
  expect(error.code).toBe("candidate_output_missing");
  expect(error.message).not.toContain("private");
});
