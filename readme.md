# メモ帳SPA（Memo SPA）

TypeScript・Express・MySQL・WebSocketを使用して開発した、シングルページアプリケーション（SPA）形式のメモ帳です。

フロントエンドとバックエンドの両方にTypeScriptを採用し、メモの登録・編集・削除に加えて、複数タブ間でのリアルタイム同期に対応しています。

## 1. 主な機能

* メモの新規登録
* メモの一覧表示
* メモの編集・保存
* メモの削除（論理削除）
* 6種類の並び替え
* 未保存変更の検出・確認
* LocalStorageを利用した下書きの自動保存・復元
* タブごとの下書き保存領域の分離
* WebSocketによるリアルタイム同期
* 他のタブで更新されたメモの自動反映
* 編集中の内容を保護する機能

### 並び替え条件

1. 更新日時が新しい順
2. 更新日時が古い順
3. 作成日時が新しい順
4. 作成日時が古い順
5. タイトル昇順
6. タイトル降順

## 2. 使用技術

| 分類       | 技術                      |
| -------- | ----------------------- |
| フロントエンド  | HTML / CSS / TypeScript |
| 開発サーバー   | Vite                    |
| バックエンド   | Node.js / TypeScript    |
| Web API  | Express 5               |
| データベース   | MySQL 8.4.8             |
| データベース接続 | mysql2                  |
| リアルタイム通信 | WebSocket（ws）           |
| コンテナ環境   | Docker / Docker Compose |
| Webサーバー  | Nginx 1.29.7            |
| バージョン管理  | Git / GitHub            |

## 3. システム構成

```text
ブラウザ
   │
   ▼
Vite（localhost:5173）
   │
   │ /api・/ws
   ▼
Express（localhost:3000）
   │
   ├── REST API
   │
   ├── WebSocket
   │
   └── MySQL（Docker）
          │
          └── phpdb
                └── memos
```

フロントエンドはViteで動作します。

ExpressはREST APIとWebSocket通信を担当し、MySQLへの接続を行います。

MySQLはDockerコンテナ内で動作します。

## 4. ディレクトリ構成

```text
php-docker/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
├── SETUP.md
│
├── database/
│   └── init.sql
│
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts
│       ├── db.ts
│       ├── controllers/
│       ├── models/
│       ├── routes/
│       └── websocket/
│
├── docker/
│   ├── nginx/
│   ├── php/
│   └── mysql/
│
└── htdocs/
    └── app/
        ├── package.json
        ├── index.html
        └── src/
            ├── main.ts
            └── style.css
```

※主要なファイルとディレクトリのみ記載しています。

## 5. 開発環境の構築

初めてアプリを起動する場合は、以下の手順書を参照してください。

**[環境構築手順書（SETUP.md）](SETUP.md)**

開発には以下のソフトウェアが必要です。

* Git
* Docker Desktop
* Node.js / npm
* Visual Studio Code（推奨）

MySQL ServerをWindowsへ個別にインストールする必要はありません。

## 6. 起動方法

初回セットアップが完了している場合は、以下の順番で起動します。

### ① Dockerの起動

プロジェクトのルートディレクトリで実行します。

```powershell
docker compose up -d
```

### ② バックエンドの起動

別のターミナルで実行します。

```powershell
cd backend
node --env-file=.env dist/app.js
```

### ③ フロントエンドの起動

さらに別のターミナルで実行します。

```powershell
cd htdocs/app
npm run dev
```

### ④ ブラウザでアクセス

以下のURLを開いてください。

**http://localhost:5173/**

> [!NOTE]
> 初回起動時は、環境変数の設定、依存パッケージのインストール、TypeScriptのビルドが必要です。
> 詳細は [SETUP.md](SETUP.md) を参照してください。

## 7. REST API一覧

| HTTPメソッド | エンドポイント          | 処理内容   |
| -------- | ---------------- | ------ |
| GET      | `/api/memos`     | メモ一覧取得 |
| GET      | `/api/memos/:id` | メモ詳細取得 |
| POST     | `/api/memos`     | メモ新規登録 |
| PUT      | `/api/memos/:id` | メモ更新   |
| DELETE   | `/api/memos/:id` | メモ論理削除 |

### メモのデータ構造

```json
{
  "id": 1,
  "title": "サンプルメモ",
  "content": "メモの本文です。",
  "is_deleted": 0,
  "created_at": "2026-11-08T10:00:00.000Z",
  "updated_at": "2026-11-08T10:00:00.000Z"
}
```

※日時はレスポンス形式の例です。実際の値はデータベースの登録内容によって異なります。

## 8. WebSocket

WebSocketを使用して、複数タブ間でメモの変更を通知します。

### 接続先

```text
ws://localhost:3000/ws
```

通常のブラウザ利用では、Viteのプロキシを経由して接続します。

### 通知イベント

| イベント      | 処理内容    |
| --------- | ------- |
| `created` | メモの新規登録 |
| `updated` | メモの更新   |
| `deleted` | メモの削除   |

### 同期処理

* メモが変更された場合、他のタブに通知する
* 自分自身が発生させた通知は除外する
* 未編集中のメモは最新の内容に更新する
* 編集中のメモは上書きせず、通知を表示する

> [!NOTE]
> WebSocketの自動再接続機能は実装していません。
> サーバーとの接続が切れた場合は、サーバー復旧後にブラウザを再読み込みしてください。

## 9. データベース

### データベース情報

| 項目      | 内容          |
| ------- | ----------- |
| DBMS    | MySQL 8.4.8 |
| データベース名 | phpdb       |
| テーブル名   | memos       |

### memosテーブル

| カラム名       | データ型            | 説明        |
| ---------- | --------------- | --------- |
| id         | BIGINT UNSIGNED | メモID（主キー） |
| title      | VARCHAR(100)    | メモのタイトル   |
| content    | MEDIUMTEXT      | メモの本文     |
| is_deleted | BOOLEAN         | 論理削除フラグ   |
| created_at | DATETIME        | 作成日時      |
| updated_at | DATETIME        | 更新日時      |

### 初期化方法

MySQLのデータ領域が未初期化の場合、Dockerの初回起動時に `database/init.sql` が自動実行されます。

すでにデータが存在する場合、初期化SQLは自動再実行されません。

### 論理削除について

メモの削除では、データベースからレコードを物理削除せず、`is_deleted` を `1` に更新します。

通常の一覧表示では、削除済みのメモを取得対象から除外します。

## 10. 下書きの自動保存

メモの編集中は、LocalStorageを使用して入力内容を一時保存します。

ページを再読み込みした際に未保存の下書きが存在すると、復元確認ダイアログを表示します。

また、複数タブ間で保存内容が競合しないよう、タブごとに異なる保存キーを使用しています。

※ブラウザのタブ複製など、一部の操作では同じタブ識別情報が引き継がれる可能性があります。

## 11. GitHubでの共同開発

本プロジェクトは、GitHubを使用してソースコードを管理します。

### 基本ルール

* 各自、担当機能ごとのブランチを作成する
* 作業開始前に最新の変更を取得する
* 機能単位でcommitする
* 作業内容をGitHubへpushする
* 必要に応じてPull Requestを作成する
* 他のメンバーの変更を適宜取り込む

### Git管理の対象外

以下のファイルはGitHubにpushしないでください。

```text
.env
node_modules/
dist/
*.log
```

環境変数を共有する場合は、`.env.example` を使用してください。

## 12. 注意事項

* 本アプリはローカル開発・学習用途を想定しています。
* 本番環境での公開を前提とした認証・セキュリティ対策は実装していません。
* MySQLの保存データは各メンバーのPCに保持されます。
* GitHubからcloneしても、他のメンバーが登録したメモのデータは共有されません。
* Dockerのデータボリュームを削除すると、保存済みのメモが失われる可能性があります。
* WebSocketが切断された場合は、ブラウザの再読み込みが必要です。

## 13. 関連ドキュメント

* [環境構築手順書（SETUP.md）](SETUP.md)
* [データベース初期化SQL](database/init.sql)

---

**メモ帳SPA — TypeScript / Express / MySQL / WebSocket**
