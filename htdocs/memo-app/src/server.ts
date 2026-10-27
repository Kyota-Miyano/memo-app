// Expressをインポートする
import express from "express";

// Expressアプリケーションを作成する
const app = express();

// サーバーが使用するポート番号
const PORT = 3000;

// JSON形式のリクエストを受け取れるようにする
app.use(express.json({ limit: "1mb" }));

// ルートURLへのGETリクエストを処理する
app.get("/", (req, res) => {
    res.send("メモ帳アプリのサーバーが起動しました！");
});

// サーバーを起動する
app.listen(PORT, "0.0.0.0", () => {
    console.log(`サーバーが起動しました：http://localhost:${PORT}`);
});