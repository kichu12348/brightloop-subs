import { useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Role } from "@brightloop/shared";
import { useAuthStore } from "../../lib/useAuthStore.ts";
import { authApi } from "../../features/auth/authApi.ts";
import { Button, Input } from "../../components/index.ts";
import styles from "./Auth.module.css";

export function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogin(targetEmail = email, targetPassword = password): Promise<void> {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await authApi.login({
        email: targetEmail,
        password: targetPassword,
      });

      setSession(response.token, response.user);

      if (response.user.role === Role.Customer) {
        void navigate("/portal", { replace: true });
      } else {
        void navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function onSubmit(e: FormEvent): void {
    e.preventDefault();
    void handleLogin();
  }

  function handleQuickFill(demoEmail: string): void {
    setEmail(demoEmail);
    setPassword("Brightloop@123");
    void handleLogin(demoEmail, "Brightloop@123");
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logoSquare}>BL</div>
            <span className={styles.title}>Brightloop</span>
          </div>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>Enter your credentials to access your account</p>
        </div>

        {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

        <form onSubmit={onSubmit} className={styles.form}>
          <Input
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@brightloop.test"
          />

          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
          />

          <Button type="submit" variant="primary" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className={styles.footerLinks}>
          <Link to="/forgot-password" className={styles.link}>
            Forgot password?
          </Link>
          <Link to="/signup" className={styles.link}>
            Create an account
          </Link>
        </div>

        <div className={styles.demoSection}>
          <span className={styles.demoLabel}>Instant Demo Sign-In</span>
          <div className={styles.demoButtons}>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => handleQuickFill("admin@brightloop.test")}
            >
              Admin
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => handleQuickFill("staff@brightloop.test")}
            >
              Staff
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => handleQuickFill("customer@brightloop.test")}
            >
              Customer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
