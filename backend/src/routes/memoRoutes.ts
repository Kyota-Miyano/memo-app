// ExpressのRouterをインポート
import { Router } from "express";

// メモコントローラーをインポート
import { MemoController } from "../controllers/memoController";

// メモ用ルーターを作成
const router = Router();

// ========================================
// メモ一覧取得
// GET /api/memos
// ========================================
router.get("/", MemoController.index);

// ========================================
// メモ詳細取得
// GET /api/memos/:id
// ========================================
router.get("/:id", MemoController.show);

// ========================================
// メモ新規登録
// POST /api/memos
// ========================================
router.post("/", MemoController.create);

// ========================================
// メモ更新
// PUT /api/memos/:id
// ========================================
router.put("/:id", MemoController.update);

// ========================================
// メモ論理削除
// DELETE /api/memos/:id
// ========================================
router.delete("/:id", MemoController.remove);

// ルーターをエクスポート
export default router;