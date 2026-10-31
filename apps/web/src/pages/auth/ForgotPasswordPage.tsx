import { useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../features/auth/authApi.ts";
import { Button, Input } from "../../components/index.ts";
import styles from "./Auth.module.css";

export function ForgotPasswordPage(): ReactElement {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword({ email });
      setSuccessMessage(response.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logoSquare}>BL</div>
            <span className={styles.title}>Brightloop</span>
          </div>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>Enter your email to receive password reset instructions</p>
        </div>

        {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
        {successMessage && <div className={styles.successBanner}>{successMessage}</div>}

        {!successMessage ? (
          <form onSubmit={(e) => void onSubmit(e)} className={styles.form}>
            <Input
              label="Email Address"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />

            <Button type="submit" variant="primary" isLoading={isLoading}>
              Send Reset Link
            </Button>
          </form>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <Link to="/reset-password">
              <Button variant="outline" style={{ width: "100%" }}>
                Proceed to Reset Token Form
              </Button>
            </Link>
          </div>
        )}

        <div className={styles.footerLinks} style={{ justifyContent: "center" }}>
          <Link to="/login" className={styles.link}>
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;

