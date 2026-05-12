import { getFiltersPageData } from "@/lib/server/services/filters-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getFiltersPageData());
}