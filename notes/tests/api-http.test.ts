import { describe, expect, it } from "vitest";
import { jsonResponse, ok, noContent } from "@/lib/api/response";
import { errorResponse } from "@/lib/api/errors";
import { AppError } from "@/lib/domain/errors";

describe("response envelope", () => {
  it("returns data + meta and private cache headers", async () => {
    const response = jsonResponse(ok({ id: "n1" }, { total: 1 }), "rid");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBe("rid");
    await expect(response.json()).resolves.toEqual({
      data: { id: "n1" },
      meta: { total: 1 },
    });
  });

  it("returns 204 without a body or content type", async () => {
    const response = jsonResponse(noContent(), "rid");
    expect(response.status).toBe(204);
    expect(response.headers.get("content-type")).toBeNull();
  });
});

describe("error envelope", () => {
  it("maps validation errors to 400 with details", async () => {
    const response = errorResponse(
      new AppError("validation_error", "Bad input.", {
        fieldErrors: { title: ["Required."] },
      }),
      "rid",
      { method: "POST", path: "/api/v1/notes" },
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
    expect(body.error.requestId).toBe("rid");
    expect(body.error.details.fieldErrors.title).toEqual(["Required."]);
  });

  it("hides unexpected errors and keeps the request id", async () => {
    const response = errorResponse(new Error("database exploded"), "rid", {
      method: "GET",
      path: "/api/v1/notes",
    });
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).not.toContain("database exploded");
    expect(body.error.requestId).toBe("rid");
  });

  it("maps suspension to 403 account_suspended", async () => {
    const response = errorResponse(
      new AppError("account_suspended", "Your account is suspended."),
      "rid",
      { method: "GET", path: "/api/v1/notes" },
    );
    expect(response.status).toBe(403);
  });
});
