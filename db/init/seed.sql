INSERT INTO users (displayName, email, passwordHash, role, createdAt) VALUES
('Admin User', 'admin@example.com', 'CHANGE_THIS_TO_REAL_HASH', 'admin', 1710000000000),
('Jessie', 'jessie@example.com', 'CHANGE_THIS_TO_REAL_HASH', 'user', 1710000001000),
('Adrian', 'adrian@example.com', 'CHANGE_THIS_TO_REAL_HASH', 'user', 1710000002000);

INSERT INTO channels (name, description, createdBy, createdAt) VALUES
('JavaScript', 'Questions about JavaScript programming', 1, 1710000010000),
('Python', 'Questions about Python programming', 1, 1710000011000),
('Databases', 'SQL and database questions', 2, 1710000012000);

INSERT INTO posts (channelId, authorId, title, body, createdAt) VALUES
(1, 2, 'How does fetch work?', 'I do not understand how fetch returns a promise.', 1710000020000),
(2, 3, 'What is a list comprehension?', 'Can someone explain this in a simple way?', 1710000021000),
(3, 2, 'Difference between SQL and MySQL?', 'I keep confusing both terms.', 1710000022000);

INSERT INTO reply (postId, parentReplyId, authorId, body, createdAt) VALUES
(1, NULL, 3, 'fetch sends a request and returns a promise for the response.', 1710000030000),
(1, 1, 2, 'Okay, so the promise is for the response, not the data directly?', 1710000031000),
(2, NULL, 1, 'A list comprehension is a short way to build a list.', 1710000032000);

INSERT INTO vote (userId, targetType, targetId, value) VALUES
(1, 'post', 1, 1),
(2, 'post', 1, 1),
(3, 'post', 1, -1),
(1, 'reply', 1, 1);

INSERT INTO attachments (targetType, targetId, mimeType, sizeBytes, fileName, filePath, uploadedBy, createdAt) VALUES
('post', 1, 'image/png', 12345, 'example.png', 'uploads/example.png', 1, 1710000040000);