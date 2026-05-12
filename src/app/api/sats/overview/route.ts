import { getOverviewData } from "@/lib/server/services/overview-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getOverviewData());
}
