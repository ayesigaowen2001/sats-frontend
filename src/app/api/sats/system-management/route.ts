import { getSystemManagementPageData } from "@/lib/server/services/system-management-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getSystemManagementPageData());
}