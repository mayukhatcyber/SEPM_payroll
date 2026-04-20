import { readUsers, readSessions, writeSessions, safeUser } from "@/lib/auth";
import { cookies } from "next/headers";
import crypto from "crypto"; // ✅ MISSING (IMPORTANT)

export async function POST(request) {
  try {
    const payload = await request.json();

    const username = (payload.username || "").trim();
    const password = (payload.password || "").trim();

    // ✅ Validate input
    if (!username || !password) {
      return Response.json({ error: "Username and password required." }, { status: 400 });
    }

    const users = await readUsers();

    const user = users.find(
      (item) => item.username === username && item.password === password
    );

    if (!user) {
      return Response.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const sessions = await readSessions();

    const token = crypto.randomUUID();

    const newSession = {
      id: crypto.randomUUID(),
      token,
      userId: user.id,
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const updated = [newSession, ...sessions].slice(0, 200);
    await writeSessions(updated);

    // ✅ Set cookie
    cookies().set("sepm_session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    });

    return Response.json({ user: safeUser(user) });

  } catch (err) {
    console.error("Login error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}