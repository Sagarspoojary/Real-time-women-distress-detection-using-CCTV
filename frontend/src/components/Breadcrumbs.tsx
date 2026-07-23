import React from "react";
import { useLocation, Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Helper to format path slugs into clean titles
  const formatSlug = (slug: string) => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400 select-none uppercase tracking-wider py-2">
      {pathnames.map((value, index) => {
        const last = index === pathnames.length - 1;
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;
        const title = formatSlug(value);

        return (
          <React.Fragment key={to}>
            {index > 0 && <FiChevronRight className="text-slate-600 text-sm" />}
            {last ? (
              <span className="text-cyan-400 font-bold glow-cyan">{title}</span>
            ) : (
              <Link to={to} className="hover:text-white transition-colors">
                {title}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
