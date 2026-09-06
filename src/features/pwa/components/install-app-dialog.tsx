"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getManualInstallSteps,
  type PwaInstallPlatform,
} from "../install-capability";

export type InstallAppDialogProps = {
  open: boolean;
  platform: PwaInstallPlatform;
  onOpenChange: (open: boolean) => void;
};

export function InstallAppDialog({
  open,
  platform,
  onOpenChange,
}: InstallAppDialogProps) {
  const steps = getManualInstallSteps(platform);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="install-app-description">
        <DialogHeader>
          <DialogTitle>安装谱序</DialogTitle>
          <DialogDescription id="install-app-description">
            安装后可从手机主屏幕或电脑桌面打开，已有本机菜谱可在断网时继续使用。
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3" aria-label="安装步骤">
          {steps.map((step, index) => (
            <li className="flex gap-3 text-sm" key={step}>
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
              >
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
