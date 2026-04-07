"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API = "http://127.0.0.1:8080";

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadChannels = () => {
    fetch(`${API}/channels`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load channels");
        return res.json();
      })
      .then((data) => setChannels(data))
      .catch((err) => {
        console.error(err);
        setError("Could not load channels.");
      });
  };

  useEffect(() => {
    loadChannels();
  }, []);

  const createChannel = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API}/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create channel");
      }

      setName("");
      setDescription("");
      setMessage("Channel created successfully.");
      loadChannels();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Channels</h1>
        <p className="text-gray-300">Browse channels or create a new one.</p>
      </div>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Create Channel</h2>

        {message && <p className="text-green-400 mb-3">{message}</p>}
        {error && <p className="text-red-400 mb-3">{error}</p>}

        <form onSubmit={createChannel} className="space-y-4">
          <input
            type="text"
            placeholder="Channel name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
            rows="4"
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Create Channel
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">All Channels</h2>

        {channels.length === 0 ? (
          <p>No channels found.</p>
        ) : (
          channels.map((channel) => (
            <Link
              key={channel.id}
              href={`/channels/${channel.id}`}
              className="block border border-gray-700 rounded-xl p-5 bg-gray-900 hover:bg-gray-800"
            >
              <h3 className="text-xl font-semibold">{channel.name}</h3>
              <p className="text-gray-300 mt-2">
                {channel.description || "No description"}
              </p>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
