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
import { permanentlyDeleteRecipeAction } from "@/features/recipes/actions";
import { applyRecipeMutationLocally } from "@/features/offline/recipe-mutations";
import { deleteRecipeSnapshot, getLastOfflineProfile } from "@/features/offline/database";

export function PermanentDeleteButton({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const permanentlyDelete = () => startTransition(async () => {
    const local = await applyRecipeMutationLocally({ recipeId, kind: "permanently-delete" }).catch(() => null);
    if (local) {
      setOpen(false);
      router.refresh();
      return;
    }

    const result = await permanentlyDeleteRecipeAction(recipeId);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setOpen(false);
    void getLastOfflineProfile()
      .then((profile) => profile ? deleteRecipeSnapshot(profile.userId, recipeId) : undefined)
      .catch(() => undefined);
    router.refresh();
  });

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button variant="destructive">永久删除</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>永久删除这道菜？</DialogTitle>
          <DialogDescription>删除后无法恢复，关联的菜单安排也会被移除；烹饪记录仍会保留。</DialogDescription>
        </DialogHeader>
        {message && <p className="text-sm text-destructive">{message}</p>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline">取消</Button>} />
          <Button disabled={pending} onClick={permanentlyDelete} variant="destructive">
            {pending ? "删除中…" : "确认永久删除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
