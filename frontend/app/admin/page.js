"use client";

import { useState } from "react";

const API = "http://127.0.0.1:8080";

export default function AdminPage() {
  const [userId, setUserId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [postId, setPostId] = useState("");
  const [replyId, setReplyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const doDelete = async (url, label) => {
    setMessage("");
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in as admin first.");
      return;
    }

    try {
      const res = await fetch(`${API}${url}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to delete ${label}`);
      }

      setMessage(`${label} deleted successfully.`);
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const checkAdmin = async () => {
    setMessage("");
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API}/admin/check`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Admin check failed");
      }

      setMessage("Admin verified successfully.");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <main className="space-y-8">
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>

        <div className="mb-4">
          <button
            onClick={checkAdmin}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Check Admin Access
          </button>
        </div>

        {message && <p className="text-green-400 mb-3">{message}</p>}
        {error && <p className="text-red-400 mb-3">{error}</p>}

        <div className="space-y-6">
          <div className="border border-gray-700 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Delete User</h2>
            <input
              type="text"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full p-3 rounded bg-black border border-gray-700 mb-3"
            />
            <button
              onClick={() => doDelete(`/admin/users/${userId}`, "User")}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Delete User
            </button>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Delete Channel</h2>
            <input
              type="text"
              placeholder="Channel ID"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full p-3 rounded bg-black border border-gray-700 mb-3"
            />
            <button
              onClick={() =>
                doDelete(`/admin/channels/${channelId}`, "Channel")
              }
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Delete Channel
            </button>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Delete Post</h2>
            <input
              type="text"
              placeholder="Post ID"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              className="w-full p-3 rounded bg-black border border-gray-700 mb-3"
            />
            <button
              onClick={() => doDelete(`/admin/posts/${postId}`, "Post")}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Delete Post
            </button>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-3">Delete Reply</h2>
            <input
              type="text"
              placeholder="Reply ID"
              value={replyId}
              onChange={(e) => setReplyId(e.target.value)}
              className="w-full p-3 rounded bg-black border border-gray-700 mb-3"
            />
            <button
              onClick={() => doDelete(`/admin/replies/${replyId}`, "Reply")}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Delete Reply
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
