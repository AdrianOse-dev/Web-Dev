"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://127.0.0.1:8080";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const login = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API}/auth/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      router.push("/channels");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <main className="max-w-xl mx-auto">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold mb-4">Login</h1>

        {error && <p className="text-red-400 mb-3">{error}</p>}

        <form onSubmit={login} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Login
          </button>
        </form>
      </section>
    </main>
  );
}
