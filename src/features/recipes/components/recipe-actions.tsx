"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { moveRecipeToTrashAction } from "@/features/recipes/actions";
import { FavoriteButton } from "@/features/recipes/components/favorite-button";
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

export function RecipeActions({ recipeId, isFavorite }: { recipeId: string; isFavorite: boolean }) {
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
    <div className="flex flex-wrap items-center gap-2">
      <FavoriteButton initialFavorite={isFavorite} recipeId={recipeId} />
      <Link className="rounded-lg border px-3 py-2 text-sm" href={`/recipes/${recipeId}/edit`}>编辑</Link>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogTrigger render={<Button variant="outline">移入回收站</Button>} />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移入回收站？</DialogTitle>
            <DialogDescription>菜谱不会立即删除，你可以在回收站中恢复它。</DialogDescription>
          </DialogHeader>
          {message && <p className="text-sm text-destructive">{message}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline">取消</Button>} />
            <Button disabled={pending} onClick={moveToTrash} variant="destructive">{pending ? "移动中…" : "确认移动"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
