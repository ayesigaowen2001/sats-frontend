import { getTrackingPageData } from "@/lib/server/services/tracking-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getTrackingPageData());
}
