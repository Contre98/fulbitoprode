"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuthSession } from "@/lib/use-auth-session";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validateFields(mode: "login" | "register", name: string, email: string, password: string): FieldErrors {
  const next: FieldErrors = {};
  if (mode === "register" && !name.trim()) {
    next.name = "Ingresá tu nombre.";
  }

  if (!email.trim()) {
    next.email = "Ingresá tu email.";
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    next.email = "Email inválido.";
  }

  if (!password) {
    next.password = "Ingresá una contraseña.";
  } else if (mode === "register" && password.length < 8) {
    next.password = "Mínimo 8 caracteres.";
  }

  return next;
}

export default function AuthPage() {
  const router = useRouter();
  const { refresh } = useAuthSession();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const fieldErrors = useMemo(() => validateFields(mode, name, email, password), [mode, name, email, password]);
  const canSubmit = Object.keys(fieldErrors).length === 0;

  async function submit() {
    const validation = validateFields(mode, name, email, password);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

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

      await refresh();
      router.replace("/pronosticos");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[469px] flex-col bg-[radial-gradient(circle_at_5%_0%,rgba(204,255,0,0.14),transparent_40%),var(--bg-app)] px-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-6 text-[var(--text-primary)]">
      <section className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[1.4px] text-[var(--accent-primary)]">FULBITO PRODE</p>
        <h1 className="mt-2 text-[30px] font-black leading-[1.03]">Entrá y competí en cada fecha.</h1>
        <p className="mt-2 text-[12px] text-[var(--text-secondary)]">Resultados, ranking en vivo y grupos privados con tus amigos.</p>
      </section>

      <section className="mt-3 flex flex-1 flex-col rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-surface-1)] p-4">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-2)] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setErrors({});
            }}
            className={`min-h-11 rounded-xl text-[12px] font-bold transition-colors ${
              mode === "login" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-secondary)]"
            }`}
          >
            Ingresar
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setErrors({});
            }}
            className={`min-h-11 rounded-xl text-[12px] font-bold transition-colors ${
              mode === "register" ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-secondary)]"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {mode === "register" ? (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Nombre</span>
              <div className={`flex items-center gap-2 rounded-xl border px-3 ${errors.name ? "border-[var(--danger)]" : "border-[var(--border-subtle)]"} bg-[var(--bg-surface-2)]`}>
                <UserRound size={16} className="text-[var(--text-secondary)]" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre"
                  className="h-12 w-full bg-transparent text-[14px] font-semibold outline-none"
                />
              </div>
              {errors.name ? <span className="text-[11px] text-[var(--danger)]">{errors.name}</span> : null}
            </label>
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Email</span>
            <div className={`flex items-center gap-2 rounded-xl border px-3 ${errors.email ? "border-[var(--danger)]" : "border-[var(--border-subtle)]"} bg-[var(--bg-surface-2)]`}>
              <Mail size={16} className="text-[var(--text-secondary)]" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@email.com"
                type="email"
                className="h-12 w-full bg-transparent text-[14px] font-semibold outline-none"
              />
            </div>
            {errors.email ? <span className="text-[11px] text-[var(--danger)]">{errors.email}</span> : null}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Contraseña</span>
            <div className={`flex items-center gap-2 rounded-xl border px-3 ${errors.password ? "border-[var(--danger)]" : "border-[var(--border-subtle)]"} bg-[var(--bg-surface-2)]`}>
              <LockKeyhole size={16} className="text-[var(--text-secondary)]" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Contraseña"
                type="password"
                className="h-12 w-full bg-transparent text-[14px] font-semibold outline-none"
              />
            </div>
            {errors.password ? <span className="text-[11px] text-[var(--danger)]">{errors.password}</span> : null}
          </label>
        </div>

        {message ? (
          <p className="mt-3 rounded-xl border border-[rgba(255,107,125,0.35)] bg-[rgba(255,107,125,0.12)] px-3 py-2 text-[11px] text-[var(--danger)]">
            {message}
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          <button
            type="button"
            disabled={loading || !canSubmit}
            onClick={() => void submit()}
            className="h-12 w-full rounded-xl bg-[var(--accent-primary)] text-[14px] font-bold text-[var(--text-on-accent)] disabled:opacity-60"
          >
            {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </div>
      </section>
    </main>
  );
}
