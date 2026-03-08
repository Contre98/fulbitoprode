import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_KEY = "fulbito.mobile.auth.accessToken";
const REFRESH_TOKEN_KEY = "fulbito.mobile.auth.refreshToken";

interface TokenState {
  hydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
}

const tokenState: TokenState = {
  hydrated: false,
  accessToken: null,
  refreshToken: null
};

async function hydrate() {
  if (tokenState.hydrated) {
    return;
  }

  try {
    const [accessToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem(ACCESS_TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY)
    ]);

    tokenState.accessToken = accessToken?.trim() || null;
    tokenState.refreshToken = refreshToken?.trim() || null;
  } catch {
    tokenState.accessToken = null;
    tokenState.refreshToken = null;
  } finally {
    tokenState.hydrated = true;
  }
}

export async function getAccessToken() {
  await hydrate();
  return tokenState.accessToken;
}

export async function getRefreshToken() {
  await hydrate();
  return tokenState.refreshToken;
}

export async function setAuthTokens(input: { accessToken?: string | null; refreshToken?: string | null }) {
  await hydrate();

  if (typeof input.accessToken === "string") {
    const next = input.accessToken.trim() || null;
    tokenState.accessToken = next;
    if (next) {
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, next);
    } else {
      await AsyncStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  if (typeof input.refreshToken === "string") {
    const next = input.refreshToken.trim() || null;
    tokenState.refreshToken = next;
    if (next) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, next);
    } else {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
}

export async function clearAuthTokens() {
  await hydrate();
  tokenState.accessToken = null;
  tokenState.refreshToken = null;
  await Promise.all([AsyncStorage.removeItem(ACCESS_TOKEN_KEY), AsyncStorage.removeItem(REFRESH_TOKEN_KEY)]);
}
