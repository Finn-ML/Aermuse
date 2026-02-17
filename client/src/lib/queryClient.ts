import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Global fetch interceptor: adds X-Requested-With header to all /api requests for CSRF protection
const originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (url.startsWith('/api')) {
    const headers = new Headers(init?.headers);
    if (!headers.has('X-Requested-With')) {
      headers.set('X-Requested-With', 'XMLHttpRequest');
    }
    return originalFetch(input, { ...init, headers });
  }
  return originalFetch(input, init);
};

/**
 * Custom error class for API errors with structured data
 */
export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(status: number, message: string, details?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /**
   * Returns a user-friendly error message, including details if available
   */
  getUserMessage(): string {
    if (this.details && this.details.length > 0) {
      return this.details.join('\n• ');
    }
    return this.message;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();

    // Try to parse as JSON to extract structured error info
    try {
      const json = JSON.parse(text);
      const errorMessage = json.error || json.message || res.statusText;
      const details = json.details as string[] | undefined;
      throw new ApiError(res.status, errorMessage, details);
    } catch (e) {
      // If JSON parsing failed, throw with original text
      if (e instanceof ApiError) {
        throw e;
      }
      throw new ApiError(res.status, text || res.statusText);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data
      ? { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" }
      : { "X-Requested-With": "XMLHttpRequest" },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
