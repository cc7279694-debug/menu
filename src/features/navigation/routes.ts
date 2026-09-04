import { BookOpen, CalendarDays, ChartNoAxesCombined, Settings, ShoppingBasket } from "lucide-react";

export const RECIPE_IMPORT_ROUTE = "/recipes/import";

export const APP_ROUTES = [
  { href: "/recipes", label: "菜谱", icon: BookOpen },
  { href: "/plan", label: "计划", icon: CalendarDays },
  { href: "/shopping", label: "购物", icon: ShoppingBasket },
  { href: "/nutrition", label: "营养", icon: ChartNoAxesCombined },
  { href: "/settings", label: "设置", icon: Settings },
] as const;
