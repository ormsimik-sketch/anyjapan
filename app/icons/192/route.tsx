import { ImageResponse } from "next/og";

import { DropletMark } from "@/lib/brandIcon";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<DropletMark size={192} padding={38} rounded={42} />, {
    width: 192,
    height: 192,
  });
}
