import React from "react";
import { FiCamera } from "react-icons/fi";

interface ProfileAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  editable?: boolean;
  onEditClick?: () => void;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  photoURL,
  displayName,
  size = "md",
  editable = false,
  onEditClick,
}) => {
  const name = displayName || "Operator";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const getSizeClasses = () => {
    switch (size) {
      case "sm": return "w-10 h-10 text-xs";
      case "lg": return "w-24 h-24 text-2xl";
      case "xl": return "w-32 h-32 text-4xl";
      default: return "w-16 h-16 text-lg"; // md
    }
  };

  const sizeClass = getSizeClasses();

  return (
    <div className={`relative rounded-2xl overflow-hidden group select-none ${sizeClass} border border-cyan-500/20 shadow-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-extrabold`}>
      {photoURL ? (
        <img 
          src={photoURL} 
          alt={name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            // If image fails to load, clear src to fallback to initials
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span>{initials}</span>
      )}

      {/* Editable Overlay */}
      {editable && (
        <div 
          onClick={onEditClick}
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer"
        >
          <FiCamera className="text-white text-md animate-pulse" />
          <span className="text-[9px] uppercase tracking-wider text-slate-300 font-bold">Edit</span>
        </div>
      )}
    </div>
  );
};

export default ProfileAvatar;
