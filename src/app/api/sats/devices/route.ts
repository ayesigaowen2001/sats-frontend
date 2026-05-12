import { getDevicesPageData } from "@/lib/server/services/devices-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getDevicesPageData());
}
