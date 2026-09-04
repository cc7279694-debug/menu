"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { analyzeNutritionAction } from "@/features/nutrition-analysis/actions";
import { NutritionAnalysisResultView } from "@/features/nutrition-analysis/components/nutrition-analysis-result";
import type { NutritionAnalysisResult } from "@/features/nutrition-analysis/types";

type NutritionAnalysisAction = typeof analyzeNutritionAction;

export function NutritionAnalysisForm({ analyze = analyzeNutritionAction }: { analyze?: NutritionAnalysisAction }) {
  const [ingredientText, setIngredientText] = useState("");
  const [servings, setServings] = useState("1");
  const [result, setResult] = useState<NutritionAnalysisResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const submit = async () => {
    if (!ingredientText.trim()) {
      setMessage("请先输入食材和用量");
      setResult(null);
      return;
    }

    const parsedServings = Number(servings);
    if (!Number.isFinite(parsedServings) || parsedServings <= 0) {
      setMessage("请填写有效的份数");
      setResult(null);
      return;
    }

    setIsAnalyzing(true);
    setMessage(null);
    try {
      const response = await analyze({ ingredientText, servings: parsedServings });
      if (response.ok) {
        setResult(response.data);
      } else {
        setResult(null);
        setMessage(response.message);
      }
    } catch {
      setResult(null);
      setMessage("营养分析失败，请稍后重试");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        className="space-y-4 rounded-2xl border bg-card p-5"
        onSubmit={(event) => { event.preventDefault(); void submit(); }}
      >
        <div className="space-y-2">
          <Label htmlFor="nutrition-ingredients">食材和用量</Label>
          <Textarea
            aria-label="食材和用量"
            id="nutrition-ingredients"
            onChange={(event) => setIngredientText(event.target.value)}
            placeholder="例如：200克牛肉 + 100克熟米饭 + 100克西兰花"
            value={ingredientText}
          />
          <p className="text-xs text-muted-foreground">尽量写清克数、毫升或个数，并注明生重或熟重。</p>
        </div>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="nutrition-servings">份数</Label>
          <Input
            id="nutrition-servings"
            inputMode="decimal"
            min={0.1}
            onChange={(event) => setServings(event.target.value)}
            step={0.1}
            type="number"
            value={servings}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={isAnalyzing} type="submit">
            {isAnalyzing ? "正在分析…" : "开始分析"}
          </Button>
          {message && <Button disabled={isAnalyzing} onClick={() => void submit()} type="button" variant="outline">重试</Button>}
        </div>
        <div aria-live="polite" className="text-sm text-muted-foreground">{isAnalyzing ? "正在整理营养参考，请稍候…" : null}</div>
        {message && <p className="text-sm text-destructive" role="alert">{message}</p>}
      </form>
      {result && <NutritionAnalysisResultView result={result} />}
    </div>
  );
}
