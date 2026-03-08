"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, RefreshCw, Trophy, User } from "lucide-react";
import { useAuthSession } from "@/lib/use-auth-session";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

function validateFields(mode: "login" | "signup", name: string, email: string, password: string): FieldErrors {
  const next: FieldErrors = {};
  if (mode === "signup" && !name.trim()) {
    next.name = "Ingresá tu nombre.";
  }

  if (!email.trim()) {
    next.email = "Ingresá tu email.";
  } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    next.email = "Email inválido.";
  }

  if (!password) {
    next.password = "Ingresá una contraseña.";
  } else if (mode === "signup" && password.length < 8) {
    next.password = "Mínimo 8 caracteres.";
  }

  return next;
}

export default function AuthPage() {
  const router = useRouter();
  const { refresh } = useAuthSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function submit() {
    const validation = validateFields(mode, name, email, password);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const endpoint = mode === "login" ? "/api/auth/login-password" : "/api/auth/register-password";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(mode === "signup" ? { name } : {})
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
      setIsLoading(false);
    }
  }

  function setAuthMode(nextMode: "login" | "signup") {
    setMode(nextMode);
    setErrors({});
    setMessage(null);
    setForgotMessage(null);
  }

  async function submitForgotPassword() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrors((prev) => ({ ...prev, email: "Ingresá tu email." }));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setErrors((prev) => ({ ...prev, email: "Email inválido." }));
      return;
    }

    setForgotLoading(true);
    setForgotMessage(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail })
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "No se pudo iniciar la recuperación.");
      }
      setForgotMessage(payload?.message || "Si existe una cuenta para ese email, enviamos las instrucciones.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar la recuperación.");
    } finally {
      setForgotLoading(false);
    }
  }

  function inputClass(error?: string) {
    const focusClass = error
      ? "border-[var(--status-danger-border)] focus:border-[var(--danger)] focus:ring-4 focus:ring-[var(--status-danger-bg)]"
      : "border-[var(--border-subtle)] focus:border-[var(--accent-primary)] focus:ring-4 focus:ring-[var(--accent-soft)]";

    return `w-full bg-[var(--surface-card-muted)] border rounded-xl py-3.5 pl-12 pr-4 font-bold text-[var(--text-primary)] focus:outline-none transition-all placeholder:font-medium placeholder:text-[var(--text-muted)] ${focusClass}`;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--surface-page)] px-3 py-4">
      <div className="relative flex min-h-[calc(100dvh-28px)] w-full max-w-[740px] flex-col overflow-hidden rounded-[54px] border-[12px] border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_8px_22px_rgba(0,0,0,0.2)]">
        <div className="pointer-events-none absolute right-0 top-0 bottom-[130px] w-[68px] bg-[var(--accent-soft)]" />

        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col justify-center px-8 overflow-y-auto no-scrollbar">
            <div className="mb-10 text-center">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--bg-surface-2)] shadow-[0_18px_34px_var(--accent-soft)]">
                <Trophy size={40} className="text-[var(--accent-primary)]" strokeWidth={2.5} />
              </div>

              <h1 className="mb-2 text-4xl font-black uppercase italic tracking-tighter text-[var(--text-primary)]">
                Fulbito<span className="text-[var(--accent-primary)]">Prode</span>
              </h1>

              <p className="text-sm font-medium text-[var(--text-muted)]">
                {mode === "login" ? "¡Bienvenido de nuevo, crack!" : "Únete y demostrá cuánto sabes de fútbol"}
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
              className="w-full space-y-4"
            >
              {mode === "signup" ? (
                <div className="relative">
                  <User className="absolute left-4 top-3.5 text-[var(--text-muted)]" size={20} />
                  <label htmlFor="auth-name" className="sr-only">
                    Nombre completo
                  </label>
                  <input
                    id="auth-name"
                    required
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nombre completo"
                    className={inputClass(errors.name)}
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name ? <p className="pl-1 pt-1 text-xs font-semibold text-[var(--danger)]">{errors.name}</p> : null}
                </div>
              ) : null}

              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-[var(--text-muted)]" size={20} />
                <label htmlFor="auth-email" className="sr-only">
                  Correo electrónico
                </label>
                <input
                  id="auth-email"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Correo electrónico"
                  className={inputClass(errors.email)}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email ? <p className="pl-1 pt-1 text-xs font-semibold text-[var(--danger)]">{errors.email}</p> : null}
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-[var(--text-muted)]" size={20} />
                <label htmlFor="auth-password" className="sr-only">
                  Contraseña
                </label>
                <input
                  id="auth-password"
                  required
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Contraseña"
                  className={inputClass(errors.password)}
                  aria-invalid={Boolean(errors.password)}
                />
                {errors.password ? <p className="pl-1 pt-1 text-xs font-semibold text-[var(--danger)]">{errors.password}</p> : null}
              </div>

              {mode === "login" ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => void submitForgotPassword()}
                    disabled={forgotLoading || isLoading}
                    className="text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {forgotLoading ? "Enviando..." : "¿Olvidaste tu contraseña?"}
                  </button>
                </div>
              ) : null}

              {message ? (
                <p className="rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-xs font-semibold text-[var(--danger)]">
                  {message}
                </p>
              ) : null}
              {forgotMessage ? (
                <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  {forgotMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] py-4 font-black text-[var(--text-on-accent)] shadow-[0_12px_24px_var(--accent-soft)] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 hover:brightness-95"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={20} /> : mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
              </button>
            </form>
          </div>

          <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-card)] py-8 text-center">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {mode === "login" ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
              <button
                type="button"
                onClick={() => setAuthMode(mode === "login" ? "signup" : "login")}
                className="ml-2 font-bold text-[var(--accent-primary)] hover:underline"
              >
                {mode === "login" ? "Registrate" : "Inicia Sesión"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
