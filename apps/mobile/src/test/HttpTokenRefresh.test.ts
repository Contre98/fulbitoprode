import { tryRefreshHttpAuthTokens } from "@/repositories/httpTokenRefresh";
import { clearAuthTokens, getRefreshToken, setAuthTokens } from "@/repositories/httpAuthTokens";

jest.mock("@/repositories/httpAuthTokens", () => ({
  getRefreshToken: jest.fn(),
  setAuthTokens: jest.fn(),
  clearAuthTokens: jest.fn()
}));

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

describe("httpTokenRefresh", () => {
  const originalFetch = global.fetch;

  const mockedGetRefreshToken = getRefreshToken as unknown as jest.Mock<Promise<string | null>, []>;
  const mockedSetAuthTokens = setAuthTokens as unknown as jest.Mock;
  const mockedClearAuthTokens = clearAuthTokens as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("deduplicates concurrent refresh attempts and persists tokens once", async () => {
    mockedGetRefreshToken.mockResolvedValue("refresh-old");

    let resolveFetch: (value: MockResponse) => void = () => {
      throw new Error("Expected pending refresh request");
    };
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>(
      () =>
        new Promise<MockResponse>((resolve) => {
          resolveFetch = resolve;
        })
    );
    global.fetch = fetchMock as unknown as typeof global.fetch;

    const first = tryRefreshHttpAuthTokens("http://localhost:3000");
    const second = tryRefreshHttpAuthTokens("http://localhost:3000");

    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        accessToken: "access-new",
        refreshToken: "refresh-new"
      })
    });

    await expect(first).resolves.toBe(true);
    await expect(second).resolves.toBe(true);

    expect(mockedSetAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockedSetAuthTokens).toHaveBeenCalledWith({
      accessToken: "access-new",
      refreshToken: "refresh-new"
    });
    expect(mockedClearAuthTokens).not.toHaveBeenCalled();
  });

  it("does not clear stored tokens on transient refresh failures", async () => {
    mockedGetRefreshToken.mockResolvedValue("refresh-old");
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Service unavailable" })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await expect(tryRefreshHttpAuthTokens("http://localhost:3000")).resolves.toBe(false);
    expect(mockedClearAuthTokens).not.toHaveBeenCalled();
    expect(mockedSetAuthTokens).not.toHaveBeenCalled();
  });

  it("clears stored tokens only when refresh token is unauthorized", async () => {
    mockedGetRefreshToken.mockResolvedValue("refresh-old");
    const fetchMock = jest.fn<Promise<MockResponse>, [string, RequestInit | undefined]>();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" })
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    await expect(tryRefreshHttpAuthTokens("http://localhost:3000")).resolves.toBe(false);
    expect(mockedClearAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockedSetAuthTokens).not.toHaveBeenCalled();
  });
});
