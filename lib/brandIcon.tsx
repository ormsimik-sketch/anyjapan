import type { CSSProperties } from "react";

const DROPLET_PATH = "M12 2.69 L17.66 8.35 A8 8 0 1 1 6.34 8.35 Z";

interface DropletMarkProps {
  size: number;
  padding: number;
  rounded: number;
  background?: string;
}

export function DropletMark({ size, padding, rounded, background }: DropletMarkProps) {
  const containerStyle: CSSProperties = {
    width: size,
    height: size,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: background ?? "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
    borderRadius: rounded,
  };

  const glyphSize = size - padding * 2;

  return (
    <div style={containerStyle}>
      <svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24" fill="none">
        <path d={DROPLET_PATH} fill="white" />
      </svg>
    </div>
  );
}
