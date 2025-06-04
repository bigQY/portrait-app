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
    fingerprint TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
); 

-- 创建索引以优化查询性能
-- 1. 基础索引
CREATE INDEX idx_album_views_created_at ON album_views(created_at);
CREATE INDEX idx_album_views_album_name_fingerprint ON album_views(album_name, fingerprint);

-- 2. 复合索引，优化按相册名称和时间范围查询
CREATE INDEX idx_album_views_album_name_created_at ON album_views(album_name, created_at);

-- 3. 复合索引，优化按指纹和时间范围查询
CREATE INDEX idx_album_views_fingerprint_created_at ON album_views(fingerprint, created_at);

-- 4. 复合索引，优化按相册名称、指纹和时间范围查询
CREATE INDEX idx_album_views_album_name_fingerprint_created_at ON album_views(album_name, fingerprint, created_at); 

-- 相册总浏览量统计表
DROP TABLE IF EXISTS album_view_counts;
CREATE TABLE IF NOT EXISTS album_view_counts (
    album_name TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0
);

-- 为 album_view_counts 创建索引
CREATE INDEX idx_album_view_counts_album_name ON album_view_counts(album_name);