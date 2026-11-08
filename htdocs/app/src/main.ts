// ========================================
// メモ帳SPA メイン処理
// ========================================

// cssを読み込む
import "./style.css";

// ========================================
// メモの型の定義
// ========================================

// Express APIから取得するメモのデータ構造
interface Memo {
  id: number,
  title: string,
  content: string,
  is_deleted: number,
  created_at: string;
  updated_at: string;
}

// ========================================
// 一時保存データの型定義
// ========================================
interface MemoDraft {
  memoId: number | null,
  title: string;
  content: string;
  savedAt: string;
}

// ========================================
// LocalStorageの複数タブ対策
// ========================================

// タブ識別IDを保持するキー
const TAB_ID_STORAGE_KEY = "memo-spa-tab-id";

// 下書き保存キーの接頭辞
const DRAFT_STORAGE_PREFIX = "memo-spa-draft";

// タブごとの識別IDを取得する
function getTabId(): string {

  // sessionStorageからタブIDを取得
  let tabId = sessionStorage.getItem(TAB_ID_STORAGE_KEY);

  // 初回アクセス時は新規作成
  if (!tabId) {
    tabId = crypto.randomUUID();

    // 同じタブ内の再読み込みでも使えるように保持
    sessionStorage.setItem(TAB_ID_STORAGE_KEY, tabId);
  }

  return tabId;
}

// タブごとの下書き保存キーを作成する
const DRAFT_STORAGE_KEY = `${DRAFT_STORAGE_PREFIX}:${getTabId()}`;

// ========================================
// 現在選択されているメモ
// ========================================

// 選択中のメモID
let selectedMemoId: number | null = null;

// ========================================
// メモ一覧を保持する
// ========================================

// APIから取得したメモの一覧
let memos: Memo[] = [];

// ========================================
// 未保存変更の管理
// ========================================

// 最後に保存・読み込みしたタイトル
let originalTitle = "";

// 最後に保存・読み込みした本文
let originalContent = "";

// 未保存の変更があるかどうか
let isDirty = false;

// ========================================
// WebSocket クライアント識別
// ========================================

// WebSocketでも同じタブIDを使用する
const clientId = getTabId();

// ========================================
// メモ一覧をAPIから取得
// ========================================
async function fetchMemos(): Promise<Memo[]> {

  // Expressのメモ一覧APIにアクセス
  const response = await fetch("/api/memos");

  // HTTPエラーの場合
  if (!response.ok) {
    throw new Error("メモ一覧の取得に失敗しました。");
  }

  // JSONを取得して返す
  const memos: Memo[] = await response.json();

  return memos;
}

// ========================================
// 日時を日本語形式に変換
// ========================================
function formatDate(dateString: string): string {

  const date = new Date(dateString);

  // 日時が不正な場合
  if (Number.isNaN(date.getTime())) {
    return "日時不明";
  }

  // 日本時間で表示
  return date.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ========================================
// 編集途中の内容をLocalStorageに一時保存
// ========================================
function saveDraft(): void {

  const memoTitle = document.querySelector<HTMLInputElement>("#memo-title");
  const memoContent = document.querySelector<HTMLTextAreaElement>("#memo-content");

  if (!memoTitle || !memoContent) {
    return;
  }

  // 未保存変更がない場合は一時保存を削除
  if (!isDirty) {
    clearDraft();
    return;
  }

  // 一時保存データを作成
  const draft: MemoDraft = {
    memoId: selectedMemoId,
    title: memoTitle.value,
    content: memoContent.value,
    savedAt: new Date().toISOString()
  };

  try {
    // JSON形式に変換して保存
    localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify(draft)
    );

    console.log("編集中のメモを一時保存しました。");
  
  } catch (error) {
    console.error("一時保存に失敗しました：", error);
  }
}

// ========================================
// 一時保存データを復元する
// ========================================
function restoreDraft(): void {

  const storedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);

  // 一時保存データがなければ終了
  if (!storedDraft) {
    return;
  }

  try {
    const draft: MemoDraft = JSON.parse(storedDraft);

    // 保存データの形式を確認
    if ( !draft || (draft.memoId !== null && (!Number.isSafeInteger(draft.memoId) || draft.memoId <= 0 )) ||
      typeof draft.title !== "string" ||
      typeof draft.content !== "string" ||
      draft.title.length > 100 ||
      draft.content.length > 10000
  ) {
    clearDraft();
    return;
  }

  // 復元するか確認
  const confirmed = window.confirm(
    "前回編集中だったメモがあります。\n復元しますか？"
  );

  if (!confirmed) {
    clearDraft();
    return;
  }

  const memoTitle = document.querySelector<HTMLInputElement>("#memo-title");
  const memoContent = document.querySelector<HTMLTextAreaElement>("#memo-content");
  const deleteButton = document.querySelector<HTMLButtonElement>("#delete-btn");

  if (!memoTitle || !memoContent || !deleteButton) {
    return;
  }

  // 既存メモの場合、現在の一覧から探す
  const targetMemo = draft.memoId === null ? null : memos.find((memo) => memo.id === draft.memoId);

  // 既存メモが削除されていた場合
  if (draft.memoId !== null && !targetMemo) {
    clearDraft();
    window.alert("復元対象のメモが見つかりませんでした。");
    return;
  }

  // 選択中のメモIDを復元
  selectedMemoId = draft.memoId;

  // 保存済み内容を比較基準に設定
  originalTitle = targetMemo?.title ?? "";
  originalContent = targetMemo?.content ?? "";

  // 編集途中の内容を復元
  memoTitle.value = draft.title;
  memoContent.value = draft.content;

  // 削除ボタンの状態を設定
  deleteButton.disabled = selectedMemoId === null;

  // 選択中のメモを強調表示
  document.querySelectorAll<HTMLButtonElement>(".memo-item")
    .forEach((item) => {
      item.classList.toggle(
        "active",
        Number(item.dataset.id) === selectedMemoId
      );
    });

    // 未保存状態を再判定
    checkDirty();

    console.log("一時保存データを復元しました。");

  } catch (error) {
    console.error("一時保存データの復元に失敗しました：", error);
    clearDraft();
  }
}

// ========================================
// 一時保存データを削除
// ========================================
function clearDraft(): void {
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

// ========================================
// 未保存変更の判定
// ========================================
function checkDirty(): void {

  const memoTitle = document.querySelector<HTMLInputElement>("#memo-title");
  const memoContent = document.querySelector<HTMLTextAreaElement>("#memo-content");
  const statusMessage = document.querySelector<HTMLSpanElement>("#status-message");

  if (!memoTitle || !memoContent || !statusMessage) {
    return;
  }

  // 保存済みの内容と現在の入力内容を比較
  isDirty =
    memoTitle.value !== originalTitle || memoContent.value !== originalContent;

  // 未保存状態を表示
  if (isDirty) {
    statusMessage.textContent = "未保存の変更があります。";
  } else {
    statusMessage.textContent = "";
  }

  // 編集途中の内容を一時保存
  saveDraft();
}

// ========================================
// 未保存変更がある場合の確認
// ========================================
function confirmDiscardChanges(): boolean {

  // 未保存の変更がない場合は確認不要
  if (!isDirty) {
    return true;
  }

  // 未保存の変更がある場合は確認ダイアログを表示
  return window.confirm(
    "未保存の変更があります。\n変更を破棄して移動しますか？"
  );
}

// ========================================
// メモ選択処理
// ========================================
function selectMemo(memo: Memo): void {

  // 同じメモを選択した場合は何もしない
  if (selectedMemoId === memo.id) {
    return;
  }

  // 未保存の変更があれば、移動前に確認する
  if (!confirmDiscardChanges()) {
    return;
  }

  // 変更を破棄することに同意したため、一時保存データを削除
  clearDraft();
  
  // タイトル入力欄を取得
  const memoTitle = document.querySelector<HTMLInputElement>("#memo-title");

  // 本文入力欄を取得
  const memoContent = document.querySelector<HTMLTextAreaElement>("#memo-content");

  // HTML要素の存在確認
  if (!memoTitle || !memoContent) {
    console.error("メモ編集欄が見つかりません。");
    return;
  }

  // 選択中のメモIDを保存
  selectedMemoId = memo.id;

  // 既存メモを選択したので削除ボタンを有効にする
  const deleteButton = document.querySelector<HTMLButtonElement>("#delete-btn");

  if (deleteButton) {
    deleteButton.disabled = false;
  }

  // 右側の入力欄にメモ情報を表示
  memoTitle.value = memo.title;
  memoContent.value = memo.content;

  // 選択したメモの内容を基準として保持
  originalTitle = memo.title;
  originalContent = memo.content;

  // 読み込んだ直後なので未保存変更はない
  isDirty = false;

  // ステータス表示を初期化
  const statusMessage = document.querySelector<HTMLSpanElement>("#status-message");

  if (statusMessage) {
    statusMessage.textContent = "";
  }

  // 選択中のメモを強調表示
  document.querySelectorAll<HTMLButtonElement>(".memo-item").forEach((item) => {
    item.classList.toggle(
      "active",
      Number(item.dataset.id) === memo.id
    );
  });

  console.log("メモを選択しました。ID", selectedMemoId);
}

// ========================================
// 新規メモ作成
// ========================================
function newMemo(): void {

  // 未保存の変更があれば、新規作成前に確認する
  if (!confirmDiscardChanges()) {
    return;
  }

  // 変更を破棄することに同意した場合
  clearDraft();

  // 入力欄を取得
  const memoTitle = document.querySelector<HTMLInputElement>("#memo-title");
  const memoContent = document.querySelector<HTMLTextAreaElement>("#memo-content");
  const deleteButton = document.querySelector<HTMLButtonElement>("#delete-btn");
  const statusMessage = document.querySelector<HTMLSpanElement>("#status-message");

  if (!memoTitle || !memoContent || !deleteButton || !statusMessage) {
    console.error("メモ編集欄が見つかりません。");
    return;
  }

  // 選択中のメモを解除
  selectedMemoId = null;

  // 入力欄を空にする
  memoTitle.value = "";
  memoContent.value = "";

  // 新規作成時は空の内容を基準にする
  originalTitle = "";
  originalContent = "";
  isDirty = false;

  // 一覧の選択状態を解除
  document.querySelectorAll<HTMLButtonElement>(".memo-item").forEach((item) => {
    item.classList.remove("active");
  });

  // 新規作成中は削除できないようにする
  deleteButton.disabled = true;

  // ステータスを表示
  statusMessage.textContent = "新しいメモを入力してください。";

  // タイトル欄にカーソルを移動
  memoTitle.focus();
}

// ========================================
// メモ一覧の並び替え
// ========================================
function sortMemos(memos: Memo[]): Memo[] {

  // 並び替えプルダウンを取得
  const sortSelect = document.querySelector<HTMLSelectElement>("#sort-select");

  // 現在選択されている並び替え方法
  const sorttType = sortSelect?.value ?? "updated-desc";

  // 元の配列を変更しないようにコピーする
  const sortedMemos = [...memos];

  // 並び替え方法によって処理を切り替える
  switch (sorttType) {

    case "updated-desc":
      sortedMemos.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      break;

    case "updated-asc":
      sortedMemos.sort((a, b) => 
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      );
      break;

    case "created-desc":
      sortedMemos.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      break;

    case "created-asc":
      sortedMemos.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      break;

    case "title-asc":
      sortedMemos.sort((a, b) => 
        a.title.localeCompare(b.title, "ja")
      );
      break;

    case "title-desc":
      sortedMemos.sort((a, b) => 
        b.title.localeCompare(a.title, "ja")
      );
      break;
  }

  return sortedMemos;
}

// ========================================
// メモ一覧を画面に表示
// ========================================
function renderMemoList(memos: Memo[]): void {

  // メモ一覧の表示領域を取得
  const memoList = document.querySelector<HTMLDivElement>("#memo-list");
  if (!memoList) {
    return;
  }

  // 以前の表示内容を削除
  memoList.replaceChildren();

  // メモが存在しない場合
  if (memos.length === 0) {
    memoList.textContent = "メモがありません。";
    return;
  }

  // 選択された条件で並び替える
  const sortedMemos = sortMemos(memos);

  // メモを1件ずつ表示
  sortedMemos.forEach((memo) => {

    // メモ項目のボタンを作成
    const item = document.createElement("button");
    item.type = "button";
    item.className = "memo-item";

    // メモIDをHTML要素に保持する
    item.dataset.id = String(memo.id);

    // メモ選択時の処理
    item.addEventListener("click", () => {
      selectMemo(memo);
    });

    // 現在選択中のメモであれば強調表示する
    if (selectedMemoId === memo.id) {
      item.classList.add("active");
    }

    // メモタイトルを作成
    const title = document.createElement("span");
    title.className = "memo-item-title";
    title.textContent = memo.title;

    // 更新日時を作成
    const date = document.createElement("span");
    date.className = "memo-item-date";
    date.textContent = formatDate(memo.updated_at);

    // タイトルと日時をボタンに追加
    item.appendChild(title);
    item.appendChild(date);

    // メモ一覧に追加
    memoList.appendChild(item);
  });
}

// ========================================
// メモ一覧を再読み込みする
// ========================================
async function reloadMemos(): Promise<void> {

  // APIから最新のメモ一覧を取得
  memos = await fetchMemos();

  // 左側の一覧を更新
  renderMemoList(memos);
}

// ========================================
// 選択中のメモの内容を最新状態に更新
// ========================================
function refreshSelectedMemo(memo: Memo): void {

  const memoTitle = document.querySelector<HTMLInputElement>("#memo-title");
  const memoContent = document.querySelector<HTMLTextAreaElement>("#memo-content");

  if (!memoTitle || !memoContent) {
    return;
  }

  // 入力欄に最新の内容を反映
  memoTitle.value = memo.title;
  memoContent.value = memo.content;

  // 未保存変更の比較基準も更新
  originalTitle = memo.title;
  originalContent = memo.content;
  isDirty = false;

  // 保存済みの内容なので一時保存データを削除
  clearDraft();
}

// ========================================
// 他のタブで変更されたメモを同期
// ========================================
async function syncMemoChange(
  eventType: "created" | "updated" | "deleted",
  changedMemoId: number | null
): Promise<void> {

  // 最新のメモ一覧を取得する
  await reloadMemos();

  // 選択中のメモがない場合
  if (selectedMemoId === null) {
    return;
  }

  // 選択されたメモと選択中のメモが異なる場合
  if (selectedMemoId !== changedMemoId) {
    return;
  }

  const statusMessage = document.querySelector<HTMLSpanElement>("#status-message");

  // ------------------------------------
  // 他のタブで削除された場合
  // ------------------------------------
  if (eventType === "deleted") {

    if (statusMessage) {
      statusMessage.textContent = "このメモは別のタブで削除されました。";
    }

    // 編集内容は勝手に消さない
    return;
  }

  // ------------------------------------
  // 他のタブで更新された場合
  // ------------------------------------
  if (eventType === "updated") {

    // 編集中なら上書きしない
    if (isDirty) {

      if (statusMessage) {
        statusMessage.textContent = "別のタブで更新されました。編集中の内容は保持しています。";
      }

      return;
    }

    // 最新のメモを追加
    const latestMemo = memos.find((memo) => memo.id === selectedMemoId);

    if (!latestMemo) {
      return;
    }

    // 未編修なら最新の内容を反映
    refreshSelectedMemo(latestMemo);

    if (statusMessage) {
      statusMessage.textContent = "別のタブで更新された内容を反映しました。";
    }
  }
}

// ========================================
// WebSocket接続処理
// ========================================
function connectWebSocket(): void {

  // 現在のページに合わせてws / wssを選択
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  // Viteのプロキシ経由でWebSocketに接続する
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  const socket = new WebSocket(wsUrl);

  // ------------------------------------
  // 接続成功時
  // ------------------------------------ 
  socket.addEventListener("open", () => {
    console.log("WebSocket接続成功！");
  });

  // ------------------------------------
  // メモ変更通知を受信したとき
  // ------------------------------------
  socket.addEventListener("message", (event) => {

    try {
      const data = JSON.parse(event.data);

      // 自分が発生させた変更通知は無視する
      if (data.originId === clientId) {
        console.log("自分の変更通知は無視しました。");
        return;
      }

      // メモ変更イベントを受信
      if (data.type === "created" || data.type === "updated" || data.type === "deleted") {

        console.log("WebSocketイベント受信：", data);

        // 変更されたメモIDを取得
        const changeMemoId: number | null = data.type === "deleted" ? data.id : data.memo?.id ?? null;

        // 編集状態を考慮して同期する
        void syncMemoChange(data.type, changeMemoId).catch((error) => {
          console.error("WebSocket同期エラー：", error);
        });
      }
    } catch (error) {
      console.error("WebSocketデータ解析エラー：", error);
    }
  });

  // ------------------------------------
  // エラー発生時
  // ------------------------------------
  socket.addEventListener("error", (error) => {
    console.error("WebSocketエラー：", error);
  });

  // ------------------------------------
  // 切断時
  // ------------------------------------
  socket.addEventListener("close", () => {
    console.warn("WebSocket接続が切断されました。");
  });
}

// ========================================
// メモ保存処理
// ========================================
async function saveMemo(): Promise<void> {

  // HTML要素を取得
  const memoTitle = document.querySelector<HTMLInputElement>("#memo-title");
  const memoContent = document.querySelector<HTMLTextAreaElement>("#memo-content");
  const saveButton = document.querySelector<HTMLButtonElement>("#save-btn");
  const deleteButton = document.querySelector<HTMLButtonElement>("#delete-btn");
  const statusMessage = document.querySelector<HTMLSpanElement>("#status-message");

  // HTML要素の存在確認
  if (!memoTitle || !memoContent || !saveButton || !deleteButton || !statusMessage) {
    console.error("メモ保存に必要なHTML要素が見つかりません。");
    return;
  }

  // 入力された内容を取得
  const title = memoTitle.value;
  const content = memoContent.value;

  // 文字数制限を確認
  if (title.length > 100 || content.length > 10000) {
    statusMessage.textContent = "タイトルまたは本文の文字数が上限を超えています。";
    return;
  }

  // 新規登録か更新かを判定
  const isNew = selectedMemoId === null;

  // APIのURLとHTTPメソッドを決定
  const url = isNew ? "/api/memos" : `/api/memos/${selectedMemoId}`;
  const method = isNew ? "POST" : "PUT";

  try {
    // 保存中はボタンを無効化
    saveButton.disabled = true;
    statusMessage.textContent = "保存中...";

    // API保存リクエストを送信
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": clientId
      },
      body: JSON.stringify({
        title,
        content
      })
    });

    // 保存に失敗した場合
    if (!response.ok) {
      throw new Error(`保存に失敗しました。HTTP ${response.status}`);
    }

    // 保存されたメモを取得
    const saveMemo: Memo = await response.json();

    // 保存後のメモIDを保持
    selectedMemoId = saveMemo.id;

    // タイトルが自動補完された場合も反映
    memoTitle.value = saveMemo.title;
    memoContent.value = saveMemo.content;

    // 保存した内容を新しい比較基準にする
    originalTitle = saveMemo.title;
    originalContent = saveMemo.content;

    // 保存が完了したため未保存状態を解除
    isDirty = false;

    // 正式に保存したため、一時保存データを削除
    clearDraft();

    // 最新のメモ一覧を取得
    await reloadMemos();

    // 保存済みのメモなので削除ボタンを有効化
    deleteButton.disabled = false;

    // 保存結果を表示
    statusMessage.textContent = "保存しました。";

    console.log("メモ保存成功：", saveMemo);
  
  } catch (error) {
    
    console.error("メモ保存エラー：", error);
    statusMessage.textContent = "保存に失敗しました。";
  
  } finally {

    // 保存ボタンを再び有効化
    saveButton.disabled = false;
  }
}

// ========================================
// メモ削除処理
// ========================================
async function deleteMemo(): Promise<void> {

  // 選択中のメモがない場合は処理しない
  if (selectedMemoId === null) {
    return;
  }

  // HTML要素を取得
  const memoTitle = document.querySelector<HTMLInputElement>("#memo-title");
  const memoContent = document.querySelector<HTMLTextAreaElement>("#memo-content");
  const deleteButton = document.querySelector<HTMLButtonElement>("#delete-btn");
  const statusMessage = document.querySelector<HTMLSpanElement>("#status-message");

  // 必要な要素が存在するか確認
  if (!memoTitle || !memoContent || !deleteButton || !statusMessage) {
    console.error("メモ削除に必要なHTML要素が見つかりません。");
    return;
  }

  // 削除前の確認
  const confirmed = window.confirm("このメモを削除しますか？");

  // キャンセルされた場合は何もしない
  if (!confirmed) {
    return;
  }

  // 削除対象のIDを保持
  const id = selectedMemoId;

  try {
    // 削除処理中はボタンを無効化
    deleteButton.disabled = true;
    statusMessage.textContent = "削除中...";

    // ExpressのDELETE APIを呼び出す
    const response = await fetch(`/api/memos/${id}`, {method: "DELETE", headers: {"X-Client-Id": clientId}});

    // DELETEリクエストが失敗した場合
    if (!response.ok) {
      throw new Error(`削除に失敗しました。HTTP ${response.status}`);
    }

    // 選択状態を解除
    selectedMemoId = null;

    // 入力欄を空にする
    memoTitle.value = "";
    memoContent.value = "";

    // 編集状態を初期化する
    originalTitle = "";
    originalContent = "";
    isDirty = false;

    // 削除したメモの一時保存データを削除
    clearDraft();

    // メモ一覧を再読み込み
    await reloadMemos();

    // 削除完了メッセージ
    statusMessage.textContent = "削除しました。";

    console.log("メモ削除成功。ID", id);
  
  } catch (error) {

    console.error("メモ削除エラー：", error);
    statusMessage.textContent = "削除に失敗しました。";

    // 失敗した場合は再操作できるようにする
    if (selectedMemoId !== null) {
      deleteButton.disabled = false;
    }
  }

}

// ========================================
// アプリの初期化
// ========================================
async function initializeApp(): Promise<void> {
  console.log("メモ帳SPAを起動しました。");

  // ------------------------------------
  // HTML要素を取得
  // ------------------------------------
  const memoList = document.querySelector<HTMLDivElement>("#memo-list");
  const memoTitle = document.querySelector<HTMLInputElement>("#memo-title");
  const memoContent = document.querySelector<HTMLTextAreaElement>("#memo-content");

  // ------------------------------------
  // HTML要素の存在確認
  // ------------------------------------
  if (!memoList || !memoTitle || !memoContent) {
    console.error("メモ帳SPAのHTML要素が見つかりません。");
    return;
  }

  // ------------------------------------
  // 新規作成ボタンのイベント設定
  // ------------------------------------

  // 新規作成ボタンを取得
  const newMemoButton = document.querySelector<HTMLButtonElement>("#new-memo-btn");

  // 削除ボタンを取得
  const deleteButton = document.querySelector<HTMLButtonElement>("#delete-btn");

  // 新規作成ボタンをクリックしたとき
  newMemoButton?.addEventListener("click", () => {
    newMemo();
  });

  // 初期状態では削除ボタンを無効にする
  if (deleteButton) {
    deleteButton.disabled = true;
  }

  // ------------------------------------
  // 保存ボタンのイベント設定
  // ------------------------------------

  // 保存ボタンを取得
  const saveButton = document.querySelector<HTMLButtonElement>("#save-btn");

  // 保存ボタンをクリックしたとき
  saveButton?.addEventListener("click", () => {
    void saveMemo();
  });

  // ------------------------------------
  // 削除ボタンのイベント設定
  // ------------------------------------

  // 削除ボタンを取得
  deleteButton?.addEventListener("click", () => {
    void deleteMemo();
  });

  // ========================================
  // 並び替えプルダウンのイベント
  // ========================================

  // 並び替えプルダウンを取得
  const sortSelect = document.querySelector<HTMLSelectElement>("#sort-select");

  // 選択された並び替え方法が変わったとき
  sortSelect?.addEventListener("change", () => {
    // 現在保持しているメモ一覧を再描画する
    renderMemoList(memos);
  });

  // ========================================
  // タイトル・本文の変更検出
  // ========================================

  // タイトルが変更されたとき
  memoTitle.addEventListener("input", () => {
    checkDirty();
  });

  // 本文が変更されたとき
  memoContent.addEventListener("input", () => {
    checkDirty();
  });

  // ------------------------------------
  // メモ一覧の取得・表示
  // ------------------------------------
  try {

    // 読み込み中のメッセージ
    memoList.textContent = "メモ一覧を読み込んでいます...";

    // MySQLからメモ一覧を取得して表示
    await reloadMemos();

    // メモ一覧の取得後に一時保存データを復元
    restoreDraft();

    // WebSocketサーバーに接続する
    connectWebSocket();

    console.log("メモ一覧の取得に成功しました。", memos);
  
  } catch (error) {
    
    console.error("メモ一覧取得エラー：", error);
    memoList.textContent = "メモ一覧の取得に失敗しました。";
  }
}

// ========================================
// HTML読み込み完了後に初期化
// ========================================
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    void initializeApp();
  });

} else {
  
  void initializeApp();
}