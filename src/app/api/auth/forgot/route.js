import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";

const dataDir = path.join(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");

const readUsers = async () => {
  const raw = await fs.readFile(usersFile, "utf-8");
  return JSON.parse(raw).users || [];
};

const writeUsers = async (users) => {
  await fs.writeFile(usersFile, JSON.stringify({ users }, null, 2));
};

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const users = await readUsers();

    const userIndex = users.findIndex((u) => u.email === email);

    if (userIndex === -1) {
      return Response.json({ error: "Email not found" }, { status: 404 });
    }

    // 🔐 Generate reset token
    const resetToken = crypto.randomUUID();

    // ⏳ Expiry (15 minutes)
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 💾 Save token in user
    users[userIndex].resetToken = resetToken;
    users[userIndex].resetExpires = resetExpires;

    await writeUsers(users);

    // 🔗 Reset link
    const resetLink = `http://localhost:3000/reset?token=${resetToken}`;

    // 📧 Setup mail transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "ash47306@gmail.com",        // 🔁 replace
        pass: "ebtv fupz swju fxzq"            // 🔁 use app password
      }
    });

    // 📩 Send email
    await transporter.sendMail({
      from: "ash47306@gmail.com",
      to: email,
      subject: "Password Reset Request",
      html: `
        <h3>Password Reset</h3>
        <p>Click below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link expires in 15 minutes.</p>
      `
    });

    return Response.json({
      message: "Reset link sent to your email"
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}