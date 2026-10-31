import type {
  LoginBody,
  AuthResponse,
  SignupBody,
  ForgotPasswordBody,
  ForgotPasswordResponse,
  ResetPasswordBody,
  MessageResponse,
  AuthUser,
} from "@brightloop/shared";
import { apiRequest } from "../../lib/apiClient.ts";

export const authApi = {
  login: (body: LoginBody): Promise<AuthResponse> =>
    apiRequest<AuthResponse>("/api/auth/login", {
      method: "POST",
      body,
    }),

  signup: (body: SignupBody): Promise<AuthResponse> =>
    apiRequest<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body,
    }),

  forgotPassword: (body: ForgotPasswordBody): Promise<ForgotPasswordResponse> =>
    apiRequest<ForgotPasswordResponse>("/api/auth/forgot-password", {
      method: "POST",
      body,
    }),

  resetPassword: (body: ResetPasswordBody): Promise<MessageResponse> =>
    apiRequest<MessageResponse>("/api/auth/reset-password", {
      method: "POST",
      body,
    }),

  getMe: (): Promise<AuthUser> =>
    apiRequest<AuthUser>("/api/auth/me", {
      method: "GET",
    }),
};

