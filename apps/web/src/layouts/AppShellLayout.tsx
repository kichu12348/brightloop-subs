import type { ReactElement } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LuLayoutDashboard,
  LuRepeat,
  LuReceipt,
  LuLayers,
  LuUserCheck,
  LuLogOut,
  LuSun,
  LuMoon,
  LuMenu,
  LuActivity,
  LuTrash2,
} from "react-icons/lu";
import { Role } from "@brightloop/shared";
import { useAuthStore } from "../lib/useAuthStore.ts";
import { useUiStore } from "../lib/useUiStore.ts";
import { useRealtimeSync } from "../lib/useRealtimeSync.ts";
import { cx } from "../lib/cx.ts";
import { Badge, Drawer, ToastContainer } from "../components/index.ts";
import styles from "./AppShellLayout.module.css";

export function AppShellLayout(): ReactElement {
  useRealtimeSync();

  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const isActivityDrawerOpen = useUiStore((s) => s.isActivityDrawerOpen);
  const setActivityDrawerOpen = useUiStore((s) => s.setActivityDrawerOpen);
  const wsConnected = useUiStore((s) => s.wsConnected);
  const liveEvents = useUiStore((s) => s.liveEvents);
  const clearLiveEvents = useUiStore((s) => s.clearLiveEvents);

  const isAdminOrStaff = user?.role === Role.Admin || user?.role === Role.Staff;

  function handleLogout(): void {
    clearSession();
    void navigate("/login");
  }

  const navLinks = isAdminOrStaff
    ? [
        { to: "/dashboard", label: "Dashboard", icon: <LuLayoutDashboard size={18} /> },
        { to: "/subscriptions", label: "Subscriptions", icon: <LuRepeat size={18} /> },
        { to: "/invoices", label: "Invoices", icon: <LuReceipt size={18} /> },
        { to: "/catalog", label: "Catalog & Config", icon: <LuLayers size={18} /> },
      ]
    : [
        { to: "/portal", label: "My Subscriptions & Invoices", icon: <LuUserCheck size={18} /> },
      ];

  return (
    <div className={styles.container}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <div className={styles.logoSquare}>BL</div>
            <span className={styles.brandName}>Brightloop</span>
          </div>
          {user?.role && <Badge status={user.role}>{user.role}</Badge>}
        </div>

        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cx(styles.navItem, isActive ? styles.navItemActive : undefined)
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.statusRow}>
            <button
              type="button"
              className={styles.wsStatusButton}
              onClick={() => setActivityDrawerOpen(true)}
              title="Click to view live stream"
            >
              <span
                className={cx(
                  styles.wsDot,
                  wsConnected ? styles.wsDotConnected : undefined,
                )}
              />
              <span>{wsConnected ? "LIVE SYNC" : "OFFLINE"}</span>
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setActivityDrawerOpen(true)}
              aria-label="Activity stream"
            >
              <LuActivity size={16} />
            </button>
          </div>

          <div className={styles.userCard}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name ?? "User"}</span>
              <span className={styles.userEmail}>{user?.email ?? ""}</span>
            </div>
          </div>

          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <LuMoon size={16} /> : <LuSun size={16} />}
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LuLogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className={styles.mobileHeader}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <LuMenu size={18} />
        </button>

        <div className={styles.brandLogo}>
          <div className={styles.logoSquare}>BL</div>
          <span className={styles.brandName}>Brightloop</span>
        </div>

        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setActivityDrawerOpen(true)}
          aria-label="View live activity"
        >
          <LuActivity size={18} />
        </button>
      </div>

      {/* Main Page Area */}
      <main className={styles.main}>
        <div className={styles.contentWrapper}>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Quick-Nav */}
      {isAdminOrStaff && (
        <nav className={styles.mobileBottomNav}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cx(styles.mobileNavItem, isActive ? styles.mobileNavItemActive : undefined)
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Mobile Slide-Over Navigation Drawer */}
      <Drawer
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title="Navigation"
        side="left"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div className={styles.userCard}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userEmail}>{user?.email}</span>
            </div>
            {user?.role && <Badge status={user.role}>{user.role}</Badge>}
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cx(styles.navItem, isActive ? styles.navItemActive : undefined)
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>

          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-6)" }}>
            <button
              type="button"
              className={styles.iconButton}
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <LuMoon size={16} /> : <LuSun size={16} />}
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={handleLogout}
              aria-label="Log out"
            >
              <LuLogOut size={16} />
            </button>
          </div>
        </div>
      </Drawer>

      {/* Real-time Activity Stream Drawer */}
      <Drawer
        isOpen={isActivityDrawerOpen}
        onClose={() => setActivityDrawerOpen(false)}
        title="Live WebSocket Stream"
        side="right"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              {liveEvents.length} event(s) recorded
            </span>
            {liveEvents.length > 0 && (
              <button
                type="button"
                className={styles.wsStatusButton}
                onClick={clearLiveEvents}
                aria-label="Clear event buffer"
              >
                <LuTrash2 size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className={styles.eventList}>
            {liveEvents.length === 0 ? (
              <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)" }}>
                Waiting for incoming events...
              </p>
            ) : (
              liveEvents.map((evt) => (
                <div key={evt.id} className={styles.eventCard}>
                  <div className={styles.eventHeader}>
                    <span className={styles.eventType}>{evt.type}</span>
                    <span className={styles.eventTime}>
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className={styles.eventSummary}>{evt.summary}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </Drawer>

      <ToastContainer />
    </div>
  );
}
