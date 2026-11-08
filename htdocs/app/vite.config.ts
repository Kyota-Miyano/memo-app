// Viteの設定を読み込む
import { defineConfig } from "vite";

// Viteの開発サーバーを設定
export default defineConfig({
    server: {
        proxy: {
            // APIへのアクセスをExpressに転送する
            "/api": {
                target: "http://localhost:3000",
                changeOrigin: true
            },

            // WebSocket通信もExpressに転送する
            "/ws": {
                target: "ws://localhost:3000",
                ws: true
            }
        }
    }
});