import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { syncAllAccountsForUser } from "@/services/sync/sync-service";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const results = await syncAllAccountsForUser(userId, "MANUAL");
  return NextResponse.json({ results });
}
