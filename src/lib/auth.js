import { promises as fs } from "fs";
import { cookies } from "next/headers";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const usersFile = path.join(dataDir, "users.json");
const sessionsFile = path.join(dataDir, "sessions.json");

const ensureFile = async (filePath, fallback) => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2));
  }
};

export const ensureAuthStore = async () => {
  await ensureFile(usersFile, {
    users: [
      {
        id: "emp-001",
        username: "employee",
        password: "employee123",
        role: "employee",
        name: "Aarav Gupta",
        department: "Finance"
      },
      {
        id: "admin-001",
        username: "admin",
        password: "admin123",
        role: "admin",
        name: "HR Admin",
        department: "People Ops"
      },
      {
        id: "emp-002",
        username: "garvit",
        password: "employee1234",
        role: "employee",
        name: "Garvit Pareek",
        department: "Fintech"
      }      
    ]
  });
  await ensureFile(sessionsFile, { sessions: [] });
};

export const readUsers = async () => {
  await ensureAuthStore();
  const raw = await fs.readFile(usersFile, "utf-8");
  const data = JSON.parse(raw || "{\"users\": []}");
  return data.users || [];
};

export const readSessions = async () => {
  await ensureAuthStore();
  const raw = await fs.readFile(sessionsFile, "utf-8");
  const data = JSON.parse(raw || "{\"sessions\": []}");
  return data.sessions || [];
};

export const writeSessions = async (sessions) => {
  await ensureAuthStore();
  await fs.writeFile(sessionsFile, JSON.stringify({ sessions }, null, 2));
};


export const writeUsers = async (users) => {
  await ensureAuthStore();
  await fs.writeFile(usersFile, JSON.stringify({ users }, null, 2));
};

export const getSessionFromCookie = async () => {
  const cookieStore = cookies();
  const token = cookieStore.get("sepm_session")?.value;
  if (!token) return null;
  const sessions = await readSessions();
  const session = sessions.find((item) => item.token === token);
  if (!session) return null;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    const filtered = sessions.filter((item) => item.token !== token);
    await writeSessions(filtered);
    return null;
  }
  return session;
};

export const safeUser = (user) => {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
};
