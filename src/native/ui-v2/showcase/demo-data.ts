import type { RecipeDetails } from "../../recipe-model";
import wings from "./assets/cola-wings.webp";
import soup from "./assets/tomato-egg-soup.webp";
import broccoli from "./assets/broccoli.webp";
import cookingStep from "./assets/cola-step.webp";

/** DEV-only fixtures. Never pass these records to a production repository. */
export type DemoRecipe = { details: RecipeDetails; image: string | null; stepImages?: Readonly<Record<number, string>> };
export type DemoScenario = "default" | "no-image" | "title-only" | "long" | "empty" | "broken-image";

/** Vite emits URL strings; Next.js image imports expose { src }. Showcase only. */
function fixtureImageUrl(image: string | { readonly src: string }): string {
  return typeof image === "string" ? image : image.src;
}

const blank: Omit<RecipeDetails, "id" | "title" | "createdAt" | "updatedAt"> = {
  totalMinutes: null, servings: null, caloriesPerServing: null, coverPath: null,
  notes: "", ingredients: [], preparations: [], keyTips: [], steps: [],
};

export const demoRecipes: readonly DemoRecipe[] = [
  {
    image: fixtureImageUrl(wings),
    stepImages: { 2: fixtureImageUrl(cookingStep) },
    details: {
      ...blank, id: "11111111-1111-4111-8111-111111111111", title: "可乐鸡翅",
      createdAt: "2026-10-22T08:00:00.000Z", updatedAt: "2026-10-22T08:00:00.000Z",
      totalMinutes: 30, servings: 2, caloriesPerServing: 328,
      notes: "收汁时留一点汤，拌饭刚刚好。",
      ingredients: [
        { name: "鸡翅中", amount: "500 克" }, { name: "可乐", amount: "330 毫升" },
        { name: "生抽", amount: "2 勺" }, { name: "老抽", amount: "1 勺" },
        { name: "姜片", amount: "4 片" }, { name: "料酒", amount: "1 勺" },
      ],
      preparations: [
        { instruction: "鸡翅洗净，两面各划两刀，方便入味。", minutes: null, timingText: null },
        { instruction: "生姜切片，调料提前放在手边。", minutes: null, timingText: null },
      ],
      keyTips: [{ instruction: "收汁的最后几分钟容易糊，留在锅边观察，不要走开。", stepNumber: 5 }],
      steps: [
        { instruction: "鸡翅冷水下锅，加入姜片和料酒。煮出浮沫后捞出，用温水洗净并沥干。", imagePath: null },
        { instruction: "平底锅烧热，放入沥干的鸡翅，小火煎至两面微微金黄。", imagePath: null },
        { instruction: "倒入 330 毫升可乐，加入生抽、老抽。大火煮开后转小火，盖上锅盖焖煮 10 分钟。", imagePath: "images/66666666-6666-4666-8666-666666666666.webp" },
        { instruction: "打开锅盖，将鸡翅翻面，继续小火煮至入味。", imagePath: null },
        { instruction: "开盖转中火收汁，轻轻翻动，让汤汁均匀裹住鸡翅。汤汁浓稠后立即关火。", imagePath: null },
        { instruction: "将鸡翅盛入盘中，淋上少量锅中汤汁，即可上桌。", imagePath: null },
      ],
    },
  },
  {
    image: fixtureImageUrl(soup),
    details: { ...blank, id: "22222222-2222-4222-8222-222222222222", title: "番茄鸡蛋汤",
      createdAt: "2026-10-21T08:00:00.000Z", updatedAt: "2026-10-21T08:00:00.000Z",
      totalMinutes: 15, servings: 2, caloriesPerServing: 92,
      ingredients: [{ name: "番茄", amount: "2 个" }, { name: "鸡蛋", amount: "2 个" }, { name: "盐", amount: "适量" }],
      steps: [{ instruction: "番茄切块，鸡蛋打散。", imagePath: null }, { instruction: "炒软番茄，加水煮开，再缓缓淋入蛋液，调味后盛出。", imagePath: null }],
    },
  },
  {
    image: fixtureImageUrl(broccoli),
    details: { ...blank, id: "33333333-3333-4333-8333-333333333333", title: "蒜蓉西兰花",
      createdAt: "2026-10-20T08:00:00.000Z", updatedAt: "2026-10-20T08:00:00.000Z",
      totalMinutes: 12, servings: 2, caloriesPerServing: 75,
      ingredients: [{ name: "西兰花", amount: "1 颗" }, { name: "蒜", amount: "3 瓣" }],
      steps: [{ instruction: "西兰花切小朵，焯水后沥干。", imagePath: null }, { instruction: "炒香蒜蓉，放入西兰花翻炒，调味出锅。", imagePath: null }],
    },
  },
  { image: null, details: { ...blank, id: "44444444-4444-4444-8444-444444444444", title: "啤酒鸭", totalMinutes: 60, createdAt: "2026-10-19T08:00:00.000Z", updatedAt: "2026-10-19T08:00:00.000Z" } },
  { image: null, details: { ...blank, id: "55555555-5555-4555-8555-555555555555", title: "清蒸鱼", createdAt: "2026-10-18T08:00:00.000Z", updatedAt: "2026-10-18T08:00:00.000Z" } },
];

export function scenarioRecipes(scenario: DemoScenario): readonly DemoRecipe[] {
  if (scenario === "empty") return [];
  if (scenario === "title-only") return [demoRecipes[4]];
  if (scenario === "no-image") return demoRecipes.map((r) => ({ ...r, image: null, stepImages: undefined }));
  if (scenario === "broken-image") return [{ ...demoRecipes[0], image: "data:image/png;base64,broken" }, ...demoRecipes.slice(1)];
  if (scenario === "long") return [{ ...demoRecipes[0], details: { ...demoRecipes[0].details,
    title: "周末慢慢做的家常可乐鸡翅，少一点甜、多一点酱香，记录这次真正喜欢的做法".repeat(4).slice(0, 120),
    ingredients: [{ name: "带有完整说明的鸡翅中（洗净并沥干，不需要为了摆拍替换真实用量）", amount: "500 克，按实际使用量填写，不自动缩放" }, ...demoRecipes[0].details.ingredients.slice(1)],
    steps: demoRecipes[0].details.steps.map((step, i) => ({ ...step, instruction: i === 0 ? `${step.instruction}\n${"保持小火，观察鸡翅颜色与汤汁状态，必要时轻轻翻动。".repeat(14)}` : step.instruction })),
  } }, ...demoRecipes.slice(1)];
  return demoRecipes;
}
