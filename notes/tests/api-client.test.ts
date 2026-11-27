import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  apiFetch,
  fieldErrorsOf,
  messageFor,
} from "@/lib/api-client/http";

function mockFetch(response: Response) {
  vi.stubGlobal("fetch", vi.fn(async () => response));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("unwraps the data envelope", async () => {
    mockFetch(
      Response.json({ data: { id: "n1" }, meta: { total: 1 } }, { status: 200 }),
    );
    await expect(apiFetch<{ id: string }>("/notes/n1")).resolves.toEqual({
      id: "n1",
    });
  });

  it("sends same-origin credentials and JSON content type", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ data: { ok: true } }, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/notes", { method: "POST", body: JSON.stringify({}) });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.credentials).toBe("same-origin");
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
  });

  it("throws a typed error with code, status and field errors", async () => {
    mockFetch(
      Response.json(
        {
          error: {
            code: "validation_error",
            message: "The request body is invalid.",
            details: { fieldErrors: { title: ["Add a title."] } },
            requestId: "rid",
          },
        },
        { status: 400 },
      ),
    );

    const error = (await apiFetch("/notes", { method: "POST" }).catch(
      (e) => e,
    )) as ApiClientError;
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.status).toBe(400);
    expect(error.code).toBe("validation_error");
    expect(fieldErrorsOf(error)).toEqual({ title: ["Add a title."] });
  });

  it("returns undefined for 204", async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(apiFetch("/notes/n1", { method: "DELETE" })).resolves.toBeUndefined();
  });

  it("maps auth and suspension failures to stable messages", () => {
    expect(messageFor(new ApiClientError("unauthenticated", "x", 401), "fallback")).toBe(
      "You need to be logged in to do that.",
    );
    expect(messageFor(new ApiClientError("account_suspended", "x", 403), "fallback")).toBe(
      "Your account is suspended.",
    );
    expect(messageFor(new Error("network"), "fallback")).toBe("fallback");
  });
});
