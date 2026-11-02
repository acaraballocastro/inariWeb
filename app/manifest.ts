import type { MetadataRoute } from "next";

// Lets the workspace be installed on the home screen (an iPhone only receives
// push notifications in that case).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "INARI Tours · Operations",
    short_name: "INARI",
    description: "Your operations workspace.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f1f0ec",
    theme_color: "#292b26",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
