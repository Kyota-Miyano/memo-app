-- ========================================
-- メモ帳SPA データベース初期化SQL
-- ========================================

-- データベースはDockerの環境変数
-- MYSQL_DATABASE=phpdb によって作成される想定

USE phpdb;

-- ========================================
-- メモテーブル
-- ========================================

CREATE TABLE IF NOT EXISTS memos (

    -- メモID
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    -- タイトル（最大100文字）
    title VARCHAR(100) NOT NULL,

    -- 本文
    content MEDIUMTEXT NOT NULL,

    -- 論理削除フラグ
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,

    -- 作成日時
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- 更新日時
    updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;