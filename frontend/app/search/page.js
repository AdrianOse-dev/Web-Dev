"use client";

import { useState } from "react";
import Link from "next/link";

const API = "http://127.0.0.1:8080";

export default function SearchPage() {
  const [type, setType] = useState("text");
  const [q, setQ] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");

  const runSearch = async (e) => {
    e.preventDefault();
    setError("");

    const params = new URLSearchParams();
    params.set("type", type);
    if (q) params.set("q", q);
    if (authorId) params.set("authorId", authorId);
    if (channelId) params.set("channelId", channelId);
    params.set("page", "1");
    params.set("limit", "10");

    try {
      const res = await fetch(`${API}/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data.results || []);
      setMeta(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <main className="space-y-8">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold mb-4">Search</h1>

        {error && <p className="text-red-400 mb-3">{error}</p>}

        <form onSubmit={runSearch} className="space-y-4">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
          >
            <option value="text">Text search</option>
            <option value="author">Content by author</option>
            <option value="most-posts">User with most posts</option>
            <option value="least-posts">User with least posts</option>
            <option value="highest-ranked">Highest ranked content</option>
            <option value="lowest-ranked">Lowest ranked content</option>
          </select>

          <input
            type="text"
            placeholder="Search text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
          />

          <input
            type="text"
            placeholder="Author ID (for author search)"
            value={authorId}
            onChange={(e) => setAuthorId(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
          />

          <input
            type="text"
            placeholder="Channel ID (optional)"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Search
          </button>
        </form>
      </section>

      {meta && (
        <p className="text-gray-300">
          Type: {meta.type} | Results: {meta.count}
        </p>
      )}

      <section className="space-y-4">
        {results.map((item, index) => (
          <div
            key={index}
            className="border border-gray-700 rounded-xl p-5 bg-gray-900"
          >
            {item.resultType === "post" || item.itemType === "post" ? (
              <>
                <h2 className="text-xl font-semibold">
                  <Link
                    href={`/posts/${item.id}`}
                    className="hover:text-blue-400"
                  >
                    {item.title || "Post"}
                  </Link>
                </h2>
                <p className="text-gray-300 mt-2">
                  {item.body || item.excerpt}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold">Reply</h2>
                <p className="text-gray-300 mt-2">
                  {item.body || item.excerpt}
                </p>
              </>
            )}

            {item.displayName && (
              <p className="text-gray-400 mt-2">
                {item.displayName} — {item.postCount} posts
              </p>
            )}

            {item.score !== undefined && (
              <p className="text-gray-400 mt-2">Score: {item.score}</p>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
