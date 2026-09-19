import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VikunjaClient, getClient, VikunjaApiError } from "../src/vikunja-client.js";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("VikunjaClient", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    process.env.VIKUNJA_URL = "https://vikunja.example.com";
    process.env.VIKUNJA_API_TOKEN = "test-token-123";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("constructor", () => {
    it("should throw error when VIKUNJA_URL is not set", () => {
      delete process.env.VIKUNJA_URL;

      expect(() => new VikunjaClient()).toThrow(
        "VIKUNJA_URL environment variable is required"
      );
    });

    it("should throw error when VIKUNJA_API_TOKEN is not set", () => {
      delete process.env.VIKUNJA_API_TOKEN;

      expect(() => new VikunjaClient()).toThrow(
        "VIKUNJA_API_TOKEN environment variable is required"
      );
    });

    it("should remove trailing slash from base URL", () => {
      process.env.VIKUNJA_URL = "https://vikunja.example.com/";

      const client = new VikunjaClient();

      // We can verify this indirectly by making a request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({}),
      });

      client.get("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://vikunja.example.com/api/v1/test",
        expect.any(Object)
      );
    });

    it("should create client successfully with valid environment variables", () => {
      const client = new VikunjaClient();
      expect(client).toBeInstanceOf(VikunjaClient);
    });
  });

  describe("request()", () => {
    let client: VikunjaClient;

    beforeEach(() => {
      client = new VikunjaClient();
    });

    describe("HTTP methods", () => {
      it("should make GET request", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ id: 1, title: "Test" }),
        });

        const result = await client.get<{ id: number; title: string }>("/projects/1");

        expect(mockFetch).toHaveBeenCalledWith(
          "https://vikunja.example.com/api/v1/projects/1",
          {
            method: "GET",
            headers: {
              Authorization: "Bearer test-token-123",
              "Content-Type": "application/json",
            },
          }
        );
        expect(result.data).toEqual({ id: 1, title: "Test" });
      });

      it("should make POST request with body", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 201,
          headers: new Headers(),
          json: async () => ({ id: 1, title: "New Project" }),
        });

        const body = { title: "New Project" };
        const result = await client.post<{ id: number; title: string }>("/projects", body);

        expect(mockFetch).toHaveBeenCalledWith(
          "https://vikunja.example.com/api/v1/projects",
          {
            method: "POST",
            headers: {
              Authorization: "Bearer test-token-123",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
        expect(result.data).toEqual({ id: 1, title: "New Project" });
      });

      it("should make PUT request with body", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ id: 1, title: "Updated Project" }),
        });

        const body = { title: "Updated Project" };
        const result = await client.put<{ id: number; title: string }>("/projects/1", body);

        expect(mockFetch).toHaveBeenCalledWith(
          "https://vikunja.example.com/api/v1/projects/1",
          {
            method: "PUT",
            headers: {
              Authorization: "Bearer test-token-123",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
        expect(result.data).toEqual({ id: 1, title: "Updated Project" });
      });

      it("should make DELETE request", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ message: "Deleted" }),
        });

        const result = await client.delete<{ message: string }>("/projects/1");

        expect(mockFetch).toHaveBeenCalledWith(
          "https://vikunja.example.com/api/v1/projects/1",
          {
            method: "DELETE",
            headers: {
              Authorization: "Bearer test-token-123",
              "Content-Type": "application/json",
            },
          }
        );
        expect(result.data).toEqual({ message: "Deleted" });
      });

      it("should not include body for GET requests even if provided", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({}),
        });

        await client.request("GET", "/test", { body: { foo: "bar" } });

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.not.objectContaining({ body: expect.anything() })
        );
      });
    });

    describe("query parameters", () => {
      it("should append query parameters to URL", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [],
        });

        await client.get("/tasks", { page: 1, per_page: 50, s: "search term" });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://vikunja.example.com/api/v1/tasks?page=1&per_page=50&s=search+term",
          expect.any(Object)
        );
      });

      it("should filter out undefined and null query parameters", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [],
        });

        await client.get("/tasks", {
          page: 1,
          filter: undefined,
          search: null as unknown as undefined,
          empty: "",
        });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://vikunja.example.com/api/v1/tasks?page=1",
          expect.any(Object)
        );
      });

      it("should handle boolean query parameters", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [],
        });

        await client.get("/projects", { is_archived: true });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://vikunja.example.com/api/v1/projects?is_archived=true",
          expect.any(Object)
        );
      });

      it("should not append query string when no parameters provided", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [],
        });

        await client.get("/projects");

        expect(mockFetch).toHaveBeenCalledWith(
          "https://vikunja.example.com/api/v1/projects",
          expect.any(Object)
        );
      });
    });

    describe("pagination headers", () => {
      it("should parse pagination headers when present", async () => {
        const headers = new Headers();
        headers.set("x-pagination-total-pages", "5");
        headers.set("x-pagination-result-count", "100");

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers,
          json: async () => [],
        });

        const result = await client.get("/tasks");

        expect(result.pagination).toEqual({
          page: 1,
          perPage: 50,
          totalPages: 5,
          resultCount: 100,
        });
      });

      it("should not include pagination when headers are missing", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ id: 1 }),
        });

        const result = await client.get("/projects/1");

        expect(result.pagination).toBeUndefined();
      });

      it("should handle partial pagination headers", async () => {
        const headers = new Headers();
        headers.set("x-pagination-total-pages", "3");
        // x-pagination-result-count is missing

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers,
          json: async () => [],
        });

        const result = await client.get("/tasks");

        expect(result.pagination).toEqual({
          page: 1,
          perPage: 50,
          totalPages: 3,
          resultCount: null,
        });
      });
    });

    describe("error handling", () => {
      it("should throw error with API error message", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          headers: new Headers(),
          json: async () => ({ message: "Project not found" }),
        });

        await expect(client.get("/projects/999")).rejects.toThrow("Project not found");
      });

      it("should throw error with status text when no message in response", async () => {
        // 5xx errors are retried, so mock all 4 attempts (initial + 3 retries)
        const errorResponse = {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          headers: new Headers(),
          json: async () => ({}),
        };
        mockFetch
          .mockResolvedValueOnce(errorResponse)
          .mockResolvedValueOnce(errorResponse)
          .mockResolvedValueOnce(errorResponse)
          .mockResolvedValueOnce(errorResponse);

        await expect(client.get("/projects")).rejects.toThrow("500 Internal Server Error");
      });

      it("should handle non-JSON error responses", async () => {
        // 5xx errors are retried, so mock all 4 attempts
        const errorResponse = {
          ok: false,
          status: 502,
          statusText: "Bad Gateway",
          headers: new Headers(),
          json: async () => {
            throw new Error("Invalid JSON");
          },
        };
        mockFetch
          .mockResolvedValueOnce(errorResponse)
          .mockResolvedValueOnce(errorResponse)
          .mockResolvedValueOnce(errorResponse)
          .mockResolvedValueOnce(errorResponse);

        await expect(client.get("/projects")).rejects.toThrow("502 Bad Gateway");
      });

      it("should propagate network errors after retries", async () => {
        // Network errors (TypeError) are retried
        mockFetch
          .mockRejectedValueOnce(new TypeError("Network error"))
          .mockRejectedValueOnce(new TypeError("Network error"))
          .mockRejectedValueOnce(new TypeError("Network error"))
          .mockRejectedValueOnce(new TypeError("Network error"));

        await expect(client.get("/projects")).rejects.toThrow("Network error");
      });

      it("should not retry non-network errors", async () => {
        // Regular errors (not TypeError) are not retried
        mockFetch.mockRejectedValueOnce(new Error("Some other error"));

        await expect(client.get("/projects")).rejects.toThrow("Some other error");
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it("should handle 401 unauthorized", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          headers: new Headers(),
          json: async () => ({ message: "Invalid or expired token" }),
        });

        await expect(client.get("/projects")).rejects.toThrow("Invalid or expired token");
      });

      it("should handle 403 forbidden", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          headers: new Headers(),
          json: async () => ({ message: "You don't have access to this resource" }),
        });

        await expect(client.get("/projects/1")).rejects.toThrow(
          "You don't have access to this resource"
        );
      });

      it("should throw VikunjaApiError with status code and endpoint", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          headers: new Headers(),
          json: async () => ({ message: "Project not found" }),
        });

        try {
          await client.get("/projects/999");
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(VikunjaApiError);
          const apiError = error as VikunjaApiError;
          expect(apiError.statusCode).toBe(404);
          expect(apiError.endpoint).toBe("/projects/999");
          expect(apiError.method).toBe("GET");
          expect(apiError.message).toBe("Project not found");
          expect(apiError.suggestion).toBe(
            "The requested resource does not exist or has been deleted"
          );
        }
      });

      it("should include suggestion for 401 unauthorized", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          headers: new Headers(),
          json: async () => ({ message: "Token expired" }),
        });

        try {
          await client.get("/projects");
          expect.fail("Should have thrown an error");
        } catch (error) {
          expect(error).toBeInstanceOf(VikunjaApiError);
          const apiError = error as VikunjaApiError;
          expect(apiError.suggestion).toBe(
            "Check that your VIKUNJA_API_TOKEN is valid and not expired"
          );
        }
      });

      it("should provide detailed error string via toDetailedString()", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          headers: new Headers(),
          json: async () => ({ message: "Task not found" }),
        });

        try {
          await client.get("/tasks/123");
          expect.fail("Should have thrown an error");
        } catch (error) {
          const apiError = error as VikunjaApiError;
          const detailed = apiError.toDetailedString();
          expect(detailed).toBe(
            "[GET /tasks/123] 404: Task not found (The requested resource does not exist or has been deleted)"
          );
        }
      });
    });

    describe("empty responses", () => {
      it("should handle 204 No Content response", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 204,
          headers: new Headers(),
          json: async () => {
            throw new Error("No content");
          },
        });

        const result = await client.delete("/projects/1");

        expect(result.data).toEqual({});
      });

      it("should handle response with content-length 0", async () => {
        const headers = new Headers();
        headers.set("content-length", "0");

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers,
          json: async () => {
            throw new Error("No content");
          },
        });

        const result = await client.delete("/tasks/1");

        expect(result.data).toEqual({});
      });
    });

    describe("binary responses", () => {
      it("should return raw bytes, content type and filename", async () => {
        const headers = new Headers();
        headers.set("content-type", "image/png");
        headers.set("content-disposition", 'attachment; filename="shot.png"');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers,
          arrayBuffer: async () => new TextEncoder().encode("PNGDATA").buffer,
        });

        const result = await client.getBinary("/tasks/1/attachments/3", { preview_size: "md" });

        expect(mockFetch).toHaveBeenCalledWith(
          "https://vikunja.example.com/api/v1/tasks/1/attachments/3?preview_size=md",
          expect.objectContaining({ method: "GET" })
        );
        expect(result.data.buffer.toString()).toBe("PNGDATA");
        expect(result.data.contentType).toBe("image/png");
        expect(result.data.filename).toBe("shot.png");
      });
    });

    describe("retry logic", () => {
      it("should retry on 5xx errors and succeed", async () => {
        // First two attempts fail with 503, third succeeds
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers(),
            json: async () => ({}),
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers(),
            json: async () => ({}),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ id: 1, title: "Success" }),
          });

        const result = await client.get<{ id: number; title: string }>("/projects/1");

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(result.data).toEqual({ id: 1, title: "Success" });
      });

      it("should retry on 429 rate limit errors", async () => {
        // First attempt rate limited, second succeeds
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
            headers: new Headers(),
            json: async () => ({ message: "Rate limit exceeded" }),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ success: true }),
          });

        const result = await client.get<{ success: boolean }>("/test");

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.data).toEqual({ success: true });
      });

      it("should retry on network errors (TypeError) and succeed", async () => {
        // First attempt fails with network error, second succeeds
        mockFetch
          .mockRejectedValueOnce(new TypeError("Failed to fetch"))
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(),
            json: async () => ({ recovered: true }),
          });

        const result = await client.get<{ recovered: boolean }>("/test");

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.data).toEqual({ recovered: true });
      });

      it("should not retry on 4xx client errors", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          headers: new Headers(),
          json: async () => ({ message: "Invalid input" }),
        });

        await expect(client.get("/projects")).rejects.toThrow("Invalid input");
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it("should not retry on 404 not found", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: "Not Found",
          headers: new Headers(),
          json: async () => ({ message: "Resource not found" }),
        });

        await expect(client.get("/projects/999")).rejects.toThrow("Resource not found");
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe("authentication", () => {
      it("should include Bearer token in Authorization header", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({}),
        });

        await client.get("/projects");

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: "Bearer test-token-123",
            }),
          })
        );
      });

      it("should include Content-Type header", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({}),
        });

        await client.get("/projects");

        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              "Content-Type": "application/json",
            }),
          })
        );
      });
    });
  });
});

describe("getClient()", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    // We need to reset the module to clear the singleton
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.VIKUNJA_URL = "https://vikunja.example.com";
    process.env.VIKUNJA_API_TOKEN = "test-token-123";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return a VikunjaClient instance", async () => {
    // Re-import to get fresh singleton with fresh class reference
    const { getClient: freshGetClient, VikunjaClient: FreshVikunjaClient } = await import(
      "../src/vikunja-client.js"
    );
    const client = freshGetClient();
    expect(client).toBeInstanceOf(FreshVikunjaClient);
  });

  it("should return the same instance on subsequent calls", async () => {
    // Re-import to get fresh singleton
    const { getClient: freshGetClient } = await import("../src/vikunja-client.js");
    const client1 = freshGetClient();
    const client2 = freshGetClient();
    expect(client1).toBe(client2);
  });
});
