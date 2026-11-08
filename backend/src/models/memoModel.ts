// MySQL接続プールをインポート
import { pool } from "../db";

// mysql2の型定義をインポート
import type { ResultSetHeader, RowDataPacket } from "mysql2";

// ========================================
// メモデータの型定義
// ========================================
export interface Memo extends RowDataPacket {
    id: number;
    title: string;
    content: string;
    is_deleted: number;
    created_at: Date;
    updated_at: Date;
}

// ========================================
// メモモデル
// ========================================
export class MemoModel {
    // ------------------------------------
    // メモ一覧取得
    // ------------------------------------
    static async findAll(): Promise<Memo[]> {
        const [rows] = await pool.query<Memo[]>(`
            SELECT *
            FROM memos
            WHERE is_deleted = 0
            ORDER BY updated_at DESC, id DESC
        `);

        return rows;
    }

    // ------------------------------------
    // メモ詳細取得
    // ------------------------------------
    static async findById(id: number): Promise<Memo | null> {
        const [rows] = await pool.query<Memo[]>(
            `SELECT *
            FROM memos
            WHERE id = ? AND is_deleted = 0`, [id]
        );

        return rows[0] ?? null;
    }

    // ------------------------------------
    // メモ新規登録
    // ------------------------------------
    static async create(
        title: string,
        content: string
    ): Promise<Memo> {
        const [result] = await pool.execute<ResultSetHeader>(
            `INSERT INTO memos (title, content)
             VALUES (?, ?)`, [title, content]
        );

        // 登録したメモを取得する
        const memo = await this.findById(result.insertId);

        if (!memo) {
            throw new Error("登録したメモを取得できませんでした。");
        }

        return memo;
    }

    // ------------------------------------
    // メモ更新
    // ------------------------------------
    static async update(
        id: number,
        title: string,
        content: string
    ): Promise<Memo | null> {
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE memos
             SET title = ?,
                 content = ?
             WHERE id = ? AND is_deleted = 0`, [title, content, id]
        );

        // 対象が存在しない場合
        if (result.affectedRows === 0) {
            return null;
        }

        return this.findById(id);
    }

    // ------------------------------------
    // メモ論理削除
    // ------------------------------------
    static async delete(id: number): Promise<boolean> {
        const [result] = await pool.execute<ResultSetHeader>(
            `UPDATE memos
             SET is_deleted = 1
             WHERE id = ? AND is_deleted = 0`, [id]
        );

        return result.affectedRows > 0;
    }
}