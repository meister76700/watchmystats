import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  theme: z.enum(["dark", "light", "system"]).optional(),
  notifySyncSuccess: z.boolean().optional(),
  notifySyncError: z.boolean().optional(),
  notifyWeeklyReport: z.boolean().optional(),
  name: z.string().min(2).max(80).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).optional(),
});

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides" }, { status: 400 });
  }

  const { currentPassword, newPassword, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };

  if (newPassword) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password || !currentPassword) {
      return NextResponse.json({ error: "Mot de passe actuel requis." }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
    }
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, theme: true, notifySyncSuccess: true, notifySyncError: true, notifyWeeklyReport: true },
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // La suppression cascade (comptes de plateforme, vidéos, statistiques,
  // notifications) est gérée par onDelete: Cascade dans le schéma Prisma.
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
