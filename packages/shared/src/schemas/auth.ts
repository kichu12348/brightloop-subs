import { Type, type Static } from "@sinclair/typebox";

export const EmailSchema = Type.String({ format: "email" });
export type Email = Static<typeof EmailSchema>;

export const PASSWORD_PATTERN =
  "^(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{9,}$";

export const PasswordSchema = Type.String({
  minLength: 9,
  pattern: PASSWORD_PATTERN,
});
export type Password = Static<typeof PasswordSchema>;

