import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    const raw = await fs.readFile(usersFile, "utf-8");
    const data = JSON.parse(raw);
    const users = data.users || [];

    const userIndex = users.findIndex(
      (u) => u.resetToken === token
    );

    if (userIndex === -1) {
      return Response.json({ error: "Invalid token" }, { status: 400 });
    }

    // ⏳ Check expiry
    if (new Date(users[userIndex].resetExpires) < new Date()) {
      return Response.json({ error: "Token expired" }, { status: 400 });
    }

    // 🔐 Update password
    users[userIndex].password = password;

    // ❌ Remove token
    delete users[userIndex].resetToken;
    delete users[userIndex].resetExpires;

    await fs.writeFile(usersFile, JSON.stringify({ users }, null, 2));

    return Response.json({ message: "Password updated" });

  } catch (err) {
    console.error(err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}