export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  public constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

interface ErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

function isErrorPayload(payload: unknown): payload is ErrorPayload {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const record = payload as Record<string, unknown>;
  const errorObj = record["error"];
  if (typeof errorObj !== "object" || errorObj === null) {
    return false;
  }
  const err = errorObj as Record<string, unknown>;
  return typeof err["code"] === "string" && typeof err["message"] === "string";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers: customHeaders, ...restOptions } = options;

  const headers = new Headers(customHeaders);
  if (!headers.has("Content-Type") && body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (currentToken !== null && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${currentToken}`);
  }

  const fetchInit: RequestInit = {
    ...restOptions,
    headers,
  };

  if (body !== undefined) {
    fetchInit.body = JSON.stringify(body);
  }

  const response = await fetch(path, fetchInit);

  if (!response.ok) {
    let errorCode = "UNKNOWN_ERROR";
    let errorMessage = response.statusText;

    try {
      const payload: unknown = await response.json();
      if (isErrorPayload(payload)) {
        errorCode = payload.error.code;
        errorMessage = payload.error.message;
      }
    } catch {
      void 0;
    }

    throw new ApiError(errorCode, errorMessage, response.status);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const data: unknown = await response.json();
  return data as T;
}
