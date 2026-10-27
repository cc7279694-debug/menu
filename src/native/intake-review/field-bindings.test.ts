import { describe, expect, it } from "vitest";
import { emptyDetails, type RecipeDetailsInput } from "../recipe-model";
import {
  createFieldBindings, currentFieldId, insertFieldBinding, moveFieldBinding,
  removeFieldBinding, resolveOriginalField, type IntakeArrayGroup,
} from "./field-bindings";

function recipe(): RecipeDetailsInput {
  return {
    ...emptyDetails("重复名称仍有身份"),
    ingredients: [{ name: "盐", amount: "1克" }, { name: "盐", amount: "2克" }],
    steps: [{ instruction: "搅拌", imagePath: null }, { instruction: "搅拌", imagePath: null }],
    preparations: [{ instruction: "先泡", minutes: null, timingText: null }],
    keyTips: [{ instruction: "小心", stepNumber: 2 }],
  };
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

describe("G7 T05 session field identity", () => {
  it("creates distinct row identities for duplicate names and repeated instructions", () => {
    const bindings = createFieldBindings(recipe());
    expect(bindings.currentRows.ingredients).toHaveLength(2);
    expect(new Set(bindings.currentRows.ingredients).size).toBe(2);
    expect(new Set(bindings.currentRows.steps).size).toBe(2);
    expect(bindings.originalRows).toEqual(bindings.currentRows);
  });

  it.each(["ingredients", "steps", "preparations", "keyTips"] as const)("insertion in %s never borrows an original row identity", group => {
    const before = createFieldBindings(recipe());
    const after = insertFieldBinding(before, group, 0);
    expect(after.currentRows[group].slice(1)).toEqual(before.currentRows[group]);
    expect(after.originalRows[group]).toEqual(before.originalRows[group]);
    expect(after.originalRows[group]).not.toContain(after.currentRows[group][0]);
  });

  it("moving repeated ingredient names keeps evidence on its original row", () => {
    const before = createFieldBindings(recipe());
    const after = moveFieldBinding(before, "ingredients", 0, 1);
    expect(resolveOriginalField("ingredients[0].amount", after)).toMatchObject({
      originalPath: "ingredients[0].amount", status: "located", currentPath: "ingredients[1].amount", rowKey: before.currentRows.ingredients[0],
    });
    expect(resolveOriginalField("ingredients[1].amount", after).currentPath).toBe("ingredients[0].amount");
  });

  it("a new leading row shifts current paths while keeping original paths intact", () => {
    const bindings = insertFieldBinding(createFieldBindings(recipe()), "steps", 0);
    expect(resolveOriginalField("steps[1].instruction", bindings)).toMatchObject({
      originalPath: "steps[1].instruction", status: "located", currentPath: "steps[2].instruction",
    });
  });

  it("deleting then replacing the same index never transfers deleted evidence", () => {
    const initial = createFieldBindings(recipe());
    const removed = removeFieldBinding(initial, "ingredients", 0);
    const replacement = insertFieldBinding(removed, "ingredients", 0);
    expect(resolveOriginalField("ingredients[0].amount", replacement)).toMatchObject({ status: "removed", currentPath: null });
    expect(resolveOriginalField("ingredients[1].amount", replacement)).toMatchObject({ status: "located", currentPath: "ingredients[1].amount" });
    expect(replacement.currentRows.ingredients[0]).not.toBe(initial.currentRows.ingredients[0]);
  });

  it("new row keys are not reused after adding and removing a row", () => {
    const first = insertFieldBinding(createFieldBindings(recipe()), "steps", 2);
    const second = insertFieldBinding(removeFieldBinding(first, "steps", 2), "steps", 2);
    expect(second.currentRows.steps[2]).not.toBe(first.currentRows.steps[2]);
    expect(second.originalRows.steps).not.toContain(second.currentRows.steps[2]);
  });

  it("field IDs stay stable across moves and match the current field ID", () => {
    const initial = createFieldBindings(recipe());
    const id = resolveOriginalField("ingredients[0].amount", initial).fieldId;
    const reordered = moveFieldBinding(initial, "ingredients", 0, 1);
    expect(resolveOriginalField("ingredients[0].amount", reordered).fieldId).toBe(id);
    expect(currentFieldId("ingredients[1].amount", reordered)).toBe(id);
    expect(currentFieldId("ingredients[0].amount", reordered)).not.toBe(id);
    expect(currentFieldId("ingredients[1].name", reordered)).not.toBe(id);
  });

  it.each(["title", "servings", "notes", "ingredients", "steps", "preparations", "keyTips"])("resolves scalar or collection %s without inventing a row", path => {
    expect(resolveOriginalField(path, createFieldBindings(recipe()))).toMatchObject({ originalPath: path, status: "located", currentPath: path });
  });

  it("known fields with an absent original row are honestly unlocatable", () => {
    expect(resolveOriginalField("ingredients[8].amount", createFieldBindings(recipe()))).toMatchObject({ status: "unlocatable", currentPath: null });
  });

  it.each(["", "ingredients[-1].amount", "ingredients[01].amount", "ingredients[0].instruction", "steps[0].amount", "recipe.title", "__proto__.polluted", "ingredients[0].name.extra"])("does not guess a location for malformed path %j", path => {
    expect(resolveOriginalField(path, createFieldBindings(recipe()))).toMatchObject({ originalPath: path, status: "unknown", currentPath: null });
  });

  it("pure array operations preserve frozen original inputs and untouched groups", () => {
    const input = freeze(recipe());
    const initial = freeze(createFieldBindings(input));
    const changed = removeFieldBinding(moveFieldBinding(insertFieldBinding(initial, "steps", 1), "steps", 0, 2), "steps", 0);
    expect(initial.currentRows.steps).toHaveLength(2);
    expect(initial.originalRows.steps).toHaveLength(2);
    expect(changed.originalRows).toEqual(initial.originalRows);
    expect(changed.currentRows.ingredients).toEqual(initial.currentRows.ingredients);
    expect(input.steps).toEqual([{ instruction: "搅拌", imagePath: null }, { instruction: "搅拌", imagePath: null }]);
  });

  it.each([
    ["insert", -1, 0], ["insert", 4, 0], ["remove", -1, 0], ["remove", 2, 0],
    ["move", -1, 0], ["move", 0, 2], ["move", 0, 0], ["move", 0.5, 1],
  ] as const)("invalid %s indexes %s,%s do not corrupt bindings", (operation, index, destination) => {
    const initial = createFieldBindings(recipe());
    const group: IntakeArrayGroup = "ingredients";
    const result = operation === "insert" ? insertFieldBinding(initial, group, index)
      : operation === "remove" ? removeFieldBinding(initial, group, index)
        : moveFieldBinding(initial, group, index, destination);
    expect(result).toBe(initial);
  });
});
