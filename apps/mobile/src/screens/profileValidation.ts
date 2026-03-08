const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ProfileFormInput {
  name: string;
  username: string;
  email: string;
}

export interface NormalizedProfileFormInput {
  name: string;
  username: string;
  email: string;
}

export function validateAndNormalizeProfileForm(input: ProfileFormInput): {
  value: NormalizedProfileFormInput | null;
  error: string | null;
} {
  const name = input.name.trim();
  const username = input.username.trim().replace(/^@+/, "");
  const email = input.email.trim().toLowerCase();

  if (!name) {
    return { value: null, error: "Ingresá un nombre válido." };
  }
  if (name.length > 120) {
    return { value: null, error: "El nombre no puede superar 120 caracteres." };
  }

  if (!username) {
    return { value: null, error: "Ingresá un username válido." };
  }
  if (username.length > 40) {
    return { value: null, error: "El username no puede superar 40 caracteres." };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      value: null,
      error: "El username solo puede incluir letras, números, punto, guion bajo y guion."
    };
  }

  if (!email) {
    return { value: null, error: "Ingresá un email válido." };
  }
  if (email.length > 190) {
    return { value: null, error: "El email no puede superar 190 caracteres." };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { value: null, error: "Ingresá un email válido." };
  }

  return {
    value: { name, username, email },
    error: null
  };
}
