PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE Document (
    id TEXT PRIMARY KEY,
    title TEXT,
    create_at DATETIME
);
CREATE TABLE IF NOT EXISTS "File" (
    id TEXT PRIMARY KEY,
    title TEXT,
    author TEXT,
    create_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    did TEXT,
    FOREIGN KEY (did) REFERENCES Document(id)
);
CREATE TABLE Category (
    id TEXT PRIMARY KEY,
    name TEXT
);
COMMIT;
