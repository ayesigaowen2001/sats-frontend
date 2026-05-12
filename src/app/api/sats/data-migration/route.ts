import { getDataMigrationPageData } from "@/lib/server/services/data-migration-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getDataMigrationPageData());
}