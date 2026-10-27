export type IngredientAmountAdjustment = {
  originalAmount: string;
  displayAmount: string;
  state: "original" | "scaled" | "unsupported" | "unavailable" | "unsafe";
  approximate: boolean;
};

const DECIMAL = /^(?:\d+(?:\.\d+)?|\.\d+)$/;
const AMOUNT = /^[ \t\u00a0\u3000]*(\d+(?:\.\d+)?|\.\d+)[ \t\u00a0\u3000]*(克|g|千克|公斤|kg|毫升|ml|mL|升|L|个|只|颗|片|根|瓣)[ \t\u00a0\u3000]*$/;
const DISCRETE_UNITS = new Set(["个", "只", "颗", "片", "根", "瓣"]);
const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);
const HUNDRED = BigInt(100);

// Keep displayed quantities within the usual exact-integer JS boundary. Arithmetic
// stays rational/BigInt so even cents near that ceiling do not lose precision.
const MAX_DISPLAY_AMOUNT = BigInt(Number.MAX_SAFE_INTEGER);
// RecipeDetails currently limits amount text to 500 characters. Bound work before
// parsing an untrusted quantity; never truncate text or try to recover a fragment.
const MAX_AMOUNT_LENGTH = 500;

function normalizeNumericCharacters(text: string): string {
  return text.replace(/[０-９．]/g, (character) =>
    character === "．"
      ? "."
      : String.fromCharCode(character.charCodeAt(0) - 0xfee0),
  );
}

function decimalFraction(text: string): { numerator: bigint; denominator: bigint } {
  const [whole, fraction = ""] = text.split(".");
  return {
    numerator: BigInt(`${whole || "0"}${fraction}`),
    denominator: TEN ** BigInt(fraction.length),
  };
}

function formatHundredths(hundredths: bigint): string {
  const whole = hundredths / HUNDRED;
  const fractional = hundredths % HUNDRED;
  if (fractional === ZERO) return whole.toString();
  return `${whole}.${fractional.toString().padStart(2, "0").replace(/0+$/, "")}`;
}

export function isValidTargetServings(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && value >= 0.1
    && value <= 10000;
}

export function parseTargetServings(text: string): number | null {
  const normalized = normalizeNumericCharacters(text).trim();
  if (!DECIMAL.test(normalized)) return null;
  const value = Number(normalized);
  return isValidTargetServings(value) ? value : null;
}

export function stepTargetServings(value: number, delta: -1 | 1): number {
  if (!isValidTargetServings(value)) return value;
  // Step the exact integer part, then rebuild the decimal. Direct value +/- 1
  // can turn 2.3 into 1.2999999999999998 and introduce a false rounding marker.
  const [whole, fraction] = value.toString().split(".");
  const nextWhole = Number(whole) + delta;
  if (nextWhole < 0) return 0.1;
  const next = Number(fraction === undefined ? String(nextWhole) : `${nextWhole}.${fraction}`);
  return Math.min(10000, Math.max(0.1, next));
}

export function adjustIngredientAmount(
  originalAmount: string,
  originalServings: number | null,
  targetServings: number | null,
): IngredientAmountAdjustment {
  const original: IngredientAmountAdjustment = {
    originalAmount,
    displayAmount: originalAmount,
    state: "unavailable",
    approximate: false,
  };
  if (!isValidTargetServings(originalServings) || !isValidTargetServings(targetServings)) {
    return original;
  }
  if (originalServings === targetServings) return { ...original, state: "original" };
  if (originalAmount.length > MAX_AMOUNT_LENGTH) return { ...original, state: "unsafe" };

  const normalized = normalizeNumericCharacters(originalAmount);
  const match = AMOUNT.exec(normalized);
  // JS's $ can also match before a final newline: require the actual whole field.
  if (!match || match[0].length !== normalized.length) {
    return { ...original, state: "unsupported" };
  }

  const amount = decimalFraction(match[1]);
  // Valid servings are 0.1..10000, whose canonical decimal strings have no exponent.
  const source = decimalFraction(originalServings.toString());
  const target = decimalFraction(targetServings.toString());
  const numerator = amount.numerator * target.numerator * source.denominator;
  const denominator = amount.denominator * target.denominator * source.numerator;
  if (numerator > MAX_DISPLAY_AMOUNT * denominator) {
    return { ...original, state: "unsafe" };
  }

  const exactHundredths = numerator * HUNDRED;
  const remainder = exactHundredths % denominator;
  const hundredths = exactHundredths / denominator
    + (remainder * TWO >= denominator ? ONE : ZERO);
  // A positive quantity must never silently become a displayed zero.
  if (numerator > ZERO && hundredths === ZERO) return { ...original, state: "unsafe" };

  const approximate = remainder !== ZERO
    || (DISCRETE_UNITS.has(match[2]) && numerator % denominator !== ZERO);
  return {
    originalAmount,
    displayAmount: `${approximate ? "约 " : ""}${formatHundredths(hundredths)} ${match[2]}`,
    state: "scaled",
    approximate,
  };
}
