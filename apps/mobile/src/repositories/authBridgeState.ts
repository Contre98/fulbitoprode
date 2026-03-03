let useHttpSession = false;

export function setUseHttpSession(next: boolean) {
  useHttpSession = next;
}

export function canUseHttpSession() {
  return useHttpSession;
}
