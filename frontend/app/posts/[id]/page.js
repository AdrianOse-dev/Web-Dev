"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API = "http://127.0.0.1:8080";

function buildReplyTree(replies) {
  const map = {};
  const roots = [];

  replies.forEach((reply) => {
    map[reply.id] = { ...reply, children: [] };
  });

  replies.forEach((reply) => {
    if (reply.parentReplyId && map[reply.parentReplyId]) {
      map[reply.parentReplyId].children.push(map[reply.id]);
    } else {
      roots.push(map[reply.id]);
    }
  });

  return roots;
}

function ReplyNode({
  reply,
  onStartReply,
  onVote,
  onRemoveVote,
  replyVotes,
  onReplyUpload,
  replyAttachments,
}) {
  const [file, setFile] = useState(null);

  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-900 mt-4">
      <p className="text-gray-200">{reply.body}</p>

      <div className="flex flex-wrap gap-3 mt-3">
        <button
          onClick={() => onStartReply(reply.id)}
          className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded"
        >
          Reply
        </button>

        <button
          onClick={() => onVote(reply.id, 1)}
          className="bg-green-700 hover:bg-green-800 px-3 py-1 rounded"
        >
          Upvote
        </button>

        <button
          onClick={() => onVote(reply.id, -1)}
          className="bg-red-700 hover:bg-red-800 px-3 py-1 rounded"
        >
          Downvote
        </button>

        <button
          onClick={() => onRemoveVote(reply.id)}
          className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
        >
          Neutral
        </button>
      </div>

      {replyVotes[reply.id] && (
        <p className="text-sm text-gray-400 mt-2">
          Reply votes → Upvotes: {replyVotes[reply.id].upvotes} | Downvotes:{" "}
          {replyVotes[reply.id].downvotes} | Score: {replyVotes[reply.id].score}
        </p>
      )}

      <div className="mt-4 border-t border-gray-800 pt-4">
        <p className="font-semibold mb-2">Upload screenshot to this reply</p>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => onReplyUpload(reply.id, file)}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Upload
          </button>
        </div>

        {replyAttachments[reply.id] &&
          replyAttachments[reply.id].length > 0 && (
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              {replyAttachments[reply.id].map((attachment) => (
                <div
                  key={attachment.id}
                  className="border border-gray-700 rounded p-3 bg-black"
                >
                  <img
                    src={`${API}/attachments/${attachment.id}/file`}
                    alt={attachment.fileName}
                    className="w-full rounded"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    {attachment.fileName}
                  </p>
                </div>
              ))}
            </div>
          )}
      </div>

      <div className="ml-6">
        {reply.children.map((child) => (
          <ReplyNode
            key={child.id}
            reply={child}
            onStartReply={onStartReply}
            onVote={onVote}
            onRemoveVote={onRemoveVote}
            replyVotes={replyVotes}
            onReplyUpload={onReplyUpload}
            replyAttachments={replyAttachments}
          />
        ))}
      </div>
    </div>
  );
}

export default function PostPage() {
  const params = useParams();
  const postId = params.id;

  const [post, setPost] = useState(null);
  const [postVotes, setPostVotes] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyVotes, setReplyVotes] = useState({});
  const [attachments, setAttachments] = useState([]);
  const [replyAttachments, setReplyAttachments] = useState({});

  const [replyBody, setReplyBody] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [postFile, setPostFile] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const replyTree = useMemo(() => buildReplyTree(replies), [replies]);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const loadPost = () => {
    fetch(`${API}/posts/${postId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load post");
        return res.json();
      })
      .then((data) => setPost(data))
      .catch((err) => {
        console.error(err);
        setError("Could not load post.");
      });
  };

  const loadPostVotes = () => {
    fetch(`${API}/posts/${postId}/vote`)
      .then((res) => res.json())
      .then((data) => setPostVotes(data))
      .catch((err) => console.error(err));
  };

  const loadReplies = () => {
    fetch(`${API}/posts/${postId}/replies`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load replies");
        return res.json();
      })
      .then((data) => {
        setReplies(data);

        Promise.all(
          data.map((reply) =>
            fetch(`${API}/replies/${reply.id}/vote`).then((res) => res.json()),
          ),
        ).then((voteResults) => {
          const map = {};
          data.forEach((reply, index) => {
            map[reply.id] = voteResults[index];
          });
          setReplyVotes(map);
        });

        Promise.all(
          data.map((reply) =>
            fetch(
              `${API}/attachments?targetType=reply&targetId=${reply.id}`,
            ).then((res) => res.json()),
          ),
        ).then((attachmentResults) => {
          const map = {};
          data.forEach((reply, index) => {
            map[reply.id] = attachmentResults[index];
          });
          setReplyAttachments(map);
        });
      })
      .catch((err) => {
        console.error(err);
        setError("Could not load replies.");
      });
  };

  const loadPostAttachments = () => {
    fetch(`${API}/attachments?targetType=post&targetId=${postId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load attachments");
        return res.json();
      })
      .then((data) => setAttachments(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    if (!postId) return;
    loadPost();
    loadPostVotes();
    loadReplies();
    loadPostAttachments();
  }, [postId]);

  const votePost = async (value) => {
    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API}/posts/${postId}/vote`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to vote");

      setMessage("Post vote updated.");
      loadPostVotes();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const removePostVote = async () => {
    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API}/posts/${postId}/vote`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove vote");

      setMessage("Post vote removed.");
      loadPostVotes();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const submitReply = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          body: replyBody,
          postId,
          parentReplyId: replyingTo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create reply");

      setReplyBody("");
      setReplyingTo(null);
      setMessage("Reply created.");
      loadReplies();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const voteReply = async (replyId, value) => {
    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API}/replies/${replyId}/vote`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to vote on reply");

      loadReplies();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const removeReplyVote = async (replyId) => {
    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in first.");
      return;
    }

    try {
      const res = await fetch(`${API}/replies/${replyId}/vote`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove reply vote");

      loadReplies();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const uploadPostAttachment = async () => {
    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in first.");
      return;
    }

    if (!postFile) {
      setError("Please choose a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("screenshot", postFile);
    formData.append("targetType", "post");
    formData.append("targetId", postId);

    try {
      const res = await fetch(`${API}/attachments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessage("Post screenshot uploaded.");
      setPostFile(null);
      loadPostAttachments();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const uploadReplyAttachment = async (replyId, file) => {
    setError("");
    setMessage("");

    if (!token) {
      setError("Please log in first.");
      return;
    }

    if (!file) {
      setError("Please choose a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("screenshot", file);
    formData.append("targetType", "reply");
    formData.append("targetId", replyId);

    try {
      const res = await fetch(`${API}/attachments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setMessage("Reply screenshot uploaded.");
      loadReplies();
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

      {post && (
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h1 className="text-3xl font-bold">{post.title}</h1>
          <p className="text-gray-300 mt-4">{post.body}</p>

          {postVotes && (
            <p className="text-sm text-gray-400 mt-4">
              Upvotes: {postVotes.upvotes} | Downvotes: {postVotes.downvotes} |
              Score: {postVotes.score}
            </p>
          )}

          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => votePost(1)}
              className="bg-green-700 hover:bg-green-800 px-4 py-2 rounded"
            >
              Upvote Post
            </button>

            <button
              onClick={() => votePost(-1)}
              className="bg-red-700 hover:bg-red-800 px-4 py-2 rounded"
            >
              Downvote Post
            </button>

            <button
              onClick={removePostVote}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
            >
              Neutral
            </button>
          </div>
        </section>
      )}

      {message && <p className="text-green-400">{message}</p>}
      {error && <p className="text-red-400">{error}</p>}

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Upload Screenshot to Post
        </h2>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            onChange={(e) => setPostFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={uploadPostAttachment}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Upload
          </button>
        </div>

        {attachments.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="border border-gray-700 rounded p-3 bg-black"
              >
                <img
                  src={`${API}/attachments/${attachment.id}/file`}
                  alt={attachment.fileName}
                  className="w-full rounded"
                />
                <p className="text-sm text-gray-400 mt-2">
                  {attachment.fileName}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-2xl font-semibold mb-4">
          {replyingTo ? `Replying to reply #${replyingTo}` : "Add Reply"}
        </h2>

        <form onSubmit={submitReply} className="space-y-4">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write your reply..."
            className="w-full p-3 rounded bg-black border border-gray-700"
            rows="4"
          />

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
            >
              Submit Reply
            </button>

            {replyingTo && (
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded"
              >
                Cancel Reply Target
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Replies</h2>

        {replyTree.length === 0 ? (
          <p>No replies yet.</p>
        ) : (
          replyTree.map((reply) => (
            <ReplyNode
              key={reply.id}
              reply={reply}
              onStartReply={setReplyingTo}
              onVote={voteReply}
              onRemoveVote={removeReplyVote}
              replyVotes={replyVotes}
              onReplyUpload={uploadReplyAttachment}
              replyAttachments={replyAttachments}
            />
          ))
        )}
      </section>
    </main>
  );
}
