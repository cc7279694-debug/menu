"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { moveRecipeToTrashAction } from "@/features/recipes/actions";

export function MoveToTrashButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const moveToTrash = () => startTransition(async () => {
    const result = await moveRecipeToTrashAction(recipeId);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setOpen(false);
    router.push("/recipes?view=trash");
    router.refresh();
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button variant="outline">移入回收站</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>移入回收站？</DialogTitle>
          <DialogDescription>菜谱不会立即删除，你可以在回收站中恢复它或永久删除。</DialogDescription>
        </DialogHeader>
        {message && <p className="text-sm text-destructive">{message}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline">取消</Button>} />
          <Button disabled={pending} onClick={moveToTrash} variant="destructive">
            {pending ? "移动中…" : "确认移动"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
