"use strict";

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const PORT = 8080;
const HOST = "0.0.0.0";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------- DB --------------------
const pool = mysql.createPool({
  host: "db",
  user: "root",
  password: "rootpassword",
  database: "appdb",
  waitForConnections: true,
  connectionLimit: 10,
});

// -------------------- Uploads --------------------
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const allowedExtensions = [".png", ".jpg", ".jpeg", ".webp"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      !allowedMimeTypes.includes(file.mimetype) ||
      !allowedExtensions.includes(ext)
    ) {
      return cb(new Error("Only PNG, JPG/JPEG, and WebP are allowed"));
    }
    cb(null, true);
  },
});

// -------------------- Auth / session --------------------
const sessions = new Map();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function createToken() {
  return crypto.randomUUID();
}

async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const session = sessions.get(token);

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    req.user = session.user;
    req.token = token;
    next();
  } catch (err) {
    res.status(500).json({ error: "Auth check failed" });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// -------------------- Basic rate limiting --------------------
// simple in-memory limiter for login/posting
const rateMap = new Map();

function simpleRateLimit(keyPrefix, maxRequests, windowMs) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip}`;
    const now = Date.now();
    const current = rateMap.get(key);

    if (!current) {
      rateMap.set(key, { count: 1, start: now });
      return next();
    }

    if (now - current.start > windowMs) {
      rateMap.set(key, { count: 1, start: now });
      return next();
    }

    if (current.count >= maxRequests) {
      return res
        .status(429)
        .json({ error: "Too many requests. Please try again later." });
    }

    current.count += 1;
    next();
  };
}

// -------------------- Helpers --------------------
function isValidVoteValue(value) {
  return value === 1 || value === -1;
}

async function getOne(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function recordExists(table, id) {
  const [rows] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
  return rows.length > 0;
}

async function canModifyPost(user, postId) {
  if (user.role === "admin") return true;
  const post = await getOne("SELECT authorId FROM posts WHERE id = ?", [
    postId,
  ]);
  return !!post && post.authorId === user.id;
}

async function canModifyReply(user, replyId) {
  if (user.role === "admin") return true;
  const reply = await getOne("SELECT authorId FROM reply WHERE id = ?", [
    replyId,
  ]);
  return !!reply && reply.authorId === user.id;
}

async function canModifyChannel(user, channelId) {
  if (user.role === "admin") return true;
  const channel = await getOne("SELECT createdBy FROM channels WHERE id = ?", [
    channelId,
  ]);
  return !!channel && channel.createdBy === user.id;
}

async function canModifyAttachment(user, attachmentId) {
  if (user.role === "admin") return true;
  const attachment = await getOne(
    "SELECT uploadedBy FROM attachments WHERE id = ?",
    [attachmentId],
  );
  return !!attachment && attachment.uploadedBy === user.id;
}

// -------------------- Utility / health --------------------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is alive" });
});

// ==========================================================
// 1. AUTH ROUTES
// ==========================================================

// Sign up
app.post(
  "/auth/signup",
  simpleRateLimit("signup", 10, 15 * 60 * 1000),
  async (req, res) => {
    try {
      let { displayName, email, password } = req.body;

      if (!displayName || !email || !password) {
        return res
          .status(400)
          .json({ error: "displayName, email, and password are required" });
      }

      displayName = displayName.trim();
      email = email.trim().toLowerCase();
      password = password.trim();

      if (!displayName || !email || !password) {
        return res
          .status(400)
          .json({ error: "displayName, email, and password cannot be empty" });
      }

      if (
        displayName.length > 100 ||
        email.length > 255 ||
        password.length > 255
      ) {
        return res
          .status(400)
          .json({ error: "One or more fields are too long" });
      }

      const existing = await getOne("SELECT id FROM users WHERE email = ?", [
        email,
      ]);
      if (existing) {
        return res.status(409).json({ error: "Email already exists" });
      }

      const createdAt = Date.now();
      const passwordHash = hashPassword(password);

      const [result] = await pool.query(
        "INSERT INTO users (displayName, email, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?)",
        [displayName, email, passwordHash, "user", createdAt],
      );

      res.status(201).json({
        message: "Account created successfully",
        userId: result.insertId,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to sign up - DB Error" });
    }
  },
);

// Sign in
app.post(
  "/auth/signin",
  simpleRateLimit("signin", 20, 15 * 60 * 1000),
  async (req, res) => {
    try {
      let { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "email and password are required" });
      }

      email = email.trim().toLowerCase();
      password = password.trim();

      const user = await getOne(
        "SELECT id, displayName, email, passwordHash, role FROM users WHERE email = ?",
        [email],
      );

      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const passwordHash = hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = createToken();
      sessions.set(token, {
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
        },
      });

      res.status(200).json({
        message: "Signed in successfully",
        token,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to sign in - DB Error" });
    }
  },
);

// Sign out
app.post("/auth/signout", authRequired, (req, res) => {
  sessions.delete(req.token);
  res.status(200).json({ message: "Signed out successfully" });
});

// Get current user
app.get("/auth/me", authRequired, (req, res) => {
  res.status(200).json({ user: req.user });
});

// ==========================================================
// 2. CHANNEL ROUTES
// ==========================================================

// Get all channels
app.get("/channels", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM channels ORDER BY createdAt DESC",
    );
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load channels - DB Error" });
  }
});

// Get one channel
app.get("/channels/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const channel = await getOne("SELECT * FROM channels WHERE id = ?", [id]);

    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.status(200).json(channel);
  } catch (err) {
    res.status(500).json({ error: "Failed to load channel - DB Error" });
  }
});

// Create a channel
app.post("/channels", authRequired, async (req, res) => {
  try {
    let { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Channel name is required" });
    }

    name = name.trim();
    description = description ? description.trim() : null;

    const existing = await getOne("SELECT id FROM channels WHERE name = ?", [
      name,
    ]);
    if (existing) {
      return res.status(409).json({ error: "Channel name already exists" });
    }

    const createdAt = Date.now();
    const [result] = await pool.query(
      "INSERT INTO channels (name, description, createdBy, createdAt) VALUES (?, ?, ?, ?)",
      [name, description, req.user.id, createdAt],
    );

    res.status(201).json({
      message: "Channel created successfully",
      channelId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create channel - DB Error" });
  }
});

// Update a channel
app.put("/channels/:id", authRequired, async (req, res) => {
  try {
    const id = req.params.id;
    let { name, description } = req.body;

    if (!(await recordExists("channels", id))) {
      return res.status(404).json({ error: "Channel not found" });
    }

    if (!(await canModifyChannel(req.user, id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Channel name is required" });
    }

    name = name.trim();
    description = description ? description.trim() : null;

    const [result] = await pool.query(
      "UPDATE channels SET name = ?, description = ? WHERE id = ?",
      [name, description, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.status(200).json({ message: "Channel updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update channel - DB Error" });
  }
});

// Delete a channel
app.delete("/channels/:id", authRequired, async (req, res) => {
  try {
    const id = req.params.id;

    if (!(await recordExists("channels", id))) {
      return res.status(404).json({ error: "Channel not found" });
    }

    if (!(await canModifyChannel(req.user, id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [result] = await pool.query("DELETE FROM channels WHERE id = ?", [
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.status(200).json({ message: "Channel deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete channel - DB Error" });
  }
});

// ==========================================================
// 3. POST ROUTES
// ==========================================================

// Get posts in a channel
app.get("/channels/:id/posts", async (req, res) => {
  try {
    const id = req.params.id;
    const [rows] = await pool.query(
      "SELECT * FROM posts WHERE channelId = ? ORDER BY createdAt DESC",
      [id],
    );
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to get channel posts - DB Error" });
  }
});

// Get one post
app.get("/posts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const post = await getOne("SELECT * FROM posts WHERE id = ?", [id]);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to get post - DB Error" });
  }
});

// Create a post
app.post(
  "/posts",
  authRequired,
  simpleRateLimit("create-post", 30, 10 * 60 * 1000),
  async (req, res) => {
    try {
      let { title, body, channelId } = req.body;

      if (!title || !body || !channelId) {
        return res
          .status(400)
          .json({ error: "title, body, and channelId are required" });
      }

      title = title.trim();
      body = body.trim();

      if (!title || !body) {
        return res
          .status(400)
          .json({ error: "title and body cannot be empty" });
      }

      const createdAt = Date.now();

      const [result] = await pool.query(
        "INSERT INTO posts (channelId, authorId, title, body, createdAt) VALUES (?, ?, ?, ?, ?)",
        [channelId, req.user.id, title, body, createdAt],
      );

      res.status(201).json({
        message: "Post created successfully",
        postId: result.insertId,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to create post - DB Error" });
    }
  },
);

// Update a post
app.put("/posts/:id", authRequired, async (req, res) => {
  try {
    const id = req.params.id;
    let { title, body } = req.body;

    if (!(await recordExists("posts", id))) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!(await canModifyPost(req.user, id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!title || !body) {
      return res.status(400).json({ error: "title and body are required" });
    }

    title = title.trim();
    body = body.trim();

    if (!title || !body) {
      return res.status(400).json({ error: "title and body cannot be empty" });
    }

    const [result] = await pool.query(
      "UPDATE posts SET title = ?, body = ? WHERE id = ?",
      [title, body, id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json({ message: "Post updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update post - DB Error" });
  }
});

// Delete a post
app.delete("/posts/:id", authRequired, async (req, res) => {
  try {
    const id = req.params.id;

    if (!(await recordExists("posts", id))) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (!(await canModifyPost(req.user, id))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [result] = await pool.query("DELETE FROM posts WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post - DB Error" });
  }
});

// ==========================================================
// 4. REPLY ROUTES
// ==========================================================

// Get replies for a post
app.get("/posts/:postId/replies", async (req, res) => {
  try {
    const postId = req.params.postId;

    const [rows] = await pool.query(
      "SELECT * FROM reply WHERE postId = ? ORDER BY createdAt ASC",
      [postId],
    );

    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load replies - DB Error" });
  }
});

// Create reply
// supports reply to a post or another reply
app.post(
  "/replies",
  authRequired,
  simpleRateLimit("create-reply", 60, 10 * 60 * 1000),
  async (req, res) => {
    try {
      let { body, postId, parentReplyId } = req.body;

      if (!body || !postId) {
        return res.status(400).json({ error: "body and postId are required" });
      }

      body = body.trim();
      if (!body) {
        return res.status(400).json({ error: "Reply body cannot be empty" });
      }

      if (parentReplyId === "" || parentReplyId === undefined) {
        parentReplyId = null;
      }

      const createdAt = Date.now();

      const [result] = await pool.query(
        "INSERT INTO reply (postId, parentReplyId, authorId, body, createdAt) VALUES (?, ?, ?, ?, ?)",
        [postId, parentReplyId, req.user.id, body, createdAt],
      );

      res.status(201).json({
        message: "Reply created successfully",
        replyId: result.insertId,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to create reply - DB Error" });
    }
  },
);

// Update reply
app.put("/replies/:replyId", authRequired, async (req, res) => {
  try {
    const replyId = req.params.replyId;
    let { body } = req.body;

    if (!(await recordExists("reply", replyId))) {
      return res.status(404).json({ error: "Reply not found" });
    }

    if (!(await canModifyReply(req.user, replyId))) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (!body || !body.trim()) {
      return res.status(400).json({ error: "Reply body cannot be empty" });
    }

    body = body.trim();

    const [result] = await pool.query(
      "UPDATE reply SET body = ? WHERE id = ?",
      [body, replyId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reply not found" });
    }

    res.status(200).json({ message: "Reply updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update reply - DB Error" });
  }
});

// Delete reply
app.delete("/replies/:replyId", authRequired, async (req, res) => {
  try {
    const replyId = req.params.replyId;

    if (!(await recordExists("reply", replyId))) {
      return res.status(404).json({ error: "Reply not found" });
    }

    if (!(await canModifyReply(req.user, replyId))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const [result] = await pool.query("DELETE FROM reply WHERE id = ?", [
      replyId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reply not found" });
    }

    res.status(200).json({ message: "Reply deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete reply - DB Error" });
  }
});

// ==========================================================
// 5. VOTE ROUTES
// ==========================================================

// Add or change vote on post
app.put("/posts/:postId/vote", authRequired, async (req, res) => {
  try {
    const postId = req.params.postId;
    const value = req.body.value;

    if (!isValidVoteValue(value)) {
      return res.status(400).json({ error: "Vote value must be 1 or -1" });
    }

    const existing = await getOne(
      "SELECT id FROM vote WHERE userId = ? AND targetType = ? AND targetId = ?",
      [req.user.id, "post", postId],
    );

    if (!existing) {
      await pool.query(
        "INSERT INTO vote (userId, targetType, targetId, value) VALUES (?, ?, ?, ?)",
        [req.user.id, "post", postId, value],
      );
    } else {
      await pool.query(
        "UPDATE vote SET value = ? WHERE userId = ? AND targetType = ? AND targetId = ?",
        [value, req.user.id, "post", postId],
      );
    }

    res.status(200).json({ message: "Post vote recorded successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to record post vote - DB Error" });
  }
});

// Remove vote from post
app.delete("/posts/:postId/vote", authRequired, async (req, res) => {
  try {
    const postId = req.params.postId;

    const [result] = await pool.query(
      "DELETE FROM vote WHERE userId = ? AND targetType = ? AND targetId = ?",
      [req.user.id, "post", postId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vote not found" });
    }

    res.status(200).json({ message: "Post vote removed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove post vote - DB Error" });
  }
});

// Get vote info for post
app.get("/posts/:postId/vote", async (req, res) => {
  try {
    const postId = req.params.postId;

    const [rows] = await pool.query(
      `SELECT
         COUNT(CASE WHEN value = 1 THEN 1 END) AS upvotes,
         COUNT(CASE WHEN value = -1 THEN 1 END) AS downvotes,
         COALESCE(SUM(value), 0) AS score
       FROM vote
       WHERE targetType = ? AND targetId = ?`,
      ["post", postId],
    );

    res.status(200).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get post vote info - DB Error" });
  }
});

// Add or change vote on reply
app.put("/replies/:replyId/vote", authRequired, async (req, res) => {
  try {
    const replyId = req.params.replyId;
    const value = req.body.value;

    if (!isValidVoteValue(value)) {
      return res.status(400).json({ error: "Vote value must be 1 or -1" });
    }

    const existing = await getOne(
      "SELECT id FROM vote WHERE userId = ? AND targetType = ? AND targetId = ?",
      [req.user.id, "reply", replyId],
    );

    if (!existing) {
      await pool.query(
        "INSERT INTO vote (userId, targetType, targetId, value) VALUES (?, ?, ?, ?)",
        [req.user.id, "reply", replyId, value],
      );
    } else {
      await pool.query(
        "UPDATE vote SET value = ? WHERE userId = ? AND targetType = ? AND targetId = ?",
        [value, req.user.id, "reply", replyId],
      );
    }

    res.status(200).json({ message: "Reply vote recorded successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to record reply vote - DB Error" });
  }
});

// Remove vote from reply
app.delete("/replies/:replyId/vote", authRequired, async (req, res) => {
  try {
    const replyId = req.params.replyId;

    const [result] = await pool.query(
      "DELETE FROM vote WHERE userId = ? AND targetType = ? AND targetId = ?",
      [req.user.id, "reply", replyId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Vote not found" });
    }

    res.status(200).json({ message: "Reply vote removed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove reply vote - DB Error" });
  }
});

// Get vote info for reply
app.get("/replies/:replyId/vote", async (req, res) => {
  try {
    const replyId = req.params.replyId;

    const [rows] = await pool.query(
      `SELECT
         COUNT(CASE WHEN value = 1 THEN 1 END) AS upvotes,
         COUNT(CASE WHEN value = -1 THEN 1 END) AS downvotes,
         COALESCE(SUM(value), 0) AS score
       FROM vote
       WHERE targetType = ? AND targetId = ?`,
      ["reply", replyId],
    );

    res.status(200).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get reply vote info - DB Error" });
  }
});

// ==========================================================
// 6. ATTACHMENT / UPLOAD ROUTES
// ==========================================================

// Upload screenshot to post or reply
// form-data:
// file -> screenshot
// targetType -> post or reply
// targetId -> the post/reply id
app.post(
  "/attachments",
  authRequired,
  upload.single("screenshot"),
  async (req, res) => {
    try {
      const { targetType, targetId } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: "No screenshot uploaded" });
      }

      if (!targetType || !targetId) {
        return res
          .status(400)
          .json({ error: "targetType and targetId are required" });
      }

      if (targetType !== "post" && targetType !== "reply") {
        return res
          .status(400)
          .json({ error: "targetType must be 'post' or 'reply'" });
      }

      if (targetType === "post" && !(await recordExists("posts", targetId))) {
        return res.status(404).json({ error: "Post not found" });
      }

      if (targetType === "reply" && !(await recordExists("reply", targetId))) {
        return res.status(404).json({ error: "Reply not found" });
      }

      const createdAt = Date.now();
      const filePath = path
        .join("uploads", req.file.filename)
        .replace(/\\/g, "/");

      const [result] = await pool.query(
        "INSERT INTO attachments (targetType, targetId, mimeType, sizeBytes, fileName, filePath, uploadedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          targetType,
          targetId,
          req.file.mimetype,
          req.file.size,
          req.file.originalname,
          filePath,
          req.user.id,
          createdAt,
        ],
      );

      res.status(201).json({
        message: "Attachment uploaded successfully",
        attachmentId: result.insertId,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        targetType,
        targetId,
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to upload attachment - DB Error" });
    }
  },
);

// Get attachment metadata
app.get("/attachments/:attachmentId", async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;
    const attachment = await getOne("SELECT * FROM attachments WHERE id = ?", [
      attachmentId,
    ]);

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    res.status(200).json(attachment);
  } catch (err) {
    res.status(500).json({ error: "Failed to get attachment - DB Error" });
  }
});

// Get attachment image/file
app.get("/attachments/:attachmentId/file", async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;
    const attachment = await getOne("SELECT * FROM attachments WHERE id = ?", [
      attachmentId,
    ]);

    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const absolutePath = path.join(__dirname, attachment.filePath);

    if (!fs.existsSync(absolutePath)) {
      return res
        .status(404)
        .json({ error: "Attachment file not found on disk" });
    }

    res.sendFile(absolutePath);
  } catch (err) {
    res.status(500).json({ error: "Failed to serve attachment file" });
  }
});

// Delete attachment
app.delete("/attachments/:attachmentId", authRequired, async (req, res) => {
  try {
    const attachmentId = req.params.attachmentId;

    const attachment = await getOne("SELECT * FROM attachments WHERE id = ?", [
      attachmentId,
    ]);
    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    if (!(await canModifyAttachment(req.user, attachmentId))) {
      return res.status(403).json({ error: "Access denied" });
    }

    const absolutePath = path.join(__dirname, attachment.filePath);

    const [result] = await pool.query("DELETE FROM attachments WHERE id = ?", [
      attachmentId,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    res.status(200).json({ message: "Attachment deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete attachment - DB Error" });
  }
});

// ==========================================================
// 7. SEARCH ROUTES
// At least 5 query types + pagination
// type=text
// type=author
// type=most-posts
// type=least-posts
// type=highest-ranked
// type=lowest-ranked
// optional channel filter + page + limit
// ==========================================================
app.get("/search", async (req, res) => {
  try {
    const type = (req.query.type || "text").trim();
    const q = req.query.q ? req.query.q.trim() : "";
    const authorId = req.query.authorId || null;
    const channelId = req.query.channelId || null;
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    let sql = "";
    let params = [];

    if (type === "text") {
      sql = `
        SELECT 'post' AS resultType, p.id, p.title, p.body, p.authorId, p.channelId, p.createdAt
        FROM posts p
        WHERE (? = '' OR p.title LIKE ? OR p.body LIKE ?)
        ${channelId ? "AND p.channelId = ?" : ""}
        ORDER BY p.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      params = [q, `%${q}%`, `%${q}%`];
      if (channelId) params.push(channelId);
      params.push(limit, offset);
    } else if (type === "author") {
      if (!authorId) {
        return res
          .status(400)
          .json({ error: "authorId is required for author search" });
      }
      sql = `
        SELECT 'post' AS resultType, p.id, p.title, p.body, p.authorId, p.channelId, p.createdAt
        FROM posts p
        WHERE p.authorId = ?
        ${channelId ? "AND p.channelId = ?" : ""}
        ORDER BY p.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      params = [authorId];
      if (channelId) params.push(channelId);
      params.push(limit, offset);
    } else if (type === "most-posts") {
      sql = `
        SELECT u.id AS userId, u.displayName, COUNT(p.id) AS postCount
        FROM users u
        LEFT JOIN posts p ON p.authorId = u.id
        GROUP BY u.id, u.displayName
        ORDER BY postCount DESC, u.displayName ASC
        LIMIT ? OFFSET ?
      `;
      params = [limit, offset];
    } else if (type === "least-posts") {
      sql = `
        SELECT u.id AS userId, u.displayName, COUNT(p.id) AS postCount
        FROM users u
        LEFT JOIN posts p ON p.authorId = u.id
        GROUP BY u.id, u.displayName
        ORDER BY postCount ASC, u.displayName ASC
        LIMIT ? OFFSET ?
      `;
      params = [limit, offset];
    } else if (type === "highest-ranked") {
      sql = `
        SELECT
          p.id,
          p.title,
          p.body,
          p.authorId,
          p.channelId,
          p.createdAt,
          COALESCE(SUM(v.value), 0) AS score
        FROM posts p
        LEFT JOIN vote v
          ON v.targetType = 'post' AND v.targetId = p.id
        ${channelId ? "WHERE p.channelId = ?" : ""}
        GROUP BY p.id, p.title, p.body, p.authorId, p.channelId, p.createdAt
        ORDER BY score DESC, p.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      params = [];
      if (channelId) params.push(channelId);
      params.push(limit, offset);
    } else if (type === "lowest-ranked") {
      sql = `
        SELECT
          p.id,
          p.title,
          p.body,
          p.authorId,
          p.channelId,
          p.createdAt,
          COALESCE(SUM(v.value), 0) AS score
        FROM posts p
        LEFT JOIN vote v
          ON v.targetType = 'post' AND v.targetId = p.id
        ${channelId ? "WHERE p.channelId = ?" : ""}
        GROUP BY p.id, p.title, p.body, p.authorId, p.channelId, p.createdAt
        ORDER BY score ASC, p.createdAt DESC
        LIMIT ? OFFSET ?
      `;
      params = [];
      if (channelId) params.push(channelId);
      params.push(limit, offset);
    } else {
      return res.status(400).json({
        error:
          "Invalid search type. Use text, author, most-posts, least-posts, highest-ranked, or lowest-ranked",
      });
    }

    const [rows] = await pool.query(sql, params);

    res.status(200).json({
      type,
      page,
      limit,
      count: rows.length,
      results: rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Search failed - DB Error" });
  }
});

// ==========================================================
// 8. ADMIN / MODERATION ROUTES
// ==========================================================

// Admin check
app.get("/admin/check", authRequired, adminRequired, (req, res) => {
  res.status(200).json({
    message: "Admin verified",
    user: req.user,
  });
});

// Admin remove user
app.delete(
  "/admin/users/:userId",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const userId = req.params.userId;

      const [result] = await pool.query("DELETE FROM users WHERE id = ?", [
        userId,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.status(200).json({ message: "User removed by admin" });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove user - DB Error" });
    }
  },
);

// Admin remove channel
app.delete(
  "/admin/channels/:channelId",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const channelId = req.params.channelId;

      const [result] = await pool.query("DELETE FROM channels WHERE id = ?", [
        channelId,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Channel not found" });
      }

      res.status(200).json({ message: "Channel removed by admin" });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove channel - DB Error" });
    }
  },
);

// Admin remove post
app.delete(
  "/admin/posts/:postId",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const postId = req.params.postId;

      const [result] = await pool.query("DELETE FROM posts WHERE id = ?", [
        postId,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.status(200).json({ message: "Post removed by admin" });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove post - DB Error" });
    }
  },
);

// Admin remove reply
app.delete(
  "/admin/replies/:replyId",
  authRequired,
  adminRequired,
  async (req, res) => {
    try {
      const replyId = req.params.replyId;

      const [result] = await pool.query("DELETE FROM reply WHERE id = ?", [
        replyId,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Reply not found" });
      }

      res.status(200).json({ message: "Reply removed by admin" });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove reply - DB Error" });
    }
  },
);

// ==========================================================
// Error handler for multer / upload validation
// ==========================================================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Max size is 5 MB." });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    return res.status(400).json({ error: err.message || "Request error" });
  }

  next();
});

// -------------------- start server --------------------
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
