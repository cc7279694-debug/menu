import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import type { IntakeQualityReport } from "./quality";
import type { IntakeSourceContext } from "./source-context";
import { IntakeSourcePanel } from "./source-panel";

export function IntakeQualityPanel({ report, locate, source = null, external = false, showWarnings = true }: {
  report: IntakeQualityReport;
  locate: (path: string) => void;
  source?: IntakeSourceContext | null;
  external?: boolean;
  showWarnings?: boolean;
}) {
  const [expanded, setExpanded] = useState(false), [sourceOpen, setSourceOpen] = useState(false);
  const issuesId = useId();
  const { summary } = report;
  const issues = expanded ? report.issues : report.issues.slice(0, 3);
  return <section role="region" aria-label="当前草稿检查" className="v2-intake-quality">
    <header className="v2-intake-quality-header"><h3>检查提示</h3><p>食材 {summary.ingredientCount} 项 · 步骤 {summary.stepCount} 步 · {summary.servings === null ? "原始份量未填写" : `原始 ${summary.servings} 人份`}</p></header>
    {(summary.preparationCount > 0 || summary.keyTipCount > 0) && <p className="v2-task-note">提前准备 {summary.preparationCount} 项 · 关键事项 {summary.keyTipCount} 项</p>}
    {issues.length > 0 ? <ul id={issuesId} className="v2-intake-issues">{issues.map(issue => {
      const originalMessages = new Set(issue.evidence.map(item => item.check.message).filter(Boolean));
      const reasons = issue.reasons.filter(reason => !originalMessages.has(reason));
      return <li key={issue.id} data-priority={issue.priority}>
        <div><strong>{issue.label}</strong><span className="v2-intake-issue-kind">{issue.priority === "error" ? "需修正" : issue.priority === "missing" ? "可补充" : "对照来源"}</span>
          {(reasons.length ? reasons : issue.reasons).map((reason, index) => <p key={index}>{reason}</p>)}
        </div>
        {issue.currentPath !== null && <Button type="button" variant="ghost" className="v2-intake-locate" aria-label={`前往${issue.label}`} onClick={() => locate(issue.currentPath!)}>前往</Button>}
      </li>;
    })}</ul> : <p className="v2-task-note">未发现本轮检查规则覆盖的问题，仍请按实际情况核对。</p>}
    {report.issues.length > 3 && <Button type="button" variant="ghost" aria-expanded={expanded} aria-controls={issuesId} onClick={() => setExpanded(value => !value)}>{expanded ? "收起提示" : `查看全部 ${report.issues.length} 条提示`}</Button>}
    {showWarnings && report.warnings.length > 0 && <details className="v2-intake-source-notes"><summary>原来源附注 {report.warnings.length} 项</summary><ul>{report.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></details>}
    {external && <div className="v2-intake-reference-action">{source ? <Button type="button" variant="outline" onClick={() => setSourceOpen(true)}>查看本轮来源</Button> : <p className="v2-task-note">本轮来源暂不可用，可继续手动核对；不会重新联网读取。</p>}<span className="v2-task-note">查看来源不会自动确认审核。</span></div>}
    <IntakeSourcePanel source={source} open={sourceOpen} onOpenChange={setSourceOpen} />
  </section>;
}
