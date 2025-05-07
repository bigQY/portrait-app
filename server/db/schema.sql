-- 如果表存在，则删除
DROP TABLE IF EXISTS album_comments;
DROP TABLE IF EXISTS album_likes;
DROP TABLE IF EXISTS album_views;

-- 相册评论表
CREATE TABLE IF NOT EXISTS album_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_name TEXT NOT NULL,
    content TEXT NOT NULL,
    user_name TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 相册点赞表
CREATE TABLE IF NOT EXISTS album_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_name TEXT NOT NULL,
    fingerprint TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_name, fingerprint)
);

-- 相册浏览量表
CREATE TABLE IF NOT EXISTS album_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(album_name, ip_address)
); 