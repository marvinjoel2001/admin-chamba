import { useState } from "react";
import { User } from "lucide-react";

interface UserAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number; // en px, default 36
  className?: string;
}

export function UserAvatar({ name, photoUrl, size = 36, className = "" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?";
  const hasPhoto = Boolean(photoUrl && photoUrl.trim() && !imgError);

  if (hasPhoto) {
    return (
      <img
        src={photoUrl!}
        alt={name}
        onError={() => setImgError(true)}
        style={{ width: `${size}px`, height: `${size}px` }}
        className={`rounded-full object-cover border border-white/10 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`rounded-full bg-gradient-to-tr from-purple-700/80 to-indigo-600/80 text-white font-bold flex items-center justify-center shrink-0 border border-white/10 shadow-sm text-xs ${className}`}
      title={name}
    >
      {initial !== "?" ? initial : <User size={Math.max(12, Math.floor(size * 0.45))} className="text-white/80" />}
    </div>
  );
}
