"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, UserRound } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setMessage(null);
    try {
      const endpoint = mode === "login" ? "/api/auth/login-password" : "/api/auth/register-password";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { name } : {})
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo autenticar.");
      }

      router.replace("/pronosticos");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto flex h-dvh w-full max-w-[469px] flex-col overflow-hidden bg-[radial-gradient(circle_at_20%_0%,#1f3a2a_0%,#0b0b0d_55%,#060607_100%)] px-5 py-7 text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(204,255,0,0.14)_0%,rgba(204,255,0,0)_100%)]" />

      <section className="relative z-10 mb-6 rounded-[18px] border border-[#2a2f1f] bg-[#0f120f]/95 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
        <p className="text-[11px] font-semibold tracking-[1.2px] text-[var(--accent)]">FULBITO PRODE</p>
        <h1 className="mt-2 text-[29px] font-black leading-[1.05]">Entrá y jugá tu fecha.</h1>
        <p className="mt-2 text-[12px] text-[var(--text-secondary)]">Elegí resultados, competí con tu grupo y seguí la tabla en vivo.</p>
      </section>

      <section className="relative z-10 flex-1 rounded-[18px] border border-[var(--border-dim)] bg-[#0b0b0d]/95 p-4">
        <div className="grid grid-cols-2 gap-2 rounded-[12px] border border-[var(--border-dim)] bg-[#111316] p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`h-10 rounded-[9px] text-[12px] font-bold transition-colors ${
              mode === "login"
                ? "bg-[var(--accent)] text-black"
                : "bg-transparent text-[var(--text-secondary)]"
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`h-10 rounded-[9px] text-[12px] font-bold transition-colors ${
              mode === "register"
                ? "bg-[var(--accent)] text-black"
                : "bg-transparent text-[var(--text-secondary)]"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {mode === "register" ? (
            <label className="flex items-center gap-2 rounded-[11px] border border-[var(--border-light)] bg-[#121417] px-3">
              <UserRound size={16} className="text-[var(--text-secondary)]" />
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nombre"
                className="h-11 w-full bg-transparent text-[13px] font-semibold outline-none"
              />
            </label>
          ) : null}

          <label className="flex items-center gap-2 rounded-[11px] border border-[var(--border-light)] bg-[#121417] px-3">
            <Mail size={16} className="text-[var(--text-secondary)]" />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              type="email"
              className="h-11 w-full bg-transparent text-[13px] font-semibold outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-[11px] border border-[var(--border-light)] bg-[#121417] px-3">
            <LockKeyhole size={16} className="text-[var(--text-secondary)]" />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña"
              type="password"
              className="h-11 w-full bg-transparent text-[13px] font-semibold outline-none"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={loading || !email || !password || (mode === "register" && !name.trim())}
          onClick={submit}
          className="mt-4 h-11 w-full rounded-[11px] bg-[var(--accent)] text-[13px] font-black text-black disabled:opacity-60"
        >
          {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
        </button>

        {message ? <p className="mt-3 text-[11px] text-red-400">{message}</p> : null}
      </section>
    </main>
  );
}
