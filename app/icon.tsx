import { ImageResponse } from "next/og";

import { DropletMark } from "@/lib/brandIcon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<DropletMark size={32} padding={6} rounded={8} />, size);
}
