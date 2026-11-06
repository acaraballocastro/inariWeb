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
    <html lang="en">
      <body>
        <AppRuntime />
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}