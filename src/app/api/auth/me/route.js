import { getSessionFromCookie, readUsers, safeUser } from "@/lib/auth";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return Response.json({ user: null }, { status: 401 });
  }

  const users = await readUsers();
  const user = users.find((item) => item.id === session.userId);
  return Response.json({ user: safeUser(user) || null, role: session.role });
}
