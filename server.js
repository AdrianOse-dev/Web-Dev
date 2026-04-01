"use strict";

import cors from "cors";
import mysql from "mysql2/promise";

const express = require("express");

const PORT = 8080;
const HOST = "0.0.0.0";

const app = express();

const pool = mysql.createPool({
  host: "db",
  user: "root",
  password: "rootpassword",
  database: "appdb",
  waitForConnections: true,
  connectionLimit: 10,
});

//GET CHANNEL BY ID
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
    .catch((err) => {
      res.status(500).json({ error: "failed to load channel - DB Error" });
    });
});

//GET ALL CHANNELS
app.get("/channels", (req, res) => {
  pool
    .query("SELECT * FROM channels")
    .then(([rows]) => res.json(rows))
    .catch((err) => {
      res.status(500).json({ error: "failed to load all channels - DB Error" });
    });
});

//CREATE CHANNEL
app.post("/createChannel", (req, res) => {
  const ChannelName = req.body.name;
  const ChannelBody = req.body.description;

  if (!ChannelName.trim()) {
    return res.status(400).json({ error: "Channel must have a name" });
  }

  //channel description is optional

  pool
    .query("INSERT INTO channels (name, description) VALUES (?, ?)", [
      ChannelName,
      ChannelBody,
    ])
    .then(() => {
      res.json({ message: "Successfully added" });
    })
    .catch((err) => {
      res.status(500).json({ error: "failed to create channel - DB error" });
    });
});

//TODO: DELETE CHANNEL & MAYBE UPDATE CHANNEL?

//get all posts in a channel
app.get("/channel/:id/posts", (req, res) => {
  const id = req.params.id;
  pool
    .query("SELECT * FROM Posts WHERE ChannelId = ? ", [id])
    .then(([rows]) => res.json(rows))
    .catch((err) =>
      res.status(500).json({ error: "Failed to get channel posts - DB Error" }),
    );
});

//get one post
app.get("/post/:id", (req, res) => {
  const id = req.params.id;
  pool
    .query("SELECT * FROM posts WHERE Id = ? ", [id])
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.status(404).json({ error: "post not found" });
      }
      res.json(rows[0]);
    })
    .catch((err) =>
      res.status(500).json({ error: "Failed to get post - DB Error" }),
    );
});

//create post
app.post("/makePost", (req, res) => {
  let postTitle = req.body.title;
  let postBody = req.body.body;
  const channelId = req.body.channelId;
  const time = Date.now();

  if (!postTitle || !postBody) {
    return res
      .status(400)
      .json({ error: "Post title and Body cannot be empty" });
  }

  postTitle = postTitle.trim();
  postBody = postBody.trim();

  if (!postTitle || !postBody) {
    return res
      .status(400)
      .json({ error: "Post title and Body cannot be empty" });
  }

  if (!channelId) {
    return res.status(400).json({ error: "No channelId provided" });
  }

  pool
    .query(
      "INSERT INTO posts (Title, Body, channelId, CreatedAt) VALUES (?, ?, ?, ?)",
      [postTitle, postBody, channelId, time],
    )
    .then(() => {
      res.status(201).json({ message: "Post Created" });
    })
    .catch((err) => {
      res.status(500).json({ error: "Failed to post - DB error" });
    });
});

//delete post and MAYBE UPDATE POST?

//GET POST REPLIES
app.get("/Reply/:postId", (req, res) => {
  //would run when user taps "see replies"
  const postId = req.params.postId;

  pool
    .query("SELECT * FROM reply WHERE postId = ?", [postId])
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.json({ message: "No replies on post" });
      }
      res.json(rows);
      res.status(200).json({ message: "Response sent" });
    })
    .catch((err) => {
      res.status(500).json({ error: "Failed to load responses - DB Error" });
    });
});
