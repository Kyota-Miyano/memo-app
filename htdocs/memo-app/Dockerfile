# Node.js 24の軽量な公式イメージを使用
FROM node:24.22.1-alpine

# コンテナ内の作業ディレクトリを設定
WORKDIR /app

# npmの設定ファイルをコピー
COPY package*.json ./

# 必要なライブラリをインストール
RUN npm install

# アプリケーションのファイルをコピー
COPY . .

# Expressで使用するポート
EXPOSE 3000

# 開発サーバーを起動
CMD ["npm", "run", "start:dev"]