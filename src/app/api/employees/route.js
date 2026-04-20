import { getSessionFromCookie, readUsers, safeUser } from "@/lib/auth";

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (session.role !== "admin") {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  const users = await readUsers();
  const employees = users
    .filter((user) => user.role === "employee")
    .map((user) => safeUser(user));

  return Response.json({ employees });
}
