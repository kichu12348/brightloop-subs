import { useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../features/auth/authApi.ts";
import {
  PasswordRulesChecklist,
  validatePasswordCriteria,
} from "../../features/auth/PasswordRulesChecklist.tsx";
import { Button, Input } from "../../components/index.ts";
import styles from "./Auth.module.css";

export function ResetPasswordPage(): ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { isValid: isPasswordValid } = validatePasswordCriteria(newPassword);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!isPasswordValid) {
      setErrorMessage("Please ensure your password satisfies all criteria below.");
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await authApi.resetPassword({
        token,
        newPassword,
      });
      setSuccessMessage(response.message);
      setTimeout(() => {
        void navigate("/login");
      }, 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Reset failed. The token may be expired or invalid.";
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
          <h1 className={styles.title}>Set New Password</h1>
          <p className={styles.subtitle}>Enter your reset token and new secure password</p>
        </div>

        {errorMessage && <div className={styles.errorBanner}>{errorMessage}</div>}
        {successMessage && (
          <div className={styles.successBanner}>
            {successMessage} Redirecting to login...
          </div>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className={styles.form}>
          <Input
            label="Reset Token"
            type="text"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your reset token"
          />

          <Input
            label="New Password"
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />

          <PasswordRulesChecklist password={newPassword} />

          <Button
            type="submit"
            variant="primary"
            isLoading={isLoading}
            disabled={!isPasswordValid || !token}
          >
            Update Password
          </Button>
        </form>

        <div className={styles.footerLinks} style={{ justifyContent: "center" }}>
          <Link to="/login" className={styles.link}>
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
