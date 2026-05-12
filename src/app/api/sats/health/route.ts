import { getHealthPageData } from "@/lib/server/services/health-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getHealthPageData());
}