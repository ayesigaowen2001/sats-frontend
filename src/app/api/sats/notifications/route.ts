import { getNotificationsPageData } from "@/lib/server/services/notifications-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getNotificationsPageData());
}