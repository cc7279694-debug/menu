import { redirect } from "next/navigation";

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  void searchParams;
  redirect("/nutrition");
}
