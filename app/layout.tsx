import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DialogProvider } from "@/features/dashboard/components/DialogProvider";
import { AppRuntime } from "@/features/pwa/AppRuntime";

export const metadata: Metadata = {
  title: "INARI Tours | Operations",
  description: "Your operations workspace.",
  appleWebApp: { capable: true, title: "INARI", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

// Edge to edge on phones (the tab bar keeps clear of the home indicator with
// the safe-area insets); the status bar takes the app's colour.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f4f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The class is added before React hydrates, hence suppressHydrationWarning.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Chrome on iOS gets its own fixes in globals.css (html.crios), before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: `if(/CriOS/.test(navigator.userAgent))document.documentElement.classList.add("crios")` }} />
      </head>
      <body>
        <AppRuntime />
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}