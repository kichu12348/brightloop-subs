import type { ErrorCode } from "@brightloop/shared";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;

  public constructor(code: ErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode ?? getStatusCodeForErrorCode(code);
  }
}

export function getStatusCodeForErrorCode(code: ErrorCode): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "INVALID_TRANSITION":
      return 409;
    case "PLAN_RULE_VIOLATION":
      return 422;
    case "DISCOUNT_EXHAUSTED":
      return 422;
    case "DISCOUNT_INELIGIBLE":
      return 422;
    case "OVERPAYMENT":
      return 422;
    case "INTERNAL_ERROR":
      return 500;
    default: {
      const exhaustiveCheck: never = code;
      throw new Error(`Unhandled error code: ${String(exhaustiveCheck)}`);
    }
  }
}

