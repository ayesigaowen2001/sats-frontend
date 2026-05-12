import { getAnimalsPageData } from "@/lib/server/services/animals-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getAnimalsPageData());
}
