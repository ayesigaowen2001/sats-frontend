import { getReportsPageData } from "@/lib/server/services/reports-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getReportsPageData());
}
