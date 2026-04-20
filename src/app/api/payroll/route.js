import { promises as fs } from "fs";
import path from "path";
import { getSessionFromCookie } from "@/lib/auth";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "payroll.json");
const logFile = path.join(dataDir, "logs.json");

const readLogs = async () => {
  try {
    const raw = await fs.readFile(logFile, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
};

const writeLogs = async (logs) => {
  await fs.writeFile(logFile, JSON.stringify(logs, null, 2));
};

const logAction = async ({ userId, action, entity, entityId }) => {
  const logs = await readLogs();

  logs.unshift({
    id: crypto.randomUUID(),
    userId,
    action,
    entity,
    entityId,
    timestamp: new Date().toISOString()
  });

  await writeLogs(logs);
};
const ensureStore = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify({ entries: [] }, null, 2));
  }
};

const readEntries = async () => {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf-8");
  const data = JSON.parse(raw || "{\"entries\": []}");
  return data.entries || [];
};

const writeEntries = async (entries) => {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify({ entries }, null, 2));
};



const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const computeTotals = ({ ctcMonthly, otherEarnings, deductions }) => {
  const ctc = toNumber(ctcMonthly);
  const other = toNumber(otherEarnings);
  const grossMonthly = ctc + other;

  const normalizedDeductions = (deductions || []).map((item) => {
    const value = toNumber(item.value);
    const amount = item.type === "percent" ? (ctc * value) / 100 : value;
    return {
      label: item.label || "Deduction",
      type: item.type === "percent" ? "percent" : "amount",
      value,
      amount
    };
  });

  const totalDeductions = normalizedDeductions.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const inHandMonthly = grossMonthly - totalDeductions;

  return { grossMonthly, totalDeductions, inHandMonthly, normalizedDeductions };
};

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const entries = await readEntries();
  const visibleEntries =
    session.role === "admin"
      ? entries
      : entries.filter((entry) => entry.employeeId === session.userId);

  return Response.json({ entries: visibleEntries });
}

export async function POST(request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await request.json();
  const entries = await readEntries();

  const totals = computeTotals({
    ctcMonthly: payload.ctcMonthly,
    otherEarnings: payload.otherEarnings,
    deductions: payload.deductions
  });

  const employeeId =
    session.role === "admin" ? payload.employeeId || session.userId : session.userId;

  const newEntry = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    employeeId,
    employeeName: payload.employeeName || "",
    role: payload.role || "",
    notes: payload.notes || "",
    ctcMonthly: toNumber(payload.ctcMonthly),
    otherEarnings: toNumber(payload.otherEarnings),
    grossMonthly: totals.grossMonthly,
    totalDeductions: totals.totalDeductions,
    inHandMonthly: totals.inHandMonthly,
    deductions: totals.normalizedDeductions
  };

  const updatedEntries = [newEntry, ...entries];
  await writeEntries(updatedEntries);

  await logAction({
  userId: session.userId,
  action: "CREATE_PAYROLL",
  entity: "payroll",
  entityId: newEntry.id
});

  const visibleEntries =
    session.role === "admin"
      ? updatedEntries
      : updatedEntries.filter((entry) => entry.employeeId === session.userId);

  return Response.json({ entries: visibleEntries }, { status: 201 });
}
