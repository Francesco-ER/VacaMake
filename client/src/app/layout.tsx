import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { SocketProvider } from "@/context/SocketContext";
import "@/styles/globals.scss";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "VacaMake — Divide la cuenta en tiempo real",
  description: "La PWA definitiva para dividir cuentas de restaurantes en tiempo real de forma fácil, rápida y sin matemáticas complicadas. Diseñada para Latinoamérica.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VacaMake",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${outfit.variable} ${jakarta.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body 
        className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white"
        suppressHydrationWarning
      >
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}

