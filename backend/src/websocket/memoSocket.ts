// WebSocketライブラリをインポートする
import WebSocket, { WebSocketServer } from "ws";

// HTTPサーバーの型をインポートする
import type { Server } from "http";

// ========================================
// WebSocketイベントの型定義
// ========================================

// メモ変更イベントの種類
export type MemoEventType = "created" | "updated" | "deleted";

// 配信するイベントの型
export interface MemoEvent {
    type: MemoEventType;

    // 変更されたメモ情報
    memo?: {
        id: number;
        title: string;
        content: string;
        created_at: Date;
        updated_at: Date;
    };

    // 削除されたメモID
    id?: number;

    // 変更元のクライアントID
    originId?: string;
}

// ========================================
// WebSocketサーバー
// ========================================
export class MemoSocket {

    // WebSocketサーバーを保持する
    private static wss: WebSocketServer;

    // ------------------------------------
    // WebSocketサーバー初期化
    // ------------------------------------
    static initialize(server: Server): void {
        
        // HTTPサーバーとWebSocketサーバーを共有する
        this.wss = new WebSocketServer({
            server,
            path: "/ws"
        });

        // クライアント接続時の処理
        this.wss.on("connection", (ws: WebSocket) => {

            console.log("WebSocketクライアントが接続しました。");

            // 接続終了時
            ws.on("close", () => {
                console.log("WebSocketクライアントが切断しました。");
            });

            // エラー発生時
            ws.on("error", (error) => {
                console.error("WebSocketエラー：", error);
            });
        });

        console.log("WebSocketサーバーを初期化しました。");
    }

    // ------------------------------------
    // 全クライアントへイベントを配信
    // ------------------------------------
    static broadcast(event: MemoEvent): void {

        // サーバーが初期化されていない場合
        if (!this.wss) {
            return;
        }

        // イベントをJSON形式に変換
        const message = JSON.stringify(event);

        // 接続中のクライアントへ配信
        this.wss.clients.forEach((client) => {

            // 接続状態がOPENの場合のみ送信
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}