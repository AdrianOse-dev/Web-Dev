"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API = "http://127.0.0.1:8080";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const signOut = async () => {
    const token = localStorage.getItem("token");

    try {
      if (token) {
        await fetch(`${API}/auth/signout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.error(err);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <nav className="border-b border-gray-800 bg-gray-950 px-6 py-4">
      <div className="max-w-6xl mx-auto flex flex-wrap gap-6 items-center">
        <Link href="/" className="font-bold text-xl">
          Q&amp;A Tool
        </Link>

        <Link href="/channels" className="hover:text-blue-400">
          Channels
        </Link>

        <Link href="/search" className="hover:text-blue-400">
          Search
        </Link>

        {!user ? (
          <>
            <Link href="/login" className="hover:text-blue-400">
              Login
            </Link>
            <Link href="/signup" className="hover:text-blue-400">
              Sign Up
            </Link>
          </>
        ) : (
          <>
            <span className="text-gray-300">
              Signed in as {user.displayName}
            </span>
            <button
              onClick={signOut}
              className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
