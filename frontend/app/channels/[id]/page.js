"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API = "http://127.0.0.1:8080";

export default function ChannelPostsPage() {
  const params = useParams();
  const channelId = params.id;

  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadChannel = () => {
    fetch(`${API}/channels/${channelId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load channel");
        return res.json();
      })
      .then((data) => setChannel(data))
      .catch((err) => {
        console.error(err);
        setError("Could not load channel.");
      });
  };

  const loadPosts = () => {
    fetch(`${API}/channels/${channelId}/posts`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load posts");
        return res.json();
      })
      .then((data) => setPosts(data))
      .catch((err) => {
        console.error(err);
        setError("Could not load posts.");
      });
  };

  useEffect(() => {
    if (!channelId) return;
    loadChannel();
    loadPosts();
  }, [channelId]);

  const createPost = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          body,
          channelId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create post");
      }

      setTitle("");
      setBody("");
      setMessage("Post created successfully.");
      loadPosts();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <main className="space-y-8">
      <div>
        <Link href="/channels" className="text-blue-400 hover:underline">
          ← Back to channels
        </Link>
      </div>

      {channel && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h1 className="text-3xl font-bold">{channel.name}</h1>
          <p className="text-gray-300 mt-2">
            {channel.description || "No description"}
          </p>
        </section>
      )}

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-semibold mb-4">Create Post</h2>

        {message && <p className="text-green-400 mb-3">{message}</p>}
        {error && <p className="text-red-400 mb-3">{error}</p>}

        <form onSubmit={createPost} className="space-y-4">
          <input
            type="text"
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
          />

          <textarea
            placeholder="Post body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-3 rounded bg-black border border-gray-700"
            rows="5"
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Create Post
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Posts</h2>

        {posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="block border border-gray-700 rounded-xl p-5 bg-gray-900 hover:bg-gray-800"
            >
              <h3 className="text-xl font-semibold">{post.title}</h3>
              <p className="text-gray-300 mt-2">{post.body}</p>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
