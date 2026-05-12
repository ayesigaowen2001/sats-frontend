import { getOrganizationsPageData } from "@/lib/server/services/organizations-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getOrganizationsPageData());
}
