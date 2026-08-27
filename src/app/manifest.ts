import type { MetadataRoute } from "next";

import { PROJECT_META } from "@/lib/project-meta";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PROJECT_META.name,
    short_name: PROJECT_META.shortName,
    description: PROJECT_META.description,
    start_url: "/recipes",
    scope: "/",
    display: "standalone",
    lang: "zh-CN",
    theme_color: "#27231f",
    background_color: "#faf8f3",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
