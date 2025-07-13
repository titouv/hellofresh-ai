import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HelloFresh AI",
    short_name: "HelloFresh AI",
    description: "HelloFresh AI",
    start_url: "/",
    display: "standalone",
    background_color: "#fff",
    theme_color: "#fff",
    icons: [
      { type: "image/png", sizes: "192x192", src: "/favicon-192x192.png" },
    ],
  };
}
