import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { FiSun, FiMoon } from "react-icons/fi";

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white transition-all select-none"
      title={theme === "dark" ? "Toggle Light Mode" : "Toggle Dark Mode"}
    >
      {theme === "dark" ? (
        <FiSun className="text-md text-amber-400" />
      ) : (
        <FiMoon className="text-md text-indigo-400" />
      )}
    </button>
  );
};

export default ThemeToggle;
