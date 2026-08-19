import { ImageResponse } from "next/og";

import { DropletMark } from "@/lib/brandIcon";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(<DropletMark size={512} padding={140} rounded={0} />, {
    width: 512,
    height: 512,
  });
}
