// Expressをインポートする
import express from "express";

// MySQLのコネクションプールをインポートする
import { pool } from "./db";

// メモ用ルーターをインポート
import memoRoutes from "./routes/memoRoutes";

// Expressアプリケーションを作成する
const app = express();

// サーバーのポート番号
const PORT = 3000;

// Node.jsのHTTPサーバーを作成する
import { createServer } from "http";

// WebSocketサーバーをインポートする
import { MemoSocket } from "./websocket/memoSocket";

// ========================================
// ミドルウェアの設定
// ========================================

// JSON形式のリクエストを受け取る
// リクエストサイズを1MBに制限
app.use(express.json({ limit: "1mb" }));

// ========================================
// トップページ
// ========================================
app.get("/", (req, res) => {
    res.send("Expressサーバーが正常に起動しています！");
});

// ========================================
// MySQL接続確認API
// ========================================
app.get("/api/db-test", async (req, res) => {
    try {
        // 接続先のデータベースとMySQLバージョンを取得
        const [rows] = await pool.query(
            "SELECT DATABASE() AS database_name, VERSION() AS mysql_version"
        );

        // 接続に成功した場合
        res.json({
            success: true,
            message: "MySQLへの接続に成功しました！",
            result: rows
        });

    } catch (error) {
        // 接続に失敗した場合
        console.error("MySQL接続エラー:", error);

        res.status(500).json({
            success: false,
            message: "MySQLへの接続に失敗しました。"
        });
    }
});

// ========================================
// メモAPIのルーティング
// ========================================

// /api/memos以下のアクセスをmemoRoutesで処理
app.use("/api/memos", memoRoutes);

// ========================================
// HTTPサーバーの作成
// ========================================

// Expressを使用するHTTPサーバーを作成
const server = createServer(app);

// ========================================
// WebSocketサーバーの初期化
// ========================================
MemoSocket.initialize(server);

// ========================================
// HTTPサーバー起動
// ========================================
server.listen(PORT, () => {
    console.log(`HTTPサーバー起動：http://localhost:${PORT}`);
    console.log(`WebSocketサーバー起動：ws://localhost:${PORT}/ws`);
});