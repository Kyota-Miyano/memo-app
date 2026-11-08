// WebSocketによる変更通知を利用する
import { MemoSocket } from "../websocket/memoSocket";

// Expressの型定義をインポート
import type { Request, Response } from "express";

// メモモデルをインポート
import { MemoModel } from "../models/memoModel";

// ========================================
// メモコントローラー
// ========================================
export class MemoController {
    // ------------------------------------
    // メモ一覧取得
    // GET /api/memos
    // ------------------------------------
    static async index(req: Request, res: Response): Promise<void> {
        try {
            const memos = await MemoModel.findAll();

            res.status(200).json(memos);
        
        } catch (error) {
            console.error("メモ一覧取得エラー：", error);

            res.status(500).json({
                success: false,
                message: "メモ一覧の取得に失敗しました。"
            });
        }
    }

    // ------------------------------------
    // メモ詳細取得
    // GET /api/memos/:id
    // ------------------------------------
    static async show(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);

            // IDの形式を確認
            if (!Number.isSafeInteger(id) || id <= 0) {
                res.status(400).json({
                    success: false,
                    message: "メモIDが不正です。"
                });
                return;
            }

            const memo = await MemoModel.findById(id);

            if (!memo) {
                res.status(404).json({
                    success: false,
                    message: "指定されたメモが見つかりません。"
                });
                return;
            }

            res.status(200).json(memo);
        
        } catch (error) {
            console.error("メモ詳細取得エラー：", error);

            res.status(500).json({
                success: false,
                message: "メモの取得に失敗しました。"
            });
        }
    }

    // ------------------------------------
    // メモ新規登録
    // POST /api/memos
    // ------------------------------------
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const { title, content } = req.body ?? {};

            // 入力値の型を確認
            if (typeof title !== "string" || typeof content !== "string") {
                res.status(400).json({
                    success: false,
                    message: "タイトルと本文は文字列で指定してください。"
                });
                return;
            }

            // 文字数制限を確認
            if (title.length > 100 || content.length > 10000) {
                res.status(400).json({
                    success: false,
                    message: "タイトルまたは本文の文字数が上限を超えています。"
                });
                return;
            }

            // タイトルが空の場合は自動補完
            const today = new Intl.DateTimeFormat("sv-SE", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).format(new Date());

            const finalTitle = title.trim() || `メモ(${today})`;

            // メモを登録
            const memo = await MemoModel.create(finalTitle, content);

            // 他のブラウザへ新規登録を通知する
            MemoSocket.broadcast({
                type: "created",
                memo: memo,
                originId: req.header("X-Client-Id") ?? undefined
            });

            res.status(201).json(memo);
            return;
        
        } catch (error) {
            console.error("メモ登録エラー：", error);

            res.status(500).json({
                success: false,
                message: "メモの登録に失敗しました。"
            });
        }
    }

    // ------------------------------------
    // メモ更新
    // PUT /api/memos/:id
    // ------------------------------------
    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);
            const { title, content } = req.body ?? {};

            if (!Number.isSafeInteger(id) || id <= 0) {
                res.status(400).json({
                    success: false,
                    message: "メモIDが不正です。"
                });
                return;
            }

            // 入力値の型を確認
            if (typeof title !== "string" || typeof content !== "string") {
                res.status(400).json({
                    success: false,
                    message: "タイトルと本文は文字列で指定してください。"
                });
                return;
            }

            // 文字数制限を確認
            if (title.length > 100 || content.length > 10000) {
                res.status(400).json({
                    success: false,
                    message: "タイトルまたは本文の文字数が上限を超えています。"
                });
                return;
            }

            // タイトルが空の場合は自動補完
            const today = new Intl.DateTimeFormat("sv-SE", {
                timeZone: "Asia/Tokyo",
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }).format(new Date());

            const finalTitle = title.trim() || `メモ(${today})`;

            const memo = await MemoModel.update(id, finalTitle, content);

            if (!memo) {
                res.status(404).json({
                    success: false,
                    message: "指定されたメモが見つかりません。"
                });
                return;
            }

            // 他のブラウザへ更新を通知する
            MemoSocket.broadcast({
                type: "updated",
                memo: memo,
                originId: req.header("X-Client-Id") ?? undefined
            });

            res.status(200).json(memo);
            return;
        
        } catch (error) {
            console.error("メモ更新エラー：", error);

            res.status(500).json({
                success: false,
                message: "メモの更新に失敗しました。"
            });
        }
    }

    // ------------------------------------
    // メモ論理削除
    // DELETE /api/memos/:id
    // ------------------------------------
    static async remove(req: Request, res: Response): Promise<void> {
        try {
            const id = Number(req.params.id);

            if (!Number.isSafeInteger(id) || id <= 0) {
                res.status(400).json({
                    success: false,
                    message: "メモIDが不正です。"
                });
                return;
            }

            const deleted = await MemoModel.delete(id);

            if (!deleted) {
                res.status(404).json({
                    success: false,
                    message: "指定されたメモが見つかりません。"
                });
                return;
            }

            // WebSocket通知の実行確認
            console.log("削除イベントを配信します。ID:", id);

            // 他のブラウザへ削除を通知する
            MemoSocket.broadcast({
                type: "deleted",
                id: id,
                originId: req.header("X-Client-Id") ?? undefined
            });

            // 削除成功時はレスポンスボディを返さない
            res.status(204).send();
            return;
        
        } catch (error) {
            console.error("メモ削除エラー：", error);

            res.status(500).json({
                success: false,
                message: "メモの削除に失敗しました。"
            });
        }
    }
}