import type { IntakeSourceContext } from "./source-context";

export type IntakeSourcePanelProps = {
  source: IntakeSourceContext | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IntakeSourcePanel(props: IntakeSourcePanelProps) {
  void props;
  return null;
}
