import { useEffect, useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { adjustIngredientAmount, isValidTargetServings, parseTargetServings, stepTargetServings } from "./serving-adjustment";
import { V2Button } from "./ui-v2/components";

/** One recipe-view session owns the valid target; input drafts never reach storage. */
export type ServingAdjustmentSession = {
  targetServings: number | null;
  onTargetServingsChange: (servings: number) => void;
};

export function ServingControl({ originalServings, targetServings, onTargetServingsChange, disabled = false }: {
  originalServings: number | null;
  disabled?: boolean;
} & ServingAdjustmentSession) {
  const inputId = useId(), helpId = useId(), errorId = useId();
  const original = isValidTargetServings(originalServings) ? originalServings : null;
  const active = isValidTargetServings(targetServings) ? targetServings : original;
  const [draft, setDraft] = useState(() => active === null ? "" : String(active));
  // The other surface can change the same session target while detail is hidden.
  useEffect(() => { setDraft(active === null ? "" : String(active)); }, [active]);
  const invalid = original !== null && parseTargetServings(draft) === null;
  function select(value: number) {
    setDraft(String(value));
    onTargetServingsChange(value);
  }
  return <div className="v2-g6-serving">
    {original === null ? <p className="v2-g6-serving-help">需要先在菜谱编辑中填写原始份数，才能按本次人数换算。食材保留原始用量。</p> : <>
      <div className="v2-g6-serving-heading">
        <p className="v2-g6-serving-original">原始 {original} 人份</p>
        <V2Button variant="text" disabled={disabled} onClick={() => select(original)}>恢复原始份数</V2Button>
      </div>
      <label className="v2-g6-serving-label" htmlFor={inputId}>本次做几人份</label>
      <div className="v2-g6-serving-inputs">
        <V2Button variant="secondary" className="v2-g6-serving-step" aria-label="减少本次份数"
          disabled={disabled || active === null || active <= .1}
          onClick={() => { if (active !== null) select(stepTargetServings(active, -1)); }}><Minus aria-hidden="true" /></V2Button>
        <div className="v2-g6-serving-field">
          <input id={inputId} aria-label="本次做几人份" type="text" inputMode="decimal" autoComplete="off" spellCheck={false}
            disabled={disabled} value={draft} aria-invalid={invalid || undefined}
            aria-describedby={`${helpId}${invalid ? ` ${errorId}` : ""}`}
            onChange={event => {
              const text = event.target.value;
              setDraft(text);
              const parsed = parseTargetServings(text);
              if (parsed !== null) onTargetServingsChange(parsed);
            }} />
          <span aria-hidden="true">人份</span>
        </div>
        <V2Button variant="secondary" className="v2-g6-serving-step" aria-label="增加本次份数"
          disabled={disabled || active === null || active >= 10000}
          onClick={() => { if (active !== null) select(stepTargetServings(active, 1)); }}><Plus aria-hidden="true" /></V2Button>
      </div>
      {invalid ? <p id={errorId} role="alert" className="v2-g6-serving-error">请输入 0.1～10000 之间的完整人数。下方仍显示最近一次有效份量。</p> : null}
      <p role="status" aria-label="本次份量" aria-live="polite" aria-atomic="true" className="v2-g6-serving-status">本次 {active} 人份</p>
      <p id={helpId} className="v2-g6-serving-help">仅调整本次查看，不修改原菜谱</p>
      <p className="v2-g6-serving-help">无法可靠换算的用量保留原文，请按实际情况判断。</p>
    </>}
  </div>;
}

/** Display-only projection: never placed back into RecipeDetails or a draft. */
export function ServingIngredientAmount({ amount, originalServings, targetServings }: {
  amount: string; originalServings: number | null; targetServings: number | null;
}) {
  const adjusted = adjustIngredientAmount(amount, originalServings, targetServings);
  return adjusted.state === "scaled" ? <span className="v2-g6-amount">
    <span className="v2-g6-amount-value"><span className="sr-only">本次用量 </span>{adjusted.displayAmount}</span>
    <span className="v2-g6-amount-original">原始 {amount}</span>
  </span> : <span className="v2-g6-amount-value">{amount || "用量未填写"}</span>;
}
