import { readUsers, writeUsers } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request) {
  try {
    const payload = await request.json();

    const username = (payload.username || "").trim();
    const password = (payload.password || "").trim();
    const email = (payload.email || "").trim(); // ✅ NEW
    const role = payload.role || "employee";
    const name = payload.name || "";
    const department = payload.department || "";

    // ✅ validation
    if (!username || !password || !email) {
      return Response.json(
        { error: "Username, password and email required" },
        { status: 400 }
      );
    }

    const users = await readUsers();

    // ❌ duplicate username
    if (users.find((u) => u.username === username)) {
      return Response.json(
        { error: "Username already exists" },
        { status: 400 }
      );
    }

    // ❌ duplicate email
    if (users.find((u) => u.email === email)) {
      return Response.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const newUser = {
      id: crypto.randomUUID(),
      username,
      password, // ⚠️ plain (upgrade later)
      email,    // ✅ IMPORTANT
      role,
      name,
      department,
      createdAt: new Date().toISOString()
    };

    await writeUsers([...users, newUser]);

    return Response.json({
      message: "User created successfully"
    });

  } catch (err) {
    console.error("Signup error:", err);
    return Response.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}