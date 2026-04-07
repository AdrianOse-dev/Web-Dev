DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS vote;
DROP TABLE IF EXISTS reply;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    displayName VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    createdAt BIGINT NOT NULL
);

CREATE TABLE channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    createdBy INT NOT NULL,
    createdAt BIGINT NOT NULL,
    FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channelId INT NOT NULL,
    authorId INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    createdAt BIGINT NOT NULL,
    FOREIGN KEY (channelId) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE reply (
    id INT AUTO_INCREMENT PRIMARY KEY,
    postId INT NOT NULL,
    parentReplyId INT NULL,
    authorId INT NOT NULL,
    body TEXT NOT NULL,
    createdAt BIGINT NOT NULL,
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parentReplyId) REFERENCES reply(id) ON DELETE CASCADE,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE vote (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    targetType VARCHAR(20) NOT NULL,
    targetId INT NOT NULL,
    value INT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_vote_value CHECK (value IN (1, -1)),
    CONSTRAINT chk_vote_target CHECK (targetType IN ('post', 'reply')),
    UNIQUE KEY unique_user_target (userId, targetType, targetId)
);

CREATE TABLE attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    targetType VARCHAR(20) NOT NULL,
    targetId INT NOT NULL,
    mimeType VARCHAR(100) NOT NULL,
    sizeBytes INT NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    filePath VARCHAR(255) NOT NULL,
    uploadedBy INT NOT NULL,
    createdAt BIGINT NOT NULL,
    FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_attachment_target CHECK (targetType IN ('post', 'reply'))
);

CREATE INDEX idx_posts_channelId ON posts(channelId);
CREATE INDEX idx_posts_authorId ON posts(authorId);
CREATE INDEX idx_reply_postId ON reply(postId);
CREATE INDEX idx_reply_parentReplyId ON reply(parentReplyId);
CREATE INDEX idx_vote_target ON vote(targetType, targetId);
CREATE INDEX idx_attachments_target ON attachments(targetType, targetId);