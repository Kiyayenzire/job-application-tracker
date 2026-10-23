import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreateAccountPage } from "./components/CreateAccountPage";
import { LoginPage } from "./components/LoginPage";
import { ThemeToggle } from "./components/ThemeToggle";

const styles = readFileSync(
  resolve(process.cwd(), "src/styles.css"),
  "utf8",
);

describe("JAT theme", () => {
  it("uses the requested indigo and pale-orange light palette", () => {
    expect(styles).toContain("--primary: #4f46e5");
    expect(styles).toContain("--primary-hover: #4338ca");
    expect(styles).toContain("--primary-subtle: #e0e7ff");
    expect(styles).toContain("--secondary: #475569");
    expect(styles).toContain("--accent: #fdba74");
    expect(styles).toContain("--accent-subtle: #fff7ed");
    expect(styles).toContain("--success: #059669");
    expect(styles).toContain("--danger: #dc2626");
    expect(styles).toContain("--warning: #d97706");
    expect(styles).toContain("--info: #2563eb");
    expect(styles).toContain("--background: #f8fafc");
    expect(styles).toContain("--text-primary: #0f172a");
    expect(styles).toContain("--text-secondary: #64748b");
    expect(styles).toContain("--border: #e2e8f0");
    expect(styles).toContain("--status-follow-up: #fdba74");
    expect(styles).toContain("color: #9a3412");
  });

  it("scopes the specified indigo and orange dark palette to the authenticated application shell", () => {
    expect(styles).not.toContain("@media (prefers-color-scheme: dark)");
    expect(styles).toContain('.app-shell[data-theme="dark"]');
    expect(styles).toContain("--primary: #818cf8");
    expect(styles).toContain("--primary-hover: #a5b4fc");
    expect(styles).toContain("--primary-subtle: #312e81");
    expect(styles).toContain("--accent: #fdba74");
    expect(styles).toContain("--accent-subtle: #431407");
    expect(styles).toContain("--background: #020617");
    expect(styles).toContain("--surface: #0f172a");
    expect(styles).toContain("--elevated: #1e293b");
  });

  it("uses Inter with a system fallback and JetBrains Mono for technical content", () => {
    expect(styles).toContain("--font-sans: Inter, system-ui");
    expect(styles).toContain('--font-mono: "JetBrains Mono", monospace');
    expect(styles).toContain("font-family: var(--font-sans)");
    expect(styles).toContain(".tech-stack-input");
  });

  it("lets authenticated users switch between light and dark themes", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<ThemeToggle theme="light" onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(<ThemeToggle theme="dark" onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  });

  it("applies the same auth-card layout to login and account creation", () => {
    const { unmount } = render(<LoginPage onAuthenticated={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Login" }).closest(".auth-card")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /switch to .* mode/i })).not.toBeInTheDocument();

    unmount();
    render(<CreateAccountPage onAuthenticated={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Create account" }).closest(".auth-card")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /switch to .* mode/i })).not.toBeInTheDocument();
  });
});
