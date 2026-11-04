import type { Metadata } from "next";
import "./globals.css";
import { DialogProvider } from "@/features/dashboard/components/DialogProvider";

export const metadata: Metadata = {
  title: "INARI Tours | Operations",
  description: "Your operations workspace.",
  appleWebApp: { capable: true, title: "INARI", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}