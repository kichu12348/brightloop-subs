import { useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Role } from "@brightloop/shared";
import { useAuthStore } from "../../lib/useAuthStore.ts";
import { authApi } from "../../features/auth/authApi.ts";
import {
  PasswordRulesChecklist,
  validatePasswordCriteria,
} from "../../features/auth/PasswordRulesChecklist.tsx";
import { Button, Input } from "../../components/index.ts";
import styles from "./Auth.module.css";

export function SignupPage(): ReactElement {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { isValid: isPasswordValid } = validatePasswordCriteria(password);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!isPasswordValid) {
      setErrorMessage("Please ensure your password satisfies all criteria below.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await authApi.signup({
        name,
        email,
        password,
      });

      setSession(response.token, response.user);

      if (response.user.role === Role.Customer) {
        void navigate("/portal", { replace: true });
      } else {
        void navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Signup failed. Email may already be in use.";
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
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Join Brightloop Subscription Management</p>
        </div>

        {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}

        <form onSubmit={(e) => void onSubmit(e)} className={styles.form}>
          <Input
            label="Full Name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Doe"
          />

          <Input
            label="Email Address"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />

          <Input
            label="Password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a strong password"
          />

          <PasswordRulesChecklist password={password} />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!isPasswordValid || !name || !email}
          >
            Create Account
          </Button>
        </form>

        <div className={styles.footerLinks} style={{ justifyContent: "center" }}>
          <span>
            Already have an account?{" "}
            <Link to="/login" className={styles.link}>
              Sign In
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
