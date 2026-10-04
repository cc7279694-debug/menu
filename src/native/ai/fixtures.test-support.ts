import { emptyDetails } from "../recipe-model";

export function intakeFixture() {
  return {
    recipe: {
      ...emptyDetails("啤酒鸭"),
      servings: 2,
      ingredients: [{ name: "鸭肉", amount: "500克" }, { name: "盐", amount: "适量" }],
      steps: [{ instruction: "不要糊锅，小火焖熟", imagePath: null }],
    },
    fieldChecks: [
      { path: "title", status: "explicit", label: "菜名", message: null },
      { path: "servings", status: "inferred", label: "份数", message: "未提份数" },
      { path: "ingredients[1].amount", status: "explicit", label: "盐用量", message: null },
    ],
    warnings: [],
  };
}
export const sourceFixture = { text: "啤酒鸭：鸭肉500克，盐适量。不要糊锅，小火焖熟。", hasImages: false };
