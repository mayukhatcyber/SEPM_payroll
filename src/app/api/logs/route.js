import { promises as fs } from "fs";
import path from "path";
import { getSessionFromCookie } from "@/lib/auth";

const dataDir = path.join(process.cwd(), "data");
const logFile = path.join(dataDir, "logs.json");

const readLogs = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    const raw = await fs.readFile(logFile, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
};

export async function GET() {
  const session = await getSessionFromCookie();

  if (!session || session.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await readLogs();
  return Response.json({ logs });
}