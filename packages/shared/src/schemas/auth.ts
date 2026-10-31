import { Type, type Static } from "@sinclair/typebox";
import { Role } from "../enums.ts";

export const EmailSchema = Type.String({ format: "email" });
export type Email = Static<typeof EmailSchema>;

export const PASSWORD_PATTERN =
  "^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$";

export const PasswordSchema = Type.String({
  minLength: 9,
  pattern: PASSWORD_PATTERN,
});
export type Password = Static<typeof PasswordSchema>;

export const SignupBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    email: EmailSchema,
    password: PasswordSchema,
  },
  { additionalProperties: false },
);
export type SignupBody = Static<typeof SignupBodySchema>;

export const LoginBodySchema = Type.Object(
  {
    email: EmailSchema,
    password: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);
export type LoginBody = Static<typeof LoginBodySchema>;

export const AuthUserSchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    email: Type.String(),
    role: Type.Union([
      Type.Literal(Role.Admin),
      Type.Literal(Role.Staff),
      Type.Literal(Role.Customer),
    ]),
  },
  { additionalProperties: false },
);
export type AuthUser = Static<typeof AuthUserSchema>;

export const AuthResponseSchema = Type.Object(
  {
    token: Type.String(),
    user: AuthUserSchema,
  },
  { additionalProperties: false },
);
export type AuthResponse = Static<typeof AuthResponseSchema>;

export const ForgotPasswordBodySchema = Type.Object(
  {
    email: EmailSchema,
  },
  { additionalProperties: false },
);
export type ForgotPasswordBody = Static<typeof ForgotPasswordBodySchema>;

export const ForgotPasswordResponseSchema = Type.Object(
  {
    message: Type.String(),
  },
  { additionalProperties: false },
);
export type ForgotPasswordResponse = Static<
  typeof ForgotPasswordResponseSchema
>;

export const ResetPasswordBodySchema = Type.Object(
  {
    token: Type.String({ minLength: 1 }),
    newPassword: PasswordSchema,
  },
  { additionalProperties: false },
);
export type ResetPasswordBody = Static<typeof ResetPasswordBodySchema>;

export const MessageResponseSchema = Type.Object(
  {
    message: Type.String(),
  },
  { additionalProperties: false },
);
export type MessageResponse = Static<typeof MessageResponseSchema>;

export const CreateStaffBodySchema = Type.Object(
  {
    name: Type.String({ minLength: 1 }),
    email: EmailSchema,
    password: PasswordSchema,
  },
  { additionalProperties: false },
);
export type CreateStaffBody = Static<typeof CreateStaffBodySchema>;

export const UserSummarySchema = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    email: Type.String(),
    role: Type.Union([
      Type.Literal(Role.Admin),
      Type.Literal(Role.Staff),
      Type.Literal(Role.Customer),
    ]),
    createdAt: Type.Integer(),
  },
  { additionalProperties: false },
);
export type UserSummary = Static<typeof UserSummarySchema>;

export const UsersQuerySchema = Type.Object(
  {
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    pageSize: Type.Optional(
      Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
    ),
    role: Type.Optional(
      Type.Union([
        Type.Literal(Role.Admin),
        Type.Literal(Role.Staff),
        Type.Literal(Role.Customer),
      ]),
    ),
    search: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);
export type UsersQuery = Static<typeof UsersQuerySchema>;
