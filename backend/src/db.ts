// MySQL接続ライブラリをインポート
import mysql from "mysql2/promise";

// 環境変数からポート番号を取得
const DB_PORT = Number(process.env.DB_PORT ?? 3306);

// 環境変数の設定を確認
if (
    !process.env.DB_HOST ||
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD ||
    !process.env.DB_NAME ||
    !Number.isInteger(DB_PORT) ||
    DB_PORT < 1 ||
    DB_PORT > 65535
) {
    throw new Error("データベースの接続設定が正しくありません。");
}

// MySQLのコネクションプールを作成
export const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: "Z",

    // 接続可能になるまで無制限に新規接続を増やさない
    waitForConnections: true,

    // 最大接続数
    connectionLimit: 10,

    // 接続待ちの最大数（0は制限なし）
    queueLimit: 0,
});