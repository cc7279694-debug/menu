import { describe, expect, it } from "vitest";
import { requiresAiReview, type AiFieldCheck } from "../ai/contract";
import { emptyDetails, type RecipeDetailsInput } from "../recipe-model";
import { createFieldBindings, insertFieldBinding, moveFieldBinding, removeFieldBinding } from "./field-bindings";
import { buildIntakeQualityReport, type IntakeQualityInput } from "./quality";

const check = (path: string, status: AiFieldCheck["status"], label = path): AiFieldCheck => ({ path, status, label, message: null });
function input(recipe: RecipeDetailsInput, extra: Partial<IntakeQualityInput> = {}): IntakeQualityInput {
  return { currentRecipe: recipe, fieldBindings: createFieldBindings(recipe), mode: "manual", ...extra };
}
function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function filledRecipe(): RecipeDetailsInput {
  return { ...emptyDetails("盐水菜"), servings: 2, ingredients: [{ name: "盐", amount: "适量" }], steps: [{ instruction: "拌匀", imagePath: null }] };
}

describe("G7 T01-T03 current draft checks", () => {
  it("title-only is saveable and shows three optional suggestions with objective zero counts", () => {
    const report = buildIntakeQualityReport(input(emptyDetails("只记菜名")));
    expect(report.canSave).toBe(true);
    expect(report.summary).toEqual({ ingredientCount: 0, stepCount: 0, preparationCount: 0, keyTipCount: 0, servings: null });
    expect(report.issues.map(issue => [issue.priority, issue.currentPath])).toEqual([["missing", "servings"], ["missing", "ingredients"], ["missing", "steps"]]);
    expect(report.originalChecks).toEqual([]);
  });

  it("current values clear missing suggestions and replace initial counts", () => {
    const originalRecipe = emptyDetails("初稿");
    const currentRecipe = filledRecipe();
    const bindings = insertFieldBinding(insertFieldBinding(createFieldBindings(originalRecipe), "ingredients", 0), "steps", 0);
    const report = buildIntakeQualityReport(input(currentRecipe, { originalRecipe, fieldBindings: bindings }));
    expect(report.summary).toEqual({ ingredientCount: 1, stepCount: 1, preparationCount: 0, keyTipCount: 0, servings: 2 });
    expect(report.issues).toEqual([]);
    expect(report.canSave).toBe(true);
  });

  it.each(["适量", "少许", "半勺", "1～2勺", "  按口味  "])("free-text amount %j stays legal and unchanged", amount => {
    const recipe = { ...filledRecipe(), ingredients: [{ name: "盐", amount }] };
    const report = buildIntakeQualityReport(input(recipe));
    expect(report.canSave).toBe(true);
    expect(report.issues).toEqual([]);
    expect(recipe.ingredients[0].amount).toBe(amount);
  });

  it("filled ingredient with whitespace-only amount gets one optional amount suggestion", () => {
    const recipe = { ...filledRecipe(), ingredients: [{ name: "盐", amount: "  " }] };
    const report = buildIntakeQualityReport(input(recipe));
    expect(report.canSave).toBe(true);
    expect(report.issues.map(issue => [issue.priority, issue.currentPath])).toEqual([["missing", "ingredients[0].amount"]]);
  });

  it("blank added ingredient name remains the existing schema error without an invented amount requirement", () => {
    const recipe = { ...filledRecipe(), ingredients: [{ name: "", amount: "" }] };
    const report = buildIntakeQualityReport(input(recipe));
    expect(report.canSave).toBe(false);
    expect(report.issues.map(issue => [issue.priority, issue.currentPath])).toEqual([["error", "ingredients[0].name"]]);
  });

  it("four short steps do not produce a claim that the recipe is incomplete", () => {
    const recipe = { ...filledRecipe(), steps: ["洗", "切", "炒", "盛"].map(instruction => ({ instruction, imagePath: null })) };
    expect(buildIntakeQualityReport(input(recipe)).issues).toEqual([]);
  });

  it("optional photo, calories, notes, preparations and tips do not create priority problems", () => {
    const report = buildIntakeQualityReport(input(filledRecipe()));
    expect(report.issues).toEqual([]);
    expect(report.summary.preparationCount).toBe(0);
    expect(report.summary.keyTipCount).toBe(0);
  });

  it.each([
    ["empty title", { title: " " }, "title"],
    ["long title", { title: "菜".repeat(121) }, "title"],
    ["zero time", { totalMinutes: 0 }, "totalMinutes"],
    ["fractional time", { totalMinutes: 1.5 }, "totalMinutes"],
    ["invalid servings", { servings: 0 }, "servings"],
    ["negative calories", { caloriesPerServing: -1 }, "caloriesPerServing"],
    ["long amount", { ingredients: [{ name: "盐", amount: "克".repeat(501) }] }, "ingredients[0].amount"],
    ["empty step", { steps: [{ instruction: "", imagePath: null }] }, "steps[0].instruction"],
    ["bad tip association", { keyTips: [{ instruction: "不要糊", stepNumber: 2 }] }, "keyTips[0].stepNumber"],
  ] satisfies Array<[string, Partial<RecipeDetailsInput>, string]>)("%s is a blocking existing-schema error", (_name, patch, path) => {
    const report = buildIntakeQualityReport(input({ ...filledRecipe(), ...patch }));
    expect(report.canSave).toBe(false);
    expect(report.issues.filter(issue => issue.priority === "error").map(issue => issue.currentPath)).toContain(path);
  });

  it("existing schema maximum arrays are accepted with all current rows counted", () => {
    const recipe = {
      ...filledRecipe(),
      ingredients: Array.from({ length: 300 }, () => ({ name: "盐", amount: "少许" })),
      steps: Array.from({ length: 300 }, () => ({ instruction: "拌匀", imagePath: null })),
      preparations: Array.from({ length: 100 }, () => ({ instruction: "先泡", minutes: null, timingText: null })),
      keyTips: Array.from({ length: 100 }, () => ({ instruction: "小心", stepNumber: 300 })),
    };
    const report = buildIntakeQualityReport(input(recipe));
    expect(report.canSave).toBe(true);
    expect(report.summary).toEqual({ ingredientCount: 300, stepCount: 300, preparationCount: 100, keyTipCount: 100, servings: 2 });
    expect(report.issues).toEqual([]);
  });

  it("over-limit arrays use collection schema errors instead of truncating current rows", () => {
    const recipe = { ...filledRecipe(), ingredients: Array.from({ length: 301 }, () => ({ name: "盐", amount: "少许" })) };
    const report = buildIntakeQualityReport(input(recipe));
    expect(report.canSave).toBe(false);
    expect(report.summary.ingredientCount).toBe(301);
    expect(report.issues.map(issue => [issue.priority, issue.currentPath])).toEqual([["error", "ingredients"]]);
  });

  it("ordinary valid local media is not rejected by the AI output-only null contract", () => {
    const recipe = { ...filledRecipe(), coverPath: "images/abc.jpg", steps: [{ instruction: "拌匀", imagePath: "images/def.webp" }] };
    expect(buildIntakeQualityReport(input(recipe)).canSave).toBe(true);
  });
});

describe("G7 T04 original evidence stays historical", () => {
  it("empty optional calories, media and notes stay in the complete original review without priority issues or weakening confirmation", () => {
    const originalRecipe = filledRecipe();
    const originalFieldChecks = freeze([
      { path: "caloriesPerServing", status: "missing", label: "每份参考热量", message: "原结果没有热量" },
      { path: "coverPath", status: "missing", label: "封面照片", message: "原结果没有封面" },
      { path: "notes", status: "missing", label: "备注", message: "原结果没有备注" },
      { path: "steps[0].imagePath", status: "missing", label: "步骤图片", message: "原结果没有步骤图片" },
    ] satisfies AiFieldCheck[]);
    const report = buildIntakeQualityReport(input(originalRecipe, { originalRecipe, originalFieldChecks, mode: "ai" }));
    expect(report.issues).toEqual([]);
    expect(report.originalChecks.map(evidence => evidence.check)).toEqual([
      { path: "caloriesPerServing", status: "missing", label: "每份参考热量", message: "原结果没有热量" },
      { path: "coverPath", status: "missing", label: "封面照片", message: "原结果没有封面" },
      { path: "notes", status: "missing", label: "备注", message: "原结果没有备注" },
      { path: "steps[0].imagePath", status: "missing", label: "步骤图片", message: "原结果没有步骤图片" },
    ]);
    expect(report.originalChecks.map(evidence => evidence.currentState)).toEqual(["unchanged", "unchanged", "unchanged", "unchanged"]);
    expect(requiresAiReview({ recipe: originalRecipe, review: { fieldChecks: originalFieldChecks, requiresConfirmation: true }, warnings: [] })).toBe(true);
    expect(report.canSave).toBe(true);
  });

  it("optional calorie filtering never hides schema errors or promotes the original missing evidence after manual entry", () => {
    const originalRecipe = filledRecipe();
    const originalFieldChecks = freeze([{ path: "caloriesPerServing", status: "missing", label: "每份参考热量", message: "原结果没有热量" }] satisfies AiFieldCheck[]);
    const invalid = buildIntakeQualityReport(input({ ...originalRecipe, caloriesPerServing: -1 }, { originalRecipe, originalFieldChecks, mode: "ai" }));
    expect(invalid.canSave).toBe(false);
    expect(invalid.issues.map(issue => [issue.priority, issue.currentPath])).toEqual([["error", "caloriesPerServing"]]);
    const filled = buildIntakeQualityReport(input({ ...originalRecipe, caloriesPerServing: 280 }, { originalRecipe, originalFieldChecks, mode: "ai" }));
    expect(filled.canSave).toBe(true);
    expect(filled.issues.map(issue => [issue.priority, issue.currentPath])).toEqual([["source", "caloriesPerServing"]]);
    expect(filled.originalChecks[0]).toMatchObject({ currentState: "filled", check: { path: "caloriesPerServing", status: "missing", message: "原结果没有热量" } });
    expect(filled.originalChecks[0].check).toBe(originalFieldChecks[0]);
    expect(filled.issues[0].reasons.join(" ")).toContain("尚未重新核对来源");
    expect(requiresAiReview({ recipe: { ...originalRecipe, caloriesPerServing: 280 }, review: { fieldChecks: originalFieldChecks, requiresConfirmation: true }, warnings: [] })).toBe(true);
  });

  it("filled original missing retains original evidence while current missing disappears", () => {
    const originalRecipe = { ...filledRecipe(), servings: null };
    const originalFieldChecks = [check("servings", "missing", "份数")];
    const report = buildIntakeQualityReport(input({ ...originalRecipe, servings: 3 }, { originalRecipe, originalFieldChecks, mode: "ai" }));
    expect(report.issues.map(issue => [issue.priority, issue.currentPath])).toEqual([["source", "servings"]]);
    expect(report.originalChecks[0]).toMatchObject({ check: { status: "missing", path: "servings" }, currentState: "filled" });
    expect(report.issues[0].reasons.join(" ")).toContain("已填写");
    expect(originalFieldChecks[0].status).toBe("missing");
  });

  it("editing an inferred amount never promotes its source status", () => {
    const originalRecipe = filledRecipe();
    const currentRecipe = { ...originalRecipe, ingredients: [{ name: "盐", amount: "15毫升" }] };
    const report = buildIntakeQualityReport(input(currentRecipe, { originalRecipe, originalFieldChecks: [check("ingredients[0].amount", "inferred")], mode: "ai" }));
    expect(report.originalChecks[0]).toMatchObject({ check: { status: "inferred" }, currentState: "edited" });
    expect(report.issues[0]).toMatchObject({ priority: "source", currentPath: "ingredients[0].amount" });
  });

  it("an edited explicit value states that the current value has not been checked again", () => {
    const originalRecipe = filledRecipe();
    const report = buildIntakeQualityReport(input({ ...originalRecipe, title: "自己改的菜" }, { originalRecipe, originalFieldChecks: [check("title", "explicit")], mode: "ai" }));
    expect(report.originalChecks[0]).toMatchObject({ check: { status: "explicit" }, currentState: "edited" });
    expect(report.issues[0].reasons.join(" ")).toContain("当前值已人工修改");
    expect(report.issues[0].reasons.join(" ")).toContain("尚未重新核对来源");
  });

  it("unchanged explicit fields stay in the complete audit but do not create source problems", () => {
    const originalRecipe = filledRecipe();
    const report = buildIntakeQualityReport(input(originalRecipe, { originalRecipe, originalFieldChecks: [check("title", "explicit")], mode: "ai" }));
    expect(report.originalChecks[0].currentState).toBe("unchanged");
    expect(report.issues).toEqual([]);
  });

  it("missing current amount and original missing are one field with multiple real reasons", () => {
    const originalRecipe = { ...filledRecipe(), ingredients: [{ name: "盐", amount: "" }] };
    const report = buildIntakeQualityReport(input(originalRecipe, { originalRecipe, originalFieldChecks: [check("ingredients[0].amount", "missing")], mode: "ai" }));
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({ priority: "missing", currentPath: "ingredients[0].amount" });
    expect(report.issues[0].reasons).toHaveLength(2);
    expect(report.issues[0].evidence).toHaveLength(1);
  });

  it("a schema error and two original checks for the same field merge without dropping evidence", () => {
    const originalRecipe = filledRecipe();
    const originalFieldChecks = [check("title", "missing"), check("title", "inferred")];
    const report = buildIntakeQualityReport(input({ ...originalRecipe, title: "" }, { originalRecipe, originalFieldChecks, mode: "ai" }));
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({ priority: "error", currentPath: "title" });
    expect(report.issues[0].evidence).toHaveLength(2);
    expect(report.originalChecks).toHaveLength(2);
    expect(new Set(report.originalChecks.map(evidence => evidence.id)).size).toBe(2);
  });

  it("missing original recipe is honestly unlocatable rather than claiming unchanged", () => {
    const report = buildIntakeQualityReport(input(filledRecipe(), { originalFieldChecks: [check("title", "inferred")], mode: "ai" }));
    expect(report.originalChecks[0].currentState).toBe("unlocatable");
    expect(report.originalChecks[0].check.status).toBe("inferred");
  });

  it("Parser and manual inputs do not synthesize AI labels from current content", () => {
    for (const mode of ["manual", "parser"] as const) {
      const report = buildIntakeQualityReport(input(filledRecipe(), { mode }));
      expect(report.originalChecks).toEqual([]);
      expect(report.issues).toEqual([]);
    }
  });
});

describe("G7 T05 mapping, ordering and bounded source facts", () => {
  it("moved duplicate names retain the original evidence and stable issue ID", () => {
    const originalRecipe = { ...filledRecipe(), ingredients: [{ name: "盐", amount: "" }, { name: "盐", amount: "2克" }] };
    const originalFieldChecks = [check("ingredients[0].amount", "missing")];
    const fieldBindings = createFieldBindings(originalRecipe);
    const before = buildIntakeQualityReport(input(originalRecipe, { originalRecipe, originalFieldChecks, fieldBindings, mode: "ai" }));
    const currentRecipe = { ...originalRecipe, ingredients: [{ name: "盐", amount: "2克" }, { name: "盐", amount: "" }] };
    const after = buildIntakeQualityReport(input(currentRecipe, { originalRecipe, originalFieldChecks, fieldBindings: moveFieldBinding(fieldBindings, "ingredients", 0, 1), mode: "ai" }));
    expect(after.issues[0].id).toBe(before.issues[0].id);
    expect(after.issues[0].currentPath).toBe("ingredients[1].amount");
    expect(after.originalChecks[0].mapping.originalPath).toBe("ingredients[0].amount");
    expect(after.originalChecks[0].currentState).toBe("unchanged");
  });

  it("removed original amount stays in audit and cannot attach to a new same-name replacement", () => {
    const originalRecipe = { ...filledRecipe(), ingredients: [{ name: "盐", amount: "" }] };
    const bindings = insertFieldBinding(removeFieldBinding(createFieldBindings(originalRecipe), "ingredients", 0), "ingredients", 0);
    const report = buildIntakeQualityReport(input({ ...originalRecipe, ingredients: [{ name: "盐", amount: "适量" }] }, { originalRecipe, originalFieldChecks: [check("ingredients[0].amount", "missing")], fieldBindings: bindings, mode: "ai" }));
    expect(report.originalChecks[0]).toMatchObject({ currentState: "removed", mapping: { status: "removed", currentPath: null } });
    expect(report.issues).toEqual([]);
  });

  it("empty steps use a collection target and never a fabricated first step", () => {
    const report = buildIntakeQualityReport(input({ ...filledRecipe(), steps: [] }));
    expect(report.issues.map(issue => [issue.priority, issue.currentPath])).toEqual([["missing", "steps"]]);
  });

  it("new missing rows have separate stable identities across later text changes", () => {
    const originalRecipe = filledRecipe();
    const fieldBindings = insertFieldBinding(createFieldBindings(originalRecipe), "ingredients", 1);
    const first = buildIntakeQualityReport(input({ ...originalRecipe, ingredients: [...originalRecipe.ingredients, { name: "胡椒", amount: "" }] }, { originalRecipe, fieldBindings }));
    const second = buildIntakeQualityReport(input({ ...originalRecipe, ingredients: [...originalRecipe.ingredients, { name: "白胡椒", amount: "" }] }, { originalRecipe, fieldBindings }));
    expect(first.issues[0].id).toBe(second.issues[0].id);
    expect(first.issues[0].currentPath).toBe("ingredients[1].amount");
    expect(first.issues[0].evidence).toEqual([]);
    expect(fieldBindings.originalRows.ingredients).not.toContain(fieldBindings.currentRows.ingredients[1]);
  });

  it("step-bound tip evidence follows the tip while existing association number changes remain visible", () => {
    const originalRecipe = { ...filledRecipe(), steps: [{ instruction: "洗", imagePath: null }, { instruction: "炒", imagePath: null }], keyTips: [{ instruction: "小心", stepNumber: 2 }] };
    const currentRecipe = { ...originalRecipe, steps: [{ instruction: "炒", imagePath: null }, { instruction: "洗", imagePath: null }], keyTips: [{ instruction: "小心", stepNumber: 1 }] };
    const report = buildIntakeQualityReport(input(currentRecipe, { originalRecipe, originalFieldChecks: [check("steps[1].instruction", "inferred"), check("keyTips[0].stepNumber", "explicit")], fieldBindings: moveFieldBinding(createFieldBindings(originalRecipe), "steps", 1, 0), mode: "ai" }));
    expect(report.canSave).toBe(true);
    expect(report.originalChecks.map(evidence => [evidence.mapping.currentPath, evidence.currentState])).toEqual([["steps[0].instruction", "unchanged"], ["keyTips[0].stepNumber", "edited"]]);
  });

  it("unknown and absent-original paths retain checks without guessed targets", () => {
    const originalRecipe = filledRecipe();
    const report = buildIntakeQualityReport(input(originalRecipe, { originalRecipe, originalFieldChecks: [check("recipe.secret", "inferred"), check("steps[900].instruction", "missing")], mode: "ai" }));
    expect(report.originalChecks.map(evidence => [evidence.check.path, evidence.mapping.status, evidence.mapping.currentPath, evidence.currentState])).toEqual([["recipe.secret", "unknown", null, "unlocatable"], ["steps[900].instruction", "unlocatable", null, "unlocatable"]]);
    expect(report.issues.every(issue => issue.currentPath === null && issue.priority === "source")).toBe(true);
    expect(report.canSave).toBe(true);
  });

  it("errors sort before missing and source, then by current field and row order", () => {
    const originalRecipe = { ...filledRecipe(), ingredients: [{ name: "甲", amount: "" }, { name: "乙", amount: "" }], steps: [{ instruction: "第一步", imagePath: null }, { instruction: "第二步", imagePath: null }] };
    const currentRecipe = { ...originalRecipe, title: "", servings: null };
    const report = buildIntakeQualityReport(input(currentRecipe, { originalRecipe, originalFieldChecks: [check("steps[1].instruction", "inferred"), check("steps[0].instruction", "inferred")], mode: "ai" }));
    expect(report.issues.map(issue => [issue.priority, issue.currentPath])).toEqual([["error", "title"], ["missing", "servings"], ["missing", "ingredients[0].amount"], ["missing", "ingredients[1].amount"], ["source", "steps[0].instruction"], ["source", "steps[1].instruction"]]);
  });

  it("same source reason is not duplicated while distinct messages stay inspectable", () => {
    const originalRecipe = filledRecipe();
    const duplicate = { ...check("title", "inferred"), message: "来源没有写完整" };
    const distinct = { ...check("title", "inferred"), message: "请核对别名" };
    const report = buildIntakeQualityReport(input(originalRecipe, { originalRecipe, originalFieldChecks: [duplicate, duplicate, distinct], mode: "ai" }));
    expect(report.issues).toHaveLength(1);
    expect(report.originalChecks).toHaveLength(3);
    expect(report.issues[0].reasons.filter(reason => reason === "来源没有写完整")).toHaveLength(1);
    expect(report.issues[0].reasons).toContain("请核对别名");
  });

  it("long source labels and warnings remain exact plain data without invented field attribution", () => {
    const originalRecipe = filledRecipe();
    const longMessage = "请核对🍲".repeat(40);
    const warnings = ["<script>不可执行</script>" + "长".repeat(450), "多个字段都请对照来源", "多个字段都请对照来源"];
    const originalFieldChecks = [{ ...check("title", "inferred", "来源标签".repeat(25)), message: longMessage }];
    const report = buildIntakeQualityReport(input(originalRecipe, { originalRecipe, originalFieldChecks, warnings, mode: "ai" }));
    expect(report.warnings).toEqual(warnings);
    expect(report.originalChecks[0].check.message).toBe(longMessage);
    expect(report.originalChecks[0].check.label).toBe("来源标签".repeat(25));
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0].currentPath).toBe("title");
  });

  it("deep-frozen current draft, original draft, checks and mappings are never mutated", () => {
    const originalRecipe = freeze(filledRecipe());
    const currentRecipe = freeze({ ...filledRecipe(), title: "改后" });
    const originalFieldChecks = freeze([check("title", "explicit"), check("servings", "missing")]);
    const warnings = freeze(["原提示"]);
    const fieldBindings = freeze(createFieldBindings(originalRecipe));
    const report = buildIntakeQualityReport({ currentRecipe, originalRecipe, originalFieldChecks, warnings, fieldBindings, mode: "ai" });
    expect(originalRecipe.title).toBe("盐水菜");
    expect(currentRecipe.title).toBe("改后");
    expect(originalFieldChecks.map(item => item.status)).toEqual(["explicit", "missing"]);
    expect(report.originalChecks.map(evidence => evidence.check)).toEqual(originalFieldChecks);
    expect(report.originalChecks[0].check).toBe(originalFieldChecks[0]);
    expect(report.warnings).toEqual(["原提示"]);
    expect(report.canSave).toBe(true);
  });
});
