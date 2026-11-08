# メモ帳SPA 開発環境構築手順書

このドキュメントでは、GitHubからプロジェクトをcloneし、Windows PCでメモ帳SPAを起動するまでの手順を説明します。

本プロジェクトでは、Docker上でMySQL・Nginx・PHP-FPMを起動し、Windows上でExpress・Viteを実行します。

## 1. 必要なソフトウェア

事前に以下のソフトウェアをインストールしてください。

| ソフトウェア             | 用途                     |
| ------------------ | ---------------------- |
| Git                | GitHubからのclone・バージョン管理 |
| Docker Desktop     | MySQLなどのコンテナ起動         |
| Node.js / npm      | Express・Viteの実行        |
| Visual Studio Code | ソースコードの編集（推奨）          |

開発環境ではNode.js 24系を使用しています。

MySQL ServerをWindowsに個別インストールする必要はありません。

### インストール確認

PowerShellで以下を実行します。

```powershell
git --version
docker --version
docker compose version
node -v
npm -v
```

各コマンドでバージョン情報が表示されればOKです。

## 2. GitHubからcloneする

PowerShellまたはVSCodeのターミナルを開きます。

作業用フォルダーへ移動し、以下を実行してください。

```powershell
git clone <リポジトリURL>
```

`<リポジトリURL>` は、チームで使用するGitHubリポジトリのURLに置き換えてください。

続いて、cloneしたフォルダーに移動します。

```powershell
cd <cloneしたフォルダー名>
```

以降の手順では、`docker-compose.yml` が存在するフォルダーを「プロジェクトルート」と呼びます。

## 3. Docker用環境変数の設定

プロジェクトルートで以下を実行します。

```powershell
Copy-Item .env.example .env
```

作成された `.env` を開いて、MySQLの設定を確認してください。

```dotenv
MYSQL_ROOT_PASSWORD=change_me_root_password
MYSQL_DATABASE=phpdb
MYSQL_USER=memo_user
MYSQL_PASSWORD=change_me_user_password
```

`MYSQL_ROOT_PASSWORD` と `MYSQL_PASSWORD` は、それぞれ自分で決めたパスワードに変更してください。

**`.env` はGitHubにcommit・pushしないでください。**

## 4. Express用環境変数の設定

プロジェクトルートで以下を実行します。

```powershell
Copy-Item backend/.env.example backend/.env
```

`backend/.env` を開きます。

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=memo_user
DB_PASSWORD=change_me_user_password
DB_NAME=phpdb
```

### Docker側とExpress側の設定を一致させる

| Docker用 `.env`   | Express用 `.env` |
| ---------------- | --------------- |
| `MYSQL_DATABASE` | `DB_NAME`       |
| `MYSQL_USER`     | `DB_USER`       |
| `MYSQL_PASSWORD` | `DB_PASSWORD`   |

ExpressはWindows側で実行するため、接続先には `127.0.0.1` を指定します。

**注意：** DockerのMySQLボリュームがすでに初期化されている場合、`.env` のパスワードを変更するだけではMySQL内部の既存パスワードは変更されません。

## 5. Dockerコンテナの起動

Docker Desktopを起動します。

続いて、プロジェクトルートで以下を実行してください。

```powershell
docker compose up -d --build
```

初回起動時には、Dockerイメージの取得やコンテナの作成が行われます。

### コンテナの確認

```powershell
docker compose ps
```

以下の3つのサービスが起動していることを確認してください。

| サービス  | 役割          |
| ----- | ----------- |
| nginx | Webサーバー     |
| app   | PHP-FPM     |
| mysql | MySQL 8.4.8 |

### MySQLの初期化

今回の `docker-compose.yml` には、以下の設定があります。

```yaml
- ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
```

MySQLのデータ領域が未初期化の場合、初回起動時に次の処理が行われます。

1. `phpdb` データベースを作成
2. `database/init.sql` を実行
3. `memos` テーブルを作成

したがって、通常はphpMyAdminでテーブルを手動作成する必要はありません。

### 初期化完了の確認

初回起動直後は、MySQLの初期化に時間がかかる場合があります。

以下のコマンドでログを確認できます。

```powershell
docker compose logs mysql
```

MySQLが接続を受け付ける状態になってから、次の手順に進んでください。

> [!WARNING]
> `docker compose down -v` は、MySQLの保存データを削除する可能性があります。
> 通常の停止時には使用しないでください。

## 6. バックエンドのセットアップ

VSCodeで新しいターミナルを開き、プロジェクトルートから `backend` に移動します。

```powershell
cd backend
```

### 依存パッケージのインストール

```powershell
npm ci
```

`package-lock.json` が存在しない場合は、以下を実行してください。

```powershell
npm install
```

### TypeScriptのビルド

```powershell
npx tsc
```

正常に終了すると、`dist` フォルダーにJavaScriptファイルが生成されます。

### Expressの起動

```powershell
node --env-file=.env dist/app.js
```

ExpressとWebSocketが起動します。

| 項目        | URL                               |
| --------- | --------------------------------- |
| Express   | `http://localhost:3000`           |
| WebSocket | `ws://localhost:3000/ws`          |
| メモ一覧API   | `http://localhost:3000/api/memos` |

このターミナルは閉じずに、そのままにしてください。

## 7. フロントエンドのセットアップ

**バックエンドとは別のターミナル**を開きます。

プロジェクトルートから、以下に移動します。

```powershell
cd htdocs/app
```

### 依存パッケージのインストール

```powershell
npm ci
```

`package-lock.json` が存在しない場合は、以下を実行してください。

```powershell
npm install
```

### Viteの起動

```powershell
npm run dev
```

正常に起動すると、ViteのアクセスURLが表示されます。

通常は以下です。

```text
http://localhost:5173/
```

このターミナルも開いたままにしてください。

## 8. 動作確認

ブラウザで以下にアクセスしてください。

**http://localhost:5173/**

メモ帳SPAの画面が表示されたら、次の操作を確認します。

1. メモ一覧が表示される
2. 「＋新規」からメモを作成できる
3. 作成したメモを保存できる
4. 保存済みのメモを編集できる
5. メモを削除できる
6. 並び替えができる

初回はメモが1件も存在しないため、一覧が空でも正常です。

### WebSocketの確認

ブラウザで `F12` を押し、「Console」を開いてください。

正常に接続すると、次のようなログが表示されます。

```text
WebSocket接続成功！
```

さらに、同じアプリを別のタブで開いてメモを保存すると、もう一方のタブに変更内容が反映されます。

**注意：** WebSocketの自動再接続は実装していません。Expressが停止した場合は、サーバー復旧後にブラウザを再読み込みしてください。

## 9. 2回目以降の起動方法

初回セットアップが終わっている場合は、次の3つのターミナルを使用して起動します。

### ターミナル①：Docker

プロジェクトルートで実行します。

```powershell
docker compose up -d
```

### ターミナル②：Express

プロジェクトルートから移動します。

```powershell
cd backend
node --env-file=.env dist/app.js
```

### ターミナル③：Vite

プロジェクトルートから移動します。

```powershell
cd htdocs/app
npm run dev
```

起動後は、ブラウザで `http://localhost:5173/` にアクセスしてください。

## 10. アプリの終了方法

### Expressの停止

Expressを実行しているターミナルで `Ctrl + C` を押します。

### Viteの停止

Viteを実行しているターミナルでも `Ctrl + C` を押します。

### Dockerの停止

プロジェクトルートで以下を実行します。

```powershell
docker compose down
```

通常の `docker compose down` では、MySQLの名前付きボリュームは削除されません。

## 11. ソースコード変更時の注意

### フロントエンド

Viteを起動している間は、通常、TypeScriptやCSSの変更がブラウザに自動反映されます。

### バックエンド

バックエンドのTypeScriptを変更した場合は、Expressを停止して再ビルドしてください。

`backend` フォルダーで以下を実行します。

```powershell
npx tsc
node --env-file=.env dist/app.js
```

### GitHubから更新を取得した場合

他のメンバーが `package.json` や `package-lock.json` を変更した場合は、必要に応じて `npm ci` を再実行してください。

## 12. トラブルシューティング

### Dockerが起動しない

Docker Desktopが起動しているか確認してください。

```powershell
docker compose ps
```

エラーが出る場合は、Docker Desktopの状態も確認してください。

### MySQLに接続できない

以下を確認してください。

* MySQLコンテナが起動しているか
* Docker用とExpress用の環境変数が一致しているか
* `DB_HOST=127.0.0.1` になっているか
* ポート3306を他のMySQLなどが使用していないか
* MySQLの初期化が完了しているか

MySQLのログは以下で確認できます。

```powershell
docker compose logs mysql
```

### APIにアクセスできない

Expressを実行しているターミナルを確認してください。

以下のURLをブラウザで開きます。

```text
http://localhost:3000/api/memos
```

正常であればJSONが返されます。

初期状態では空配列 `[]` が返されます。

### npm ciでエラーが出る

`package-lock.json` が存在するか確認してください。

存在しない場合は `npm install` を使用してください。

また、Node.jsのバージョンも確認してください。

```powershell
node -v
npm -v
```

### TypeScriptのビルドに失敗する

`backend` フォルダーに移動してから実行しているか確認してください。

```powershell
npm ci
npx tsc
```

### メモ一覧が表示されない

次の順番で確認してください。

1. DockerのMySQLコンテナが起動しているか
2. Expressが起動しているか
3. `http://localhost:3000/api/memos` にアクセスできるか
4. Viteが起動しているか

### WebSocketが接続できない

Expressが起動しているか確認してください。

また、Viteのプロキシ設定が正しいか確認してください。

WebSocketの自動再接続は実装していないため、サーバー復旧後はブラウザを再読み込みしてください。

### ポートが使用中と表示される

今回の構成では、主に以下のポートを使用します。

| ポート  | 用途      |
| ---- | ------- |
| 3000 | Express |
| 3306 | MySQL   |
| 5173 | Vite    |
| 8000 | Nginx   |

他のアプリケーションが同じポートを使用していないか確認してください。

## 13. GitHubでの共同開発

各メンバーは、自分の担当機能に対応するブランチで作業してください。

基本的な流れは次のとおりです。

1. 作業開始前に最新の変更を取得する
2. 担当ブランチで作業する
3. 機能単位でcommitする
4. GitHubへpushする
5. Pull Requestを作成する
6. レビュー後に統合する

**次のファイルはGitHubにpushしないでください。**

* `.env`
* `backend/.env`
* `node_modules/`
* `dist/`
* ログファイル

環境変数を共有する場合は、`.env.example` を使用してください。

## 14. 補足・注意事項

本アプリはローカルでの開発・学習用途を想定しています。

MySQLの保存データは、各メンバーのDocker環境に保存されます。

GitHubからcloneしても、他のメンバーが登録したメモデータは引き継がれません。

また、MySQLのデータボリュームがすでに初期化されている場合、初期化SQLは自動実行されません。

データベースに問題が発生した場合でも、保存データを削除する前に原因を確認してください。

---

以上で、メモ帳SPAの開発環境構築は完了です。
