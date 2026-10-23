import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  const label = `Switch to ${isDark ? "light" : "dark"} mode`;
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      aria-label={label}
      className="ghost-button"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" size={18} />
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
