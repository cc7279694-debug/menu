/* eslint-disable @next/next/no-img-element -- history photos use private signed URLs. */

import type { RecipeCookingHistory } from "@/features/cooking-history/types";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
});

type CookingHistorySectionProps = {
  recipeTitle: string;
  history: RecipeCookingHistory;
};

export function CookingHistorySection({ recipeTitle, history }: CookingHistorySectionProps) {
  return (
    <section aria-labelledby="cooking-history-heading" className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-xl font-semibold" id="cooking-history-heading">烹饪记录</h2>
        {history.stats.totalCount === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">完成一次引导烹饪后，这里会留下你的经验</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>已做 {history.stats.totalCount} 次</span>
            {history.stats.averageRating !== null ? <span>平均 {history.stats.averageRating.toFixed(1)} 星</span> : <span>暂未评分</span>}
          </div>
        )}
      </div>

      {history.stats.latestImprovementNotes ? <p className="rounded-lg bg-accent/50 p-3 text-sm"><strong>下次注意：</strong>{history.stats.latestImprovementNotes}</p> : null}

      {history.recentRecords.length > 0 ? (
        <div className="space-y-4">
          {history.recentRecords.slice(0, 3).map((record, recordIndex) => (
            <article className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0" key={record.id}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <strong>第 {recordIndex + 1} 次</strong>
                <time dateTime={record.completedAt}>{dateFormatter.format(new Date(record.completedAt))}</time>
              </div>
              <p className="text-sm text-muted-foreground">实际份数：{record.actualServings}</p>
              {record.rating !== null ? <p aria-label={`${record.rating} 星`} className="text-sm text-amber-600">评分：{"★".repeat(record.rating)}{"☆".repeat(Math.max(0, 5 - record.rating))}</p> : null}
              {record.improvementNotes ? <p className="whitespace-pre-wrap text-sm">下次注意：{record.improvementNotes}</p> : null}
              {record.photos.length > 0 ? <div className="grid grid-cols-3 gap-2">{record.photos.map((photo, photoIndex) => photo.imageUrl ? <img alt={`${recipeTitle}第 ${recordIndex + 1} 次成品照片 ${photoIndex + 1}`} className="aspect-square w-full rounded-lg object-cover" decoding="async" height={160} key={photo.id} loading="lazy" src={photo.imageUrl} width={160} /> : null)}</div> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
