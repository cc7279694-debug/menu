export default function AppLoading() {
  return (
    <div
      aria-label="页面加载中"
      className="mx-auto mt-12 flex min-h-48 w-full max-w-6xl items-center justify-center rounded-2xl border border-dashed bg-card text-sm text-muted-foreground animate-pulse"
      role="status"
    >
      正在加载…
    </div>
  );
}
