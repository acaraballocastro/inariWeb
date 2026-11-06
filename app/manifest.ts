import type { MetadataRoute } from "next";

// Lets the workspace be installed on the home screen (an iPhone only receives
// push notifications in that case).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "INARI Tours · Operations",
    short_name: "INARI",
    description: "Your operations workspace.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f0ec",
    theme_color: "#f5f4f0",
    icons: [
      { src: "/icons/fox-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/fox-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/fox-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Long-press on the icon.
    shortcuts: [
      { name: "Notifications", url: "/notifications", icons: [{ src: "/icons/fox-icon-192.png", sizes: "192x192" }] },
      { name: "Profile", url: "/profile", icons: [{ src: "/icons/fox-icon-192.png", sizes: "192x192" }] },
    ],
  };
}
