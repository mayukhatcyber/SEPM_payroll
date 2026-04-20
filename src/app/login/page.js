"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState("login");

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "employee",
    name: "",
    department: "",
    email: "" // ✅ added
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    let url = "";

    if (mode === "login") url = "/api/auth/login";
    if (mode === "signup") url = "/api/auth/signup";
    if (mode === "forgot") url = "/api/auth/forgot"; // ✅ new API

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (mode === "login") {
        router.push("/");
      }

      if (mode === "signup") {
        setMode("login");
        setMessage("Account created. Please login.");
      }

      if (mode === "forgot") {
        setMessage("Reset link sent to your email");
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <h1>SEPM Payroll</h1>
        <p>Manage payroll securely</p>

        {/* Tabs */}
        {mode !== "forgot" && (
        <div className="tabs">
          <button type="button" className={mode==="login"?"tab active":"tab"} onClick={()=>setMode("login")}>Login</button>
          <button type="button" className={mode==="signup"?"tab active":"tab"} onClick={()=>setMode("signup")}>Signup</button>
        </div>
        )}

        <form onSubmit={submit} className="login-form">

          {/* LOGIN + SIGNUP */}
          {mode !== "forgot" && (
            <>
              <label>
                Username
               <input className="input" name="username" onChange={handleChange} required />
              </label>

              <label>
                Password
                <input className="input" type="password" name="password" onChange={handleChange} required />
              </label>
            </>
          )}


          {mode === "login" && (
  <p className="forgot-link" onClick={() => setMode("forgot")}>
    Forgot password?
  </p>
)}

          {/* SIGNUP ONLY */}
          {mode === "signup" && (
            <>
              <label>
                Full Name
                <input className="input" name="name" onChange={handleChange} />
              </label>


              <label>
                Department
                <input className="input" name="department" onChange={handleChange} />
              </label>

<label>
  Role
  <select className="input" name="role" onChange={handleChange}>
    <option value="employee">Employee</option>
    <option value="admin">Admin</option>
  </select>
</label>

<label>
  Email
  <input className="input" name="email" onChange={handleChange} required />
</label>
            </>
          )}

          {/* FORGOT PASSWORD */}
{mode === "forgot" && (
  <>
    <label>
      Enter your email
      <input className="input" name="email" onChange={handleChange} required />
    </label>

    <p className="forgot-link" onClick={() => setMode("login")}>
      Back to login
    </p>
  </>
)}

<button className="button" disabled={loading}>
  {loading ? "Processing..." : 
    mode === "forgot" ? "Send Reset Link" : mode.toUpperCase()
  }
</button>

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}

        </form>

      </div>
    </div>
  );
}