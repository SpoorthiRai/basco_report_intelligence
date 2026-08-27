import bascoLogoImg from "../../assets/basco-logo.jpeg";
import intelLogoImg from "../../assets/intel-logo.png";

interface BascoIntelLogoProps {
  className?: string;
  theme?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export default function BascoIntelLogo({
  className = "",
  theme = "light",
  size = "md",
}: BascoIntelLogoProps) {
  const isDark = theme === "dark";

  const sizeClasses = {
    sm: {
      basco: "h-5 sm:h-5.5",
      divider: "h-4",
      intel: "h-4 sm:h-4.5",
    },
    md: {
      basco: "h-6.5 sm:h-7.5",
      divider: "h-6",
      intel: "h-5.5 sm:h-6.5",
    },
    lg: {
      basco: "h-8 sm:h-9.5",
      divider: "h-8",
      intel: "h-7 sm:h-8.5",
    },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3.5 select-none ${className}`}>
      {/* Official Intel Logo (Left) */}
      <img
        src={intelLogoImg}
        alt="Intel Logo"
        className={`${sizeClasses.intel} w-auto object-contain ${
          isDark ? "brightness-0 invert" : "mix-blend-multiply"
        }`}
      />

      {/* Vertical Divider */}
      <div
        className={`w-[1.5px] ${sizeClasses.divider} ${
          isDark ? "bg-slate-700" : "bg-slate-300"
        }`}
      />

      {/* Official BASCO Logo Graphic (Right) */}
      <img
        src={bascoLogoImg}
        alt="BASCO"
        className={`${sizeClasses.basco} w-auto object-contain ${
          isDark ? "brightness-110 contrast-125" : "mix-blend-multiply"
        }`}
      />
    </div>
  );
}

