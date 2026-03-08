import { validateAndNormalizeProfileForm } from "@/screens/profileValidation";

describe("Profile validation parity with /api/auth/me", () => {
  it("normalizes and accepts a valid payload", () => {
    const result = validateAndNormalizeProfileForm({
      name: "  QA User  ",
      username: "@qa.user-01",
      email: "QA.USER@Example.com "
    });

    expect(result.error).toBeNull();
    expect(result.value).toEqual({
      name: "QA User",
      username: "qa.user-01",
      email: "qa.user@example.com"
    });
  });

  it("rejects name longer than 120 chars", () => {
    const result = validateAndNormalizeProfileForm({
      name: "a".repeat(121),
      username: "qauser",
      email: "qa@example.com"
    });
    expect(result.error).toBe("El nombre no puede superar 120 caracteres.");
  });

  it("rejects empty or invalid username", () => {
    expect(
      validateAndNormalizeProfileForm({
        name: "QA",
        username: "@@@",
        email: "qa@example.com"
      }).error
    ).toBe("Ingresá un username válido.");

    expect(
      validateAndNormalizeProfileForm({
        name: "QA",
        username: "qa user",
        email: "qa@example.com"
      }).error
    ).toBe("El username solo puede incluir letras, números, punto, guion bajo y guion.");
  });

  it("rejects username longer than 40 chars", () => {
    const result = validateAndNormalizeProfileForm({
      name: "QA",
      username: "a".repeat(41),
      email: "qa@example.com"
    });
    expect(result.error).toBe("El username no puede superar 40 caracteres.");
  });

  it("rejects invalid email format and max length", () => {
    expect(
      validateAndNormalizeProfileForm({
        name: "QA",
        username: "qa",
        email: "qa-at-example.com"
      }).error
    ).toBe("Ingresá un email válido.");

    expect(
      validateAndNormalizeProfileForm({
        name: "QA",
        username: "qa",
        email: `${"a".repeat(191)}@x.com`
      }).error
    ).toBe("El email no puede superar 190 caracteres.");
  });
});
