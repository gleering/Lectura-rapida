import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  applicationName: "ReadFlow",
  title: "ReadFlow — Aprende de verdad",
  description:
    "Plataforma para comprender, recordar y aplicar lo que lees: RSVP, repaso espaciado, tutor y mapas mentales.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ReadFlow",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
