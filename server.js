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

// ---------- uploads folder ----------
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// ---------- multer setup ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({ storage });

// ---------- DB ----------
const pool = mysql.createPool({
  host: "db",
  user: "root",
  password: "rootpassword",
  database: "appdb",
  waitForConnections: true,
  connectionLimit: 10,
});

// ---------- simple token auth (in-memory) ----------
const sessions = new Map();

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const sessionUser = sessions.get(token);

    if (!sessionUser) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = sessionUser;
    req.token = token;
    next();
  } catch (err) {
    res.status(500).json({ error: "Auth check failed" });
  }
}

async function adminRequired(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// ---------- utility ----------
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is alive" });
});

// =====================================================
// 1. AUTH ROUTES
// =====================================================

// SIGN UP
app.post("/auth/signup", async (req, res) => {
  try {
    let { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "username, email, and password are required" });
    }

    username = username.trim();
    email = email.trim().toLowerCase();
    password = password.trim();

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "username, email, and password cannot be empty" });
    }

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username],
    );

    if (existing.length > 0) {
      return res
        .status(409)
        .json({ error: "User with that email or username already exists" });
    }

    const passwordHash = hashPassword(password);

    const [result] = await pool.query(
      "INSERT INTO users (username, email, passwordHash, isAdmin) VALUES (?, ?, ?, ?)",
      [username, email, passwordHash, 0],
    );

    res.status(201).json({
      message: "Account created successfully",
      userId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to sign up - DB Error" });
  }
});

// SIGN IN
app.post("/auth/signin", async (req, res) => {
  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    email = email.trim().toLowerCase();
    password = password.trim();

    const [rows] = await pool.query(
      "SELECT id, username, email, passwordHash, isAdmin FROM users WHERE email = ?",
      [email],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];
    const passwordHash = hashPassword(password);

    if (user.passwordHash !== passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = crypto.randomUUID();

    sessions.set(token, {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: !!user.isAdmin,
    });

    res.status(200).json({
      message: "Signed in successfully",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: !!user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to sign in - DB Error" });
  }
});

// SIGN OUT
app.post("/auth/signout", authRequired, (req, res) => {
  sessions.delete(req.token);
  res.status(200).json({ message: "Signed out successfully" });
});

// GET CURRENT USER
app.get("/auth/me", authRequired, (req, res) => {
  res.status(200).json({ user: req.user });
});

// =====================================================
// 2. CHANNEL ROUTES
// =====================================================

// GET ALL CHANNELS
app.get("/channels", (req, res) => {
  pool
    .query("SELECT * FROM channels")
    .then(([rows]) => res.json(rows))
    .catch(() => {
      res.status(500).json({ error: "failed to load all channels - DB Error" });
    });
});

// GET CHANNEL BY ID
app.get("/channels/:id", (req, res) => {
  const id = req.params.id;

  pool
    .query("SELECT * FROM channels WHERE id = ?", [id])
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.status(404).json({ error: "channel not found" });
      }
      res.json(rows[0]);
    })
    .catch(() => {
      res.status(500).json({ error: "failed to load channel - DB Error" });
    });
});

// CREATE CHANNEL
app.post("/channels", authRequired, (req, res) => {
  let { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Channel must have a name" });
  }

  name = name.trim();
  description = description ? description.trim() : null;

  pool
    .query("INSERT INTO channels (name, description) VALUES (?, ?)", [
      name,
      description,
    ])
    .then(([result]) => {
      res.status(201).json({
        message: "Channel created successfully",
        channelId: result.insertId,
      });
    })
    .catch(() => {
      res.status(500).json({ error: "failed to create channel - DB error" });
    });
});

// UPDATE CHANNEL
app.put("/channels/:id", authRequired, (req, res) => {
  const id = req.params.id;
  let { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Channel must have a name" });
  }

  name = name.trim();
  description = description ? description.trim() : null;

  pool
    .query("UPDATE channels SET name = ?, description = ? WHERE id = ?", [
      name,
      description,
      id,
    ])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Channel not found" });
      }
      res.status(200).json({ message: "Channel updated successfully" });
    })
    .catch(() => {
      res.status(500).json({ error: "failed to update channel - DB Error" });
    });
});

// DELETE CHANNEL
app.delete("/channels/:id", authRequired, (req, res) => {
  const id = req.params.id;

  pool
    .query("DELETE FROM channels WHERE id = ?", [id])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Channel not found" });
      }
      res.status(200).json({ message: "Channel deleted successfully" });
    })
    .catch(() => {
      res.status(500).json({ error: "failed to delete channel - DB Error" });
    });
});

// =====================================================
// 3. POST ROUTES
// =====================================================

// GET POSTS IN A CHANNEL
app.get("/channels/:id/posts", (req, res) => {
  const id = req.params.id;

  pool
    .query("SELECT * FROM posts WHERE channelId = ?", [id])
    .then(([rows]) => res.json(rows))
    .catch(() => {
      res.status(500).json({ error: "Failed to get channel posts - DB Error" });
    });
});

// GET ONE POST
app.get("/posts/:id", (req, res) => {
  const id = req.params.id;

  pool
    .query("SELECT * FROM posts WHERE id = ?", [id])
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.status(404).json({ error: "post not found" });
      }
      res.json(rows[0]);
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to get post - DB Error" });
    });
});

// CREATE POST
app.post("/posts", authRequired, (req, res) => {
  let { title, body, channelId } = req.body;
  const createdAt = Date.now();
  const userId = req.user.id;

  if (!title || !body) {
    return res
      .status(400)
      .json({ error: "Post title and body cannot be empty" });
  }

  title = title.trim();
  body = body.trim();

  if (!title || !body) {
    return res
      .status(400)
      .json({ error: "Post title and body cannot be empty" });
  }

  if (!channelId) {
    return res.status(400).json({ error: "No channelId provided" });
  }

  pool
    .query(
      "INSERT INTO posts (title, body, channelId, userId, createdAt) VALUES (?, ?, ?, ?, ?)",
      [title, body, channelId, userId, createdAt],
    )
    .then(([result]) => {
      res.status(201).json({
        message: "Post created",
        postId: result.insertId,
      });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to post - DB error" });
    });
});

// UPDATE POST
app.put("/posts/:id", authRequired, (req, res) => {
  const id = req.params.id;
  let { title, body } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required" });
  }

  title = title.trim();
  body = body.trim();

  if (!title || !body) {
    return res.status(400).json({ error: "title and body cannot be empty" });
  }

  pool
    .query("UPDATE posts SET title = ?, body = ? WHERE id = ?", [
      title,
      body,
      id,
    ])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.status(200).json({ message: "Post updated successfully" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to update post - DB Error" });
    });
});

// DELETE POST
app.delete("/posts/:id", authRequired, (req, res) => {
  const id = req.params.id;

  pool
    .query("DELETE FROM posts WHERE id = ?", [id])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.status(200).json({ message: "Post deleted successfully" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to delete post - DB Error" });
    });
});

// =====================================================
// 4. REPLY ROUTES
// =====================================================

// GET REPLIES FOR A POST
app.get("/posts/:postId/replies", (req, res) => {
  const postId = req.params.postId;

  pool
    .query("SELECT * FROM reply WHERE postId = ?", [postId])
    .then(([rows]) => {
      res.status(200).json(rows);
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to load replies - DB Error" });
    });
});

// CREATE REPLY
// supports:
// - reply to a post only => parentReplyId null
// - reply to another reply => parentReplyId has value
app.post("/replies", authRequired, (req, res) => {
  let { reply, postId, parentReplyId } = req.body;
  const userId = req.user.id;
  const createdAt = Date.now();

  if (!reply || !reply.trim()) {
    return res.status(400).json({ error: "You must enter a reply" });
  }

  if (!postId) {
    return res.status(400).json({ error: "postId is required" });
  }

  reply = reply.trim();
  parentReplyId = parentReplyId || null;

  pool
    .query(
      "INSERT INTO reply (body, postId, parentReplyId, userId, createdAt) VALUES (?, ?, ?, ?, ?)",
      [reply, postId, parentReplyId, userId, createdAt],
    )
    .then(([result]) => {
      res.status(201).json({
        message: "Reply successfully created",
        replyId: result.insertId,
      });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to upload - DB Error" });
    });
});

// UPDATE REPLY
app.put("/replies/:replyId", authRequired, (req, res) => {
  const replyId = req.params.replyId;
  let { reply } = req.body;

  if (!reply || !reply.trim()) {
    return res.status(400).json({ error: "Reply cannot be empty" });
  }

  reply = reply.trim();

  pool
    .query("UPDATE reply SET body = ? WHERE id = ?", [reply, replyId])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Reply not found" });
      }
      res.status(200).json({ message: "Reply updated successfully" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to update reply - DB Error" });
    });
});

// DELETE REPLY
app.delete("/replies/:replyId", authRequired, (req, res) => {
  const replyId = req.params.replyId;

  pool
    .query("DELETE FROM reply WHERE id = ?", [replyId])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Reply not found" });
      }
      res.status(200).json({ message: "Reply deleted" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to delete reply - DB error" });
    });
});

// =====================================================
// 5. UPLOAD / ATTACHMENT ROUTES
// =====================================================

// UPLOAD SCREENSHOT TO A POST
app.post(
  "/posts/:postId/attachments",
  authRequired,
  upload.single("screenshot"),
  (req, res) => {
    const postId = req.params.postId;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { originalname, filename, mimetype, size } = req.file;
    const filePath = `/uploads/${filename}`;
    const uploadedBy = req.user.id;
    const createdAt = Date.now();

    pool
      .query(
        "INSERT INTO attachments (postId, fileName, filePath, mimeType, size, uploadedBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [postId, originalname, filePath, mimetype, size, uploadedBy, createdAt],
      )
      .then(([result]) => {
        res.status(201).json({
          message: "Attachment uploaded successfully",
          attachmentId: result.insertId,
          filePath,
        });
      })
      .catch(() => {
        res.status(500).json({ error: "Failed to save attachment - DB Error" });
      });
  },
);

// GET ATTACHMENT METADATA
app.get("/attachments/:attachmentId", (req, res) => {
  const attachmentId = req.params.attachmentId;

  pool
    .query("SELECT * FROM attachments WHERE id = ?", [attachmentId])
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      res.status(200).json(rows[0]);
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to load attachment - DB Error" });
    });
});

// DELETE ATTACHMENT
app.delete("/attachments/:attachmentId", authRequired, async (req, res) => {
  const attachmentId = req.params.attachmentId;

  try {
    const [rows] = await pool.query("SELECT * FROM attachments WHERE id = ?", [
      attachmentId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const attachment = rows[0];
    const absolutePath = path.join(__dirname, attachment.filePath);

    await pool.query("DELETE FROM attachments WHERE id = ?", [attachmentId]);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    res.status(200).json({ message: "Attachment deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete attachment - DB Error" });
  }
});

// =====================================================
// 6. VOTE ROUTES
// =====================================================

// ADD OR CHANGE VOTE ON POST
app.put("/posts/:postId/vote", authRequired, (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.id;
  const value = req.body.value;

  if (!postId || value === undefined) {
    return res.status(400).json({ error: "postId and value are required" });
  }

  if (value !== 1 && value !== -1) {
    return res.status(400).json({ error: "Vote value must be 1 or -1" });
  }

  pool
    .query(
      "SELECT * FROM vote WHERE userId = ? AND targetType = ? AND targetId = ?",
      [userId, "post", postId],
    )
    .then(([rows]) => {
      if (rows.length === 0) {
        return pool.query(
          "INSERT INTO vote (userId, targetType, targetId, value) VALUES (?, ?, ?, ?)",
          [userId, "post", postId, value],
        );
      }

      return pool.query(
        "UPDATE vote SET value = ? WHERE userId = ? AND targetType = ? AND targetId = ?",
        [value, userId, "post", postId],
      );
    })
    .then(() => {
      res.status(200).json({ message: "Post vote recorded successfully" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to record vote - DB Error" });
    });
});

// REMOVE VOTE FROM POST
app.delete("/posts/:postId/vote", authRequired, (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.id;

  pool
    .query(
      "DELETE FROM vote WHERE userId = ? AND targetType = ? AND targetId = ?",
      [userId, "post", postId],
    )
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Vote not found" });
      }
      res.status(200).json({ message: "Vote removed successfully" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to remove vote - DB Error" });
    });
});

// GET VOTE INFO FOR POST
app.get("/posts/:postId/vote", (req, res) => {
  const postId = req.params.postId;

  pool
    .query(
      `SELECT
         COUNT(CASE WHEN value = 1 THEN 1 END) AS upvotes,
         COUNT(CASE WHEN value = -1 THEN 1 END) AS downvotes,
         COALESCE(SUM(value), 0) AS score
       FROM vote
       WHERE targetType = ? AND targetId = ?`,
      ["post", postId],
    )
    .then(([rows]) => {
      res.status(200).json(rows[0]);
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to get vote info - DB Error" });
    });
});

// ADD OR CHANGE VOTE ON REPLY
app.put("/replies/:replyId/vote", authRequired, (req, res) => {
  const replyId = req.params.replyId;
  const userId = req.user.id;
  const value = req.body.value;

  if (!replyId || value === undefined) {
    return res.status(400).json({ error: "replyId and value are required" });
  }

  if (value !== 1 && value !== -1) {
    return res.status(400).json({ error: "Vote value must be 1 or -1" });
  }

  pool
    .query(
      "SELECT * FROM vote WHERE userId = ? AND targetType = ? AND targetId = ?",
      [userId, "reply", replyId],
    )
    .then(([rows]) => {
      if (rows.length === 0) {
        return pool.query(
          "INSERT INTO vote (userId, targetType, targetId, value) VALUES (?, ?, ?, ?)",
          [userId, "reply", replyId, value],
        );
      }

      return pool.query(
        "UPDATE vote SET value = ? WHERE userId = ? AND targetType = ? AND targetId = ?",
        [value, userId, "reply", replyId],
      );
    })
    .then(() => {
      res.status(200).json({ message: "Reply vote recorded successfully" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to record reply vote - DB Error" });
    });
});

// REMOVE VOTE FROM REPLY
app.delete("/replies/:replyId/vote", authRequired, (req, res) => {
  const replyId = req.params.replyId;
  const userId = req.user.id;

  pool
    .query(
      "DELETE FROM vote WHERE userId = ? AND targetType = ? AND targetId = ?",
      [userId, "reply", replyId],
    )
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Vote not found" });
      }
      res.status(200).json({ message: "Reply vote removed successfully" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to remove reply vote - DB Error" });
    });
});

// GET VOTE INFO FOR REPLY
app.get("/replies/:replyId/vote", (req, res) => {
  const replyId = req.params.replyId;

  pool
    .query(
      `SELECT
         COUNT(CASE WHEN value = 1 THEN 1 END) AS upvotes,
         COUNT(CASE WHEN value = -1 THEN 1 END) AS downvotes,
         COALESCE(SUM(value), 0) AS score
       FROM vote
       WHERE targetType = ? AND targetId = ?`,
      ["reply", replyId],
    )
    .then(([rows]) => {
      res.status(200).json(rows[0]);
    })
    .catch(() => {
      res
        .status(500)
        .json({ error: "Failed to get reply vote info - DB Error" });
    });
});

// =====================================================
// 7. SEARCH ROUTES
// =====================================================

// Example query params:
// /search?q=test&channelId=2&authorId=1&sort=newest&page=1&limit=10
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q ? req.query.q.trim() : "";
    const channelId = req.query.channelId || null;
    const authorId = req.query.authorId || null;
    const sort = req.query.sort || "newest";
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.*
      FROM posts p
      WHERE 1 = 1
    `;
    const params = [];

    if (q) {
      sql += " AND (p.title LIKE ? OR p.body LIKE ?)";
      params.push(`%${q}%`, `%${q}%`);
    }

    if (channelId) {
      sql += " AND p.channelId = ?";
      params.push(channelId);
    }

    if (authorId) {
      sql += " AND p.userId = ?";
      params.push(authorId);
    }

    if (sort === "oldest") {
      sql += " ORDER BY p.createdAt ASC";
    } else {
      sql += " ORDER BY p.createdAt DESC";
    }

    sql += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);

    res.status(200).json({
      page,
      limit,
      results: rows,
    });
  } catch (err) {
    res.status(500).json({ error: "Search failed - DB Error" });
  }
});

// =====================================================
// 8. ADMIN / MODERATION
// =====================================================

// ADMIN CHECK
app.get("/admin/check", authRequired, adminRequired, (req, res) => {
  res.status(200).json({ message: "Admin verified", isAdmin: true });
});

// ADMIN DELETE USER
app.delete("/admin/users/:userId", authRequired, adminRequired, (req, res) => {
  const userId = req.params.userId;

  pool
    .query("DELETE FROM users WHERE id = ?", [userId])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({ message: "User deleted by admin" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to delete user - DB Error" });
    });
});

// ADMIN DELETE CHANNEL
app.delete(
  "/admin/channels/:channelId",
  authRequired,
  adminRequired,
  (req, res) => {
    const channelId = req.params.channelId;

    pool
      .query("DELETE FROM channels WHERE id = ?", [channelId])
      .then(([result]) => {
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Channel not found" });
        }
        res.status(200).json({ message: "Channel deleted by admin" });
      })
      .catch(() => {
        res.status(500).json({ error: "Failed to delete channel - DB Error" });
      });
  },
);

// ADMIN DELETE POST
app.delete("/admin/posts/:postId", authRequired, adminRequired, (req, res) => {
  const postId = req.params.postId;

  pool
    .query("DELETE FROM posts WHERE id = ?", [postId])
    .then(([result]) => {
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.status(200).json({ message: "Post deleted by admin" });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to delete post - DB Error" });
    });
});

// ADMIN DELETE REPLY
app.delete(
  "/admin/replies/:replyId",
  authRequired,
  adminRequired,
  (req, res) => {
    const replyId = req.params.replyId;

    pool
      .query("DELETE FROM reply WHERE id = ?", [replyId])
      .then(([result]) => {
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Reply not found" });
        }
        res.status(200).json({ message: "Reply deleted by admin" });
      })
      .catch(() => {
        res.status(500).json({ error: "Failed to delete reply - DB Error" });
      });
  },
);

// ---------- start server ----------
app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
