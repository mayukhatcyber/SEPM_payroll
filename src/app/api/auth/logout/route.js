import { readSessions, writeSessions } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = cookies();
  const token = cookieStore.get("sepm_session")?.value;
  if (token) {
    const sessions = await readSessions();
    const filtered = sessions.filter((item) => item.token !== token);
    await writeSessions(filtered);
  }

  cookieStore.set("sepm_session", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });

  return Response.json({ ok: true });
}
