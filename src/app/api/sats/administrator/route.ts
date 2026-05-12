import { getAdministratorPageData } from "@/lib/server/services/administrator-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getAdministratorPageData());
}