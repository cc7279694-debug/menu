import { BookOpen, Heart, Settings, ShoppingBasket } from "lucide-react";

export const RECIPE_IMPORT_ROUTE = "/recipes/import";

export const APP_ROUTES = [
  { href: "/recipes", label: "菜谱", icon: BookOpen },
  { href: "/shopping", label: "购物", icon: ShoppingBasket },
  { href: "/favorites", label: "收藏", icon: Heart },
  { href: "/settings", label: "设置", icon: Settings },
] as const;
