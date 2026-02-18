import type { Metadata } from "next";
import "@/app/globals.css";
import { AuthSessionProvider } from "@/lib/use-auth-session";
import { ThemeProvider } from "@/lib/use-theme";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "Fulbito Prode",
  description: "Social sports prediction app"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark">
      <body className="font-sans">
        <ThemeProvider>
          <AuthSessionProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
