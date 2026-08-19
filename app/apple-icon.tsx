import { ImageResponse } from "next/og";

import { DropletMark } from "@/lib/brandIcon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<DropletMark size={180} padding={36} rounded={40} />, size);
}
