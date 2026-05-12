import { getUsersPageData } from "@/lib/server/services/users-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getUsersPageData());
}