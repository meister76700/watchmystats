import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  platform: z.enum(["YOUTUBE", "TIKTOK", "INSTAGRAM", "TWITCH", "FACEBOOK", "X"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Plateforme invalide" }, { status: 400 });

  // On supprime le compte de plateforme (cascade: vidéos, statistiques, logs
  // associés sont supprimés avec, voir onDelete: Cascade dans le schéma).
  await prisma.platformAccount.deleteMany({
    where: { userId, platform: parsed.data.platform },
  });

  return NextResponse.json({ success: true });
}
