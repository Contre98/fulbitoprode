import type { Metadata } from "next";
import { Archivo, JetBrains_Mono, Manrope } from "next/font/google";
import "@/app/globals.css";
import { AuthSessionProvider } from "@/lib/use-auth-session";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["500", "600", "700", "800"]
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["500", "600", "700"]
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["800", "900"]
});

export const metadata: Metadata = {
  title: "Fulbito Prode",
  description: "Social sports prediction app"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${manrope.variable} ${jetbrainsMono.variable} ${archivo.variable}`}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
