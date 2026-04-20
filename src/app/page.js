"use client";

import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";


const defaultDeductions = [
  { id: "pf", label: "Provident Fund (PF)", type: "percent", value: 12 },
  { id: "esic", label: "ESIC", type: "percent", value: 0.75 }
];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const formatCurrency = (value) => currency.format(Number(value || 0));

const CurrencyText = ({ value }) => (
  <span suppressHydrationWarning>{formatCurrency(value)}</span>
);

const createEmptyEntry = () => ({
  employeeName: "",
  role: "",
  ctcMonthly: "",
  otherEarnings: "",
  notes: "",
  deductions: defaultDeductions.map((item) => ({ ...item }))
});

const riskProfiles = [
  {
    id: "conservative",
    label: "Conservative",
    allocation: [
      { label: "Emergency fund / liquid", value: 25 },
      { label: "Debt funds / fixed income", value: 45 },
      { label: "Index equity funds", value: 20 },
      { label: "Gold / alternatives", value: 10 }
    ]
  },
  {
    id: "balanced",
    label: "Balanced",
    allocation: [
      { label: "Emergency fund / liquid", value: 20 },
      { label: "Debt funds / fixed income", value: 30 },
      { label: "Index equity funds", value: 40 },
      { label: "Gold / alternatives", value: 10 }
    ]
  },
  {
    id: "aggressive",
    label: "Aggressive",
    allocation: [
      { label: "Emergency fund / liquid", value: 15 },
      { label: "Debt funds / fixed income", value: 20 },
      { label: "Index equity funds", value: 55 },
      { label: "Gold / alternatives", value: 10 }
    ]
  }
];

const selectProfile = (score) => {
  if (score <= 5) return riskProfiles[0];
  if (score <= 8) return riskProfiles[1];
  return riskProfiles[2];
};

const steps = [
  { id: "ctc", label: "CTC" },
  { id: "deductions", label: "Deductions" },
  { id: "plan", label: "Plan" },
  { id: "save", label: "Save" }
];

const parseBullets = (bullets) => bullets.filter(Boolean);

const PieChart = ({ items }) => {
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const size = 160;
  const radius = 62;
  const center = size / 2;
  let cumulative = 0;
  const colors = ["#4CAF50", "#2196F3", "#FFC107", "#FF5722", "#9C27B0"];

  if (!total) {
    return (
      <div className="chart-empty">
        <p>No deductions yet.</p>
      </div>
    );
  }

  const loadUser = async () => {
  try {
    const response = await fetch("/api/auth/me");
    if (!response.ok) {
      setUserLoading(false);
      return;
    }

    const data = await response.json();
    setCurrentUser(data.user || null);
  } catch {
    setCurrentUser(null);
  } finally {
    setUserLoading(false); // ✅ important
  }
};

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {items.map((item, index) => {
        const value = item.amount;
        const startAngle = (cumulative / total) * 2 * Math.PI;
        cumulative += value;
        const endAngle = (cumulative / total) * 2 * Math.PI;

        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
        const startX = center + radius * Math.cos(startAngle - Math.PI / 2);
        const startY = center + radius * Math.sin(startAngle - Math.PI / 2);
        const endX = center + radius * Math.cos(endAngle - Math.PI / 2);
        const endY = center + radius * Math.sin(endAngle - Math.PI / 2);

        const d = `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;

        return <path key={item.label} d={d} fill={colors[index % colors.length]} />;
      })}
    </svg>
  );
};

const LineChart = ({ points }) => {
  const width = 280;
  const height = 160;
  const padding = 16;
  const maxValue = Math.max(...points.map((p) => p.value), 1);

  const coords = points.map((point, index) => {
    const x = padding + (index / (points.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (point.value / maxValue) * (height - padding * 2);
    return { ...point, x, y };
  });

  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect x="0" y="0" width={width} height={height} fill="none" />
      <path d={path} fill="none" stroke="#0e6b5c" strokeWidth="3" />
      {coords.map((point) => (
        <circle key={point.label} cx={point.x} cy={point.y} r="4" fill="#0e6b5c" />
      ))}
    </svg>
  );
};

export default function Home() {
   const [userLoading, setUserLoading] = useState(true);
  const [form, setForm] = useState(createEmptyEntry());
  const [entries, setEntries] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
      const loadEmployees = async () => {
      try {
        const response = await fetch("/api/employees", {
  credentials: "include"
});
        if (!response.ok) return;
        const data = await response.json();
        setEmployees(data.employees || []);
        if (data.employees?.length) {
          setSelectedEmployee(data.employees[0].id);
        }
      } catch {
        setEmployees([]);
      }
    };
  const [riskAnswers, setRiskAnswers] = useState({
    horizon: "3-5",
    volatility: "medium",
    goal: "balanced"
  });
  const [marketTrends, setMarketTrends] = useState({
    asOf: "Loading...",
    highlights: [],
    pdfUrl: null,
    loading: true,
    error: "",
    lastUpdated: null
  });
  const [aiPlanBullets, setAiPlanBullets] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiHistory, setAiHistory] = useState([]);
  const [goalForm, setGoalForm] = useState({
    goalName: "Emergency fund",
    targetAmount: "200000",
    timelineMonths: "12"
  });
  const [activeStep, setActiveStep] = useState("ctc");
  const [darkMode, setDarkMode] = useState(false);

  const totals = useMemo(() => {
    const ctcMonthly = Number(form.ctcMonthly) || 0;
    const basic = ctcMonthly * 0.4;
const hra = basic * 0.4;
const specialAllowance = ctcMonthly - (basic + hra);
    const otherEarnings = Number(form.otherEarnings) || 0;
    const grossMonthly = ctcMonthly + otherEarnings;

const deductions = form.deductions.map((deduction) => {
  const value = Number(deduction.value) || 0;
  const amount =
    deduction.type === "percent" ? (ctcMonthly * value) / 100 : value;

  return {
    ...deduction,
    amount,
  };
});

    const totalDeductions = deductions.reduce(
      (sum, item) => sum + item.amount,
      0
    );

    const deductionsWithPercent = deductions.map((item) => ({
  ...item,
  percentage: totalDeductions
    ? (item.amount / totalDeductions) * 100
    : 0
}));
    const inHandMonthly = grossMonthly - totalDeductions;

return {
  ctcMonthly,
  basic,
  hra,
  specialAllowance,
  grossMonthly,
  totalDeductions,
  inHandMonthly,
  deductions: deductionsWithPercent
};
  }, [form]);

  useEffect(() => {
const loadUser = async () => {
  try {
    const response = await fetch("/api/auth/me");

    if (!response.ok) {
      setUserLoading(false);
      return;
    }

    const data = await response.json();
    setCurrentUser(data.user || null);
  } catch {
    setCurrentUser(null);
  } finally {
    setUserLoading(false); // ✅ important
  }
};

const loadEntries = async () => {
  try {
    setLoading(true);
    const response = await fetch("/api/payroll");

    if (!response.ok) {
      throw new Error("Failed to load entries.");
    }

    const data = await response.json();
    const loaded = data.entries || [];

    setEntries(loaded);

    // ✅ auto select latest
    if (loaded.length > 0) {
      setSelectedEntry(loaded[0]);
    }
  } catch (err) {
    setError(err.message || "Unable to load entries.");
  } finally {
    setLoading(false);
  }
};



    loadUser();
    loadEntries();

  }, []);

  useEffect(() => {
  if (currentUser?.role === "admin") {
    loadEmployees();
  }
}, [currentUser]);


const [logs, setLogs] = useState([]);

useEffect(() => {
  if (currentUser?.role === "admin") {
    fetch("/api/logs")
      .then(res => res.json())
      .then(data => setLogs(data.logs || []));
  }
}, [currentUser]);

  const loadTrends = async (force = false) => {
    try {
      setMarketTrends((prev) => ({ ...prev, loading: true, error: "" }));
      const response = await fetch(`/api/market-trends${force ? "?refresh=1" : ""}`);
      if (!response.ok) {
        throw new Error("Unable to load trends.");
      }
      const data = await response.json();
      setMarketTrends({
        asOf: data.asOf || "Latest",
        highlights: data.highlights || [],
        pdfUrl: data.pdfUrl || null,
        loading: false,
        error: "",
        lastUpdated: data.fetchedAt || new Date().toISOString()
      });
    } catch (err) {
      setMarketTrends((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Unable to load trends."
      }));
    }
  };

  const loadAiHistory = async () => {
    try {
      const response = await fetch("/api/ai/savings-plan");
      if (!response.ok) return;
      const data = await response.json();
      setAiHistory(data.plans || []);
    } catch {
      setAiHistory([]);
    }
  };

  useEffect(() => {
    loadTrends();
    loadAiHistory();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const updateDeduction = (index, field) => (event) => {
    const value = event.target.value;
    setForm((prev) => {
      const deductions = [...prev.deductions];
      deductions[index] = { ...deductions[index], [field]: value };
      return { ...prev, deductions };
    });
  };

  const addDeduction = () => {
    setForm((prev) => ({
      ...prev,
      deductions: [
        ...prev.deductions,
        { id: crypto.randomUUID(), label: "", type: "amount", value: "" }
      ]
    }));
  };

  const removeDeduction = (index) => {
    setForm((prev) => ({
      ...prev,
      deductions: prev.deductions.filter((_, idx) => idx !== index)
    }));
  };

  const resetForm = () => {
    setForm(createEmptyEntry());
  };

  const submitEntry = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

  
    try {
        const selectedEmp = employees.find(e => e.id == selectedEmployee);
const payload = {
  employeeId: currentUser?.role === "admin" ? selectedEmployee : undefined,


employeeName:
  currentUser?.role === "admin"
    ? selectedEmp?.name
    : currentUser?.name || "Unknown",
  role: form.role,

  ctcMonthly: totals.ctcMonthly,
  grossMonthly: totals.grossMonthly,          // ✅ ADD
  totalDeductions: totals.totalDeductions,    // ✅ ADD
  inHandMonthly: totals.inHandMonthly,        // ✅ ADD

  otherEarnings: Number(form.otherEarnings) || 0,
  notes: form.notes,

  deductions: totals.deductions.map((item) => ({
    label: item.label,
    type: item.type,
    value: Number(item.value) || 0
  }))
};

      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Unable to save entry.");
      }

      const data = await response.json();
      setEntries(data.entries || []);
      setSuccess("Entry saved successfully.");
      resetForm();
      setActiveStep("ctc");
    } catch (err) {
      setError(err.message || "Unable to save entry.");
    } finally {
      setSaving(false);
    }
  };

  const profile = useMemo(() => {
    const score =
      (riskAnswers.horizon === "10+" ? 4 : riskAnswers.horizon === "5-10" ? 3 : 2) +
      (riskAnswers.volatility === "high" ? 4 : riskAnswers.volatility === "medium" ? 3 : 1) +
      (riskAnswers.goal === "growth" ? 3 : riskAnswers.goal === "balanced" ? 2 : 1);
    return selectProfile(score);
  }, [riskAnswers]);

  const inHandSuggested = totals.inHandMonthly > 0 ? totals.inHandMonthly : 0;
  const monthlyInvestable = Math.max(inHandSuggested * 0.3, 0);

  const trendPlan = useMemo(() => {
    const bullets = [
      "Core equity: broad-market index funds (e.g., Nifty 50 index) through SIPs.",
      "Stability: short-duration debt or money-market funds for near-term needs.",
      "Diversifier: gold ETFs or sovereign gold bonds for 5-10% allocation."
    ];

    if (profile.id === "aggressive") {
      bullets.splice(
        2,
        0,
        "Growth tilt: add a smaller slice of mid/small-cap index exposure."
      );
    } else if (profile.id === "conservative") {
      bullets.splice(
        2,
        0,
        "Lower volatility: keep a higher share in debt and liquid instruments."
      );
    } else {
      bullets.splice(
        2,
        0,
        "Balanced tilt: mix large-cap index with limited mid-cap exposure."
      );
    }

    return bullets;
  }, [profile.id]);

  const updateGoalField = (field) => (event) => {
    setGoalForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const generateAiPlan = async () => {
    try {
      setAiLoading(true);
      setAiError("");
      setAiPlanBullets([]);

      const response = await fetch("/api/ai/savings-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inHandMonthly: totals.inHandMonthly,
          monthlyInvestable,
          goalName: goalForm.goalName,
          targetAmount: goalForm.targetAmount,
          timelineMonths: goalForm.timelineMonths,
          riskProfile: profile.label
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const detail = data.detail ? ` ${data.detail}` : "";
        throw new Error(`${data.error || "AI request failed."}${detail}`);
      }

      const data = await response.json();
      setAiPlanBullets(data.plan?.bullets || data.bullets || []);
      setAiHistory(data.plans || []);
    } catch (err) {
      setAiError(err.message || "Unable to generate plan.");
    } finally {
      setAiLoading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  const stepIndex = steps.findIndex((step) => step.id === activeStep);

  const savingsTrendPoints = useMemo(() => {
    if (!aiHistory.length) {
      return [
        { label: "M1", value: 1 },
        { label: "M2", value: 2 },
        { label: "M3", value: 3 },
        { label: "M4", value: 4 }
      ];
    }
    return aiHistory
      .slice(0, 6)
      .reverse()
      .map((plan, index) => ({
        label: `P${index + 1}`,
        value: Number(plan.targetAmount || 0) || 1
      }));
  }, [aiHistory]);
const Payslip = () => {
  if (!selectedEntry) return <div>No entry selected</div>;

  const monthName = new Date(0, selectedMonth).toLocaleString("en-IN", {
    month: "long"
  });

  return (
    <div id="payslip" className="payslip-doc">

      {/* HEADER */}
      <div className="header">
        <div>
          <h1>SEPM Pvt Ltd</h1>
          <p>Payroll Department</p>
        </div>
        <div className="payslip-title">
          <h2>Payslip</h2>
          <span>{monthName} {selectedYear}</span>
        </div>
      </div>

      <div className="divider" />

      {/* EMPLOYEE INFO */}
      <div className="info-grid">
        <div><strong>Employee</strong><span>{selectedEntry.employeeName}</span></div>
        <div><strong>Role</strong><span>{selectedEntry.role}</span></div>
        <div><strong>Date</strong><span>{new Date().toLocaleDateString()}</span></div>
        <div><strong>Status</strong><span className="paid">Paid</span></div>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Earnings</th>
              <th>Amount</th>
              <th>Deductions</th>
              <th>Amount</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>CTC</td>
              <td>{formatCurrency(selectedEntry.ctcMonthly)}</td>
              <td>Provident Fund</td>
              <td>{formatCurrency(selectedEntry.deductions?.[0]?.amount || 0)}</td>
            </tr>

            <tr>
              <td>Gross Salary</td>
              <td>{formatCurrency(selectedEntry.grossMonthly)}</td>
              <td>ESIC</td>
              <td>{formatCurrency(selectedEntry.deductions?.[1]?.amount || 0)}</td>
            </tr>

            <tr className="total">
              <td>Total Earnings</td>
              <td>{formatCurrency(selectedEntry.grossMonthly)}</td>
              <td>Total Deductions</td>
              <td>{formatCurrency(selectedEntry.totalDeductions)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* NET SALARY */}
      <div className="net-salary">
        <span>Net Salary</span>
        <strong>{formatCurrency(selectedEntry.inHandMonthly)}</strong>
      </div>

      {/* FOOTER */}
      <p className="footer">This is a system-generated payslip.</p>
    </div>
  );
};

const downloadPayslip = async () => {
  const element = document.getElementById("payslip");
  if (!element) return;

  await new Promise((r) => setTimeout(r, 300));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = 210;   // A4 width in mm
  const pageHeight = 297;  // A4 height in mm

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 0;

  // ✅ Multi-page support (important if content grows)
  if (imgHeight > pageHeight) {
    let heightLeft = imgHeight;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
  } else {
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
  }

  const monthName = new Date(0, selectedMonth).toLocaleString("en-IN", {
    month: "long"
  });

  const fileName = `Payslip_${selectedEntry.employeeName}_${monthName}_${selectedYear}.pdf`;

  pdf.save(fileName);
};

const salaryBreakdown = [
  { label: "Basic", amount: totals.basic },
  { label: "HRA", amount: totals.hra },
  { label: "Special", amount: totals.specialAllowance }
];

  return (
    <div className="page">
      <header className="hero">
        <div className="hero-content">
          <p className="eyebrow">SEPM Payroll Management System</p>
          <h1>Calculate take-home salary with precision and proof.</h1>
          <p className="subhead">
            Enter monthly CTC, set custom deductions like PF, ESIC, tax, or
            loans, and store every calculation securely in your backend.
          </p>
          <div className="summary">
            <div className="summary-card">
              <span>Gross Pay</span>
              <strong>
                <CurrencyText value={totals.grossMonthly} />
              </strong>
              <p>CTC + other earnings</p>
            </div>
            <div className="summary-card">
              <span>Total Deductions</span>
              <strong>
                <CurrencyText value={totals.totalDeductions} />
              </strong>
              <p>Calculated from rules</p>
            </div>
            <div className="summary-card">
              <span>In-Hand Salary</span>
              <strong>
                <CurrencyText value={totals.inHandMonthly} />
              </strong>
              <p>Net payable this month</p>
            </div>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-card">
            <h2>What this system delivers</h2>
            <ul>
              <li>Percentage or fixed deductions</li>
              <li>Instant totals and take-home pay</li>
              <li>Saved payroll history for review</li>
            </ul>
            <div className="hero-tag">SEPM-ready demo</div>
          </div>
          <div className="hero-card accent">
            <h3>Logged in</h3>
<p>
  {userLoading
    ? "Loading..."
    : currentUser
    ? `${currentUser.name} (${currentUser.role})`
    : "Not logged in"}
</p>
            <div className="hero-actions">
              <button className="button ghost" type="button" onClick={logout}>
                Log out
              </button>
              <button
                className={`button ghost ${darkMode ? "active" : ""}`}
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
              >
                {darkMode ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="panel stepper">
          <div className="stepper-bar">
            {steps.map((step, index) => (
              <button
                key={step.id}
                className={`step-chip ${index <= stepIndex ? "active" : ""}`}
                type="button"
                onClick={() => setActiveStep(step.id)}
              >
                <span>{index + 1}</span>
                {step.label}
              </button>
            ))}
          </div>
          <p className="stepper-note">
            Follow the flow: CTC → Deductions → Plan → Save.
          </p>
        </section>

<section className="panel">
          <div className="panel-head">
            <div>
              <h2>AI Savings Goal Planner</h2>
              <p>
                AI generates a goal-based monthly plan using your in-hand salary
                and risk profile. Educational only.
              </p>
            </div>
            <span className="status">AI-powered</span>
          </div>

          <div className="ai-grid">
            <div className="ai-form">
              <label>
                Goal name
                <input
                  type="text"
                  value={goalForm.goalName}
                  onChange={updateGoalField("goalName")}
                />
              </label>
              <label>
                Target amount (INR)
                <input
                  type="number"
                  min="0"
                  value={goalForm.targetAmount}
                  onChange={updateGoalField("targetAmount")}
                />
              </label>
              <label>
                Timeline (months)
                <input
                  type="number"
                  min="1"
                  value={goalForm.timelineMonths}
                  onChange={updateGoalField("timelineMonths")}
                />
              </label>
              <button
                className="button"
                type="button"
                onClick={generateAiPlan}
                disabled={aiLoading}
              >
                {aiLoading ? "Generating..." : "Generate Plan"}
              </button>
              {aiError && <p className="error-text">{aiError}</p>}
            </div>

            <div className="ai-output">
              {aiPlanBullets.length ? (
                <ul className="ai-list">
                  {aiPlanBullets.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="empty">AI plan will appear here.</p>
              )}
            </div>
          </div>

          <div className="ai-history">
            <div className="panel-head compact">
              <h3>Saved Plans</h3>
              <span className="status">{aiHistory.length} plans</span>
            </div>
            {aiHistory.length === 0 ? (
              <p className="empty">No plans saved yet.</p>
            ) : (
              <div className="history-grid">
                {aiHistory.map((plan) => (
                  <div className="history-card" key={plan.id}>
                    <div className="history-head">
                      <strong>{plan.goalName}</strong>
                      <span>{plan.riskProfile}</span>
                    </div>
                    <p>
                      Target: ₹{Number(plan.targetAmount || 0).toLocaleString("en-IN")} in{" "}
                      {plan.timelineMonths || 0} months
                    </p>
                    <p className="disclaimer">
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="panel charts">
          <div className="panel-head">
            <div>
              <h2>Payroll Insights</h2>
              <p>Visual breakdown of deductions and savings trends.</p>
            </div>
            <span className="status">Live charts</span>
          </div>
          <div className="charts-grid">
            <div className="chart-card">
              
              <h3>Deductions Split</h3>
              <PieChart items={totals.deductions} />
<ul className="chart-legend">
  {totals.deductions.map((item) => (
    <li key={item.label}>
      <span>{item.label}</span>
      <strong>
        {item.percentage.toFixed(1)}% (
        <CurrencyText value={item.amount} />)
      </strong>
    </li>
  ))}
</ul>
            </div>

            <div className="chart-card">
  <h3>Salary Breakdown</h3>
  <PieChart items={salaryBreakdown} />
</div>
            <div className="chart-card">
              <h3>Savings Plan Trend</h3>
              <LineChart points={savingsTrendPoints} />
              <p className="disclaimer">
                Trend shows recent saved plan targets.
              </p>
            </div>
          </div>
        </section>

<section className="panel">
          <div className="panel-head">
            <div>
              <h2>Investment Guidance (India)</h2>
              <p>
                Answer a few questions to get a suggested monthly allocation
                plan. This is educational, not financial advice.
              </p>
            </div>
            <span className="status">{profile.label} profile</span>
          </div>

          <div className="guide-grid">
            <div className="guide-form">
              <div className="question">
                <h3>Investment Horizon</h3>
                <div className="options">
                  {[
                    { id: "3-5", label: "3-5 years" },
                    { id: "5-10", label: "5-10 years" },
                    { id: "10+", label: "10+ years" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`chip ${riskAnswers.horizon === option.id ? "active" : ""}`}
                      onClick={() =>
                        setRiskAnswers((prev) => ({ ...prev, horizon: option.id }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="question">
                <h3>Comfort With Market Volatility</h3>
                <div className="options">
                  {[
                    { id: "low", label: "Low" },
                    { id: "medium", label: "Medium" },
                    { id: "high", label: "High" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`chip ${riskAnswers.volatility === option.id ? "active" : ""}`}
                      onClick={() =>
                        setRiskAnswers((prev) => ({ ...prev, volatility: option.id }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="question">
                <h3>Primary Goal</h3>
                <div className="options">
                  {[
                    { id: "safety", label: "Capital safety" },
                    { id: "balanced", label: "Balanced growth" },
                    { id: "growth", label: "Maximum growth" }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`chip ${riskAnswers.goal === option.id ? "active" : ""}`}
                      onClick={() =>
                        setRiskAnswers((prev) => ({ ...prev, goal: option.id }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="guide-output">
              <div className="callout">
                <h3>Suggested Monthly Investing</h3>
                <p>
                  Estimated investable amount:{" "}
                  <strong>
                    <CurrencyText value={monthlyInvestable} />
                  </strong>{" "}
                  (30% of in-hand salary).
                </p>
              </div>
              <ul className="allocation">
                {profile.allocation.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}%</strong>
                  </li>
                ))}
              </ul>
              <div className="tips">
                <h3>How to use this plan</h3>
                <ul>
                  <li>Build an emergency fund before aggressive investing.</li>
                  <li>Use SIPs to invest monthly and stay consistent.</li>
                  <li>Review and rebalance every 6-12 months.</li>
                  <li>Consider tax-saving options as per your eligibility.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

<section className="panel">
          <div className="panel-head">
            <div>
              <h2>Market-Trends Guidance</h2>
              <p>
                Based on the latest published mutual fund trends (as of{" "}
                {marketTrends.asOf}). This suggests investment categories, not
                specific funds.
              </p>
            </div>
            <div className="refresh-row">
              <span className="status">Trend-aware</span>
              <button
                className="refresh-button"
                type="button"
                onClick={() => loadTrends(true)}
                disabled={marketTrends.loading}
              >
                {marketTrends.loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="market-grid">
            <div className="market-card">
              <h3>Latest Trend Snapshot</h3>
              {marketTrends.loading ? (
                <p className="loading">Loading latest AMFI note...</p>
              ) : marketTrends.error ? (
                <p className="empty">{marketTrends.error}</p>
              ) : (
                <ul>
                  {marketTrends.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {marketTrends.pdfUrl && (
                <a
                  className="source-link"
                  href={marketTrends.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View AMFI Monthly Note
                </a>
              )}
              {marketTrends.lastUpdated && (
                <p className="disclaimer">
                  Last refreshed:{" "}
                  {new Date(marketTrends.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>

            <div className="market-card">
              <h3>Suggested Entities (Categories)</h3>
              <ul>
                {trendPlan.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="disclaimer">
                Mutual fund investments are subject to market risks. Read all
                scheme-related documents carefully.
              </p>
            </div>
          </div>
        </section>

        {currentUser?.role === "admin" && (
          <section className="panel directory">
            <div className="panel-head">
              <div>
                <h2>Employee Directory</h2>
                <p>Manage employee profiles and payroll history.</p>
              </div>
              <span className="status">{employees.length} employees</span>
            </div>
            <div className="directory-grid">
              {employees.map((employee) => (
                <div className="directory-card" key={employee.id}>
                  <strong>{employee.name}</strong>
                  <p>{employee.department}</p>
                  <p className="disclaimer">{employee.username}</p>
                </div>
              ))}
            </div>
          </section>
        )}

     <section className="panel">
  <div className="panel-head">
    <div>
      <h2>CTC & Earnings</h2>
      <p>Start by entering employee and salary details.</p>
    </div>
  </div>

  <form className="form" onSubmit={(e) => e.preventDefault()}>

    {/* EMPLOYEE */}
    {currentUser?.role === "admin" && (
      <div className="ctc-field">
        <label>Employee</label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
        >
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} ({employee.department})
            </option>
          ))}
        </select>
      </div>
    )}

    {/* GRID */}
    <div className="ctc-grid">


      {/* ROLE */}
      <div className="ctc-field">
        <label>Role / Department</label>
        <input
          type="text"
          placeholder="e.g., Finance"
          value={form.role}
          onChange={updateField("role")}
        />
      </div>

      {/* CTC */}
      <div className="ctc-field">
        <label>CTC (Monthly)</label>
        <div className="input-with-prefix">
          <span>₹</span>
          <input
            type="number"
            value={form.ctcMonthly}
            onChange={updateField("ctcMonthly")}
          />
        </div>
      </div>

      {/* OTHER EARNINGS */}
      <div className="ctc-field">
        <label>Other Earnings</label>
        <div className="input-with-prefix">
          <span>₹</span>
          <input
            type="number"
            value={form.otherEarnings}
            onChange={updateField("otherEarnings")}
          />
        </div>
      </div>

    </div>

    {/* NOTES */}
    <div className="ctc-field">
      <label>Notes</label>
      <textarea
        rows={3}
        placeholder="Optional notes about the payroll cycle"
        value={form.notes}
        onChange={updateField("notes")}
      />
    </div>

  </form>

  <div className="step-actions">
    <button
      className="button"
      type="button"
      onClick={() => setActiveStep("deductions")}
    >
      Next: Deductions
    </button>
  </div>
</section>

        <section className={`panel ${activeStep === "deductions" ? "active-step" : ""}`}>
          <div className="panel-head">
            <div>
              <h2>Deductions</h2>
              <p>Add PF, ESIC, or any custom deduction rules.</p>
            </div>
          </div>
          <div className="deductions">
            <div className="deductions-head">
              <h3>Deduction Rules</h3>
              <button className="button ghost" type="button" onClick={addDeduction}>
                Add Deduction
              </button>
            </div>
            <div className="deductions-grid">
              {form.deductions.map((item, index) => (
                <div className="deduction-row" key={item.id || index}>
                  <input
                    type="text"
                    placeholder="Deduction label"
                    value={item.label}
                    onChange={updateDeduction(index, "label")}
                  />
                  <select
                    value={item.type}
                    onChange={updateDeduction(index, "type")}
                  >
                    <option value="percent">% of CTC</option>
                    <option value="amount">Fixed amount</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={item.value}
                    onChange={updateDeduction(index, "value")}
                  />
                  <div className="deduction-amount">
                    <>
  <CurrencyText value={totals.deductions[index]?.amount || 0} />
  <small>
    ({totals.deductions[index]?.percentage?.toFixed(1) || 0}%)
  </small>
</>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => removeDeduction(index)}
                    aria-label="Remove deduction"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="step-actions">
            <button className="button ghost" type="button" onClick={() => setActiveStep("ctc")}
            >
              Back
            </button>
            <button className="button" type="button" onClick={() => setActiveStep("plan")}
            >
              Next: Plan
            </button>
          </div>
        </section>

        <section className={`panel ${activeStep === "plan" ? "active-step" : ""}`}>
          <div className="panel-head">
            <div>
              <h2>Plan Review</h2>
              <p>Review in-hand salary and the suggested plan.</p>
            </div>
          </div>
          <div className="plan-grid">
<div className="plan-card">
  <h3>Salary Structure</h3>
  <ul>
    <p>Basic (40%): <strong><CurrencyText value={totals.basic} /></strong></p>
    <p>HRA (40% of Basic): <strong><CurrencyText value={totals.hra} /></strong></p>
    <p>Special Allowance: <strong><CurrencyText value={totals.specialAllowance} /></strong></p>
  </ul>
</div>
            <div className="plan-card">
  <h3>CTC Breakdown</h3>
  <ul>
    <p>CTC: <strong><CurrencyText value={totals.ctcMonthly} /></strong></p>
    <p>Other Earnings: <strong><CurrencyText value={form.otherEarnings} /></strong></p>
    <p>Gross Salary: <strong><CurrencyText value={totals.grossMonthly} /></strong></p>
    <p>Total Deductions: <strong><CurrencyText value={totals.totalDeductions} /></strong></p>
    <p>Net Salary: <strong><CurrencyText value={totals.inHandMonthly} /></strong></p>
  </ul>
</div>
            <div className="plan-card">
              <h3>Suggested Allocation</h3>
              <ul>
                {profile.allocation.map((item) => (
                  <p key={item.label}>
                    {item.label}: <strong>{item.value}%</strong>
                  </p>
                ))}
              </ul>
            </div>
          </div>
          <div className="step-actions">
            <button className="button ghost" type="button" onClick={() => setActiveStep("deductions")}
            >
              Back
            </button>
            <button className="button" type="button" onClick={() => setActiveStep("save")}
            >
              Next: Save
            </button>
          </div>
        </section>

<section className={`panel ${activeStep === "save" ? "active-step" : ""}`}>
  
  <div className="panel-head improved">

    {/* LEFT SIDE */}
    <div>
      <h2>Save Entry</h2>
      <p>Finalize and save this payroll record.</p>

      <div className="payslip-filters improved">
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
          {Array.from({ length: 12 }).map((_, i) => (
            <option key={i} value={i}>
              {new Date(0, i).toLocaleString("en-IN", { month: "long" })}
            </option>
          ))}
        </select>

        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
          {[2023, 2024, 2025, 2026].map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
    </div>

    {/* RIGHT SIDE */}
    <div className="action-box">
<button
  className="button primary"
  type="button"
  onClick={submitEntry}
  disabled={saving}
>
  {saving ? "Saving..." : "Save Entry"}
</button>

      <div className="status-row">
        {error && <span className="status error">{error}</span>}
        {success && <span className="status success">{success}</span>}
      </div>
    </div>

  </div>

</section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Saved Entries {entries.length} </h2>           
              <p>Latest payroll calculations stored in your backend.</p>
            </div>

<button
  className="button"
  type="button"
  onClick={downloadPayslip}
  disabled={!selectedEntry}
>
  Download Payslip (PDF)
</button>
          </div>
          

          {loading ? (
            <p className="loading">Loading entries...</p>
          ) : entries.length === 0 ? (
            <p className="empty">No entries saved yet.</p>
          ) : (
            <div className="table">
              <div className="table-head">
                <span>Employee</span>
                <span>CTC</span>
                <span>Deductions</span>
                <span>In-Hand</span>
                <span>Date</span>
              </div>
              {entries.map((entry) => (
                <div 
  className={`table-row ${selectedEntry?.id === entry.id ? "active-row" : ""}`}
  key={entry.id}
  onClick={() => setSelectedEntry(entry)}
  style={{ cursor: "pointer" }}
>
                  <div>
                    <strong>{entry.employeeName || "Unnamed"}</strong>
                    <p>{entry.role || "Role not set"}</p>
                  </div>
                  <span>
                    <CurrencyText value={entry.ctcMonthly} />
                  </span>
                  <span>
                    <CurrencyText value={entry.totalDeductions} />
                  </span>
                  <span className="accent">
                    <CurrencyText value={entry.inHandMonthly} />
                  </span>
                  <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        {currentUser?.role === "admin" && (
<section className="panel">
  <h2>System Logs</h2>

  <div className="logs-container">
    {logs.map((log) => (
      <div className="log-card" key={log.id}>

        <div className="log-top">
          <span className="log-action">{log.action}</span>
          <span className="log-time">
            {new Date(log.timestamp).toLocaleString()}
          </span>
        </div>

        <div className="log-details">
          <div><strong>User:</strong> {log.userId}</div>
          <div><strong>Entity:</strong> {log.entity}</div>
          <div><strong>ID:</strong> {log.entityId}</div>
        </div>

      </div>
    ))}
  </div>
</section>
)}
      </main>
<div style={{ position: "absolute", left: "-9999px", top: 0 }}>
  <Payslip />
</div>

    </div>
    
  );
}
