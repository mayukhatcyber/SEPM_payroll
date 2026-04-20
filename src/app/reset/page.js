"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ResetPage() {
  const params = useSearchParams();
  const router = useRouter();

  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setMessage("Password updated successfully");

      setTimeout(() => {
        router.push("/login");
      }, 2000);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Reset Password</h2>

        <form onSubmit={submit}>
          <label>
            New Password
            <input
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button className="button">Update Password</button>

          {error && <p className="error-text">{error}</p>}
          {message && <p className="success-text">{message}</p>}
        </form>
      </div>
    </div>
  );
}