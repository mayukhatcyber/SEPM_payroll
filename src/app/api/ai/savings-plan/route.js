import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "ai-plans.json");

const ensureStore = async () => {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify({ plans: [] }, null, 2));
  }
};

const readPlans = async () => {
  await ensureStore();
  const raw = await fs.readFile(dataFile, "utf-8");
  const data = JSON.parse(raw || "{\"plans\": []}");
  return data.plans || [];
};

const writePlans = async (plans) => {
  await ensureStore();
  await fs.writeFile(dataFile, JSON.stringify({ plans }, null, 2));
};

const buildPlan = ({
  inHandMonthly,
  monthlyInvestable,
  goalName,
  targetAmount,
  timelineMonths,
  riskProfile
}) => {
  const safeGoal = goalName || "savings goal";
  const target = Number(targetAmount) || 0;
  const months = Math.max(Number(timelineMonths) || 12, 1);
  const requiredPerMonth = target > 0 ? Math.ceil(target / months) : 0;
  const investable = Math.max(Number(monthlyInvestable) || 0, 0);

  const allocation =
    riskProfile === "Aggressive"
      ? [
          "Emergency / liquid: 10-15% until 3-6 months cover is built",
          "Debt funds / fixed income: 20-25%",
          "Broad index equity: 55-60%",
          "Gold / alternatives: 5-10%",
          "Tax-saving (ELSS/PPF/NPS): add if eligible"
        ]
      : riskProfile === "Conservative"
        ? [
            "Emergency / liquid: 25-30% until 3-6 months cover is built",
            "Debt funds / fixed income: 45-55%",
            "Broad index equity: 15-20%",
            "Gold / alternatives: 5-10%",
            "Tax-saving (PPF/ELSS/NPS): add if eligible"
          ]
        : [
            "Emergency / liquid: 20-25% until 3-6 months cover is built",
            "Debt funds / fixed income: 30-35%",
            "Broad index equity: 35-40%",
            "Gold / alternatives: 5-10%",
            "Tax-saving (ELSS/PPF/NPS): add if eligible"
          ];

  const bullets = [
    `Goal: ${safeGoal}. Target: ₹${target.toLocaleString("en-IN")} in ${months} months.`,
    `Estimated monthly amount needed: ₹${requiredPerMonth.toLocaleString("en-IN")}.`,
    investable
      ? `Current suggested investable amount: ~₹${Math.round(investable).toLocaleString("en-IN")} per month.`
      : "Set an investable amount after covering essentials.",
    "Suggested split (categories only):",
    ...allocation,
    "Review monthly, and rebalance every 6-12 months.",
    "Educational only, not financial advice."
  ];

  return bullets;
};

export async function GET() {
  const plans = await readPlans();
  return Response.json({ plans });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const bullets = buildPlan(payload || {});
    const plans = await readPlans();

    const newPlan = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      goalName: payload.goalName || "savings goal",
      targetAmount: Number(payload.targetAmount) || 0,
      timelineMonths: Number(payload.timelineMonths) || 0,
      riskProfile: payload.riskProfile || "Balanced",
      bullets
    };

    const updatedPlans = [newPlan, ...plans].slice(0, 20);
    await writePlans(updatedPlans);

    return Response.json({ plan: newPlan, plans: updatedPlans });
  } catch (error) {
    return Response.json(
      { error: "Unable to generate plan.", detail: error.message },
      { status: 500 }
    );
  }
}
