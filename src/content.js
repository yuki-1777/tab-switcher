console.log("=== content.js 読み込み完了 ===");

// 変数定義
let isSwitcherOpen = false;
let groups = [];
let selectedIndex = 0;
let overlayElement = null;

// === 起動ロジック (共通) ===
async function startSwitcher() {
  if (isSwitcherOpen) return;

  console.log("起動シグナル検知！");
  
  try {
    // background.js にデータを要求
    const response = await chrome.runtime.sendMessage({ action: "getGroups" });
    
    // エラーチェック
    if (chrome.runtime.lastError) {
      alert("エラー: background.js と通信できませんでした。\n拡張機能の管理画面でエラーが出ていないか確認してください。");
      return;
    }

    if (response && response.groups && response.groups.length > 0) {
      console.log("グループ取得成功:", response.groups);
      isSwitcherOpen = true;
      groups = response.groups;
      selectedIndex = 0;
      showOverlay();
    } else {
      alert("タブグループが見つかりません。\nChromeでタブグループを作成してから試してください。");
    }
  } catch (e) {
    alert("予期せぬエラー: " + e.message);
  }
}

// === 1. キーボード監視 (Option + Q) ===
document.addEventListener("keydown", (e) => {
  // デバッグ: 何のキーが押されたかコンソールに出す
  console.log(`Key: ${e.key}, Code: ${e.code}, Alt: ${e.altKey}`);

  // e.code を使うことで、日本語キーボードや特殊入力の影響を受けにくくする
  if (e.altKey && e.code === "KeyQ") {
    e.preventDefault();
    e.stopPropagation(); // 他のショートカットを止める
    
    if (!isSwitcherOpen) {
      startSwitcher();
    } else {
      // 既に開いていたら選択を移動
      selectedIndex = (selectedIndex + 1) % groups.length;
      updateSelection();
    }
  }
}, true);

// === 2. キー離脱監視 (決定処理) ===
document.addEventListener("keyup", (e) => {
  if (e.key === "Alt" && isSwitcherOpen) {
    const selectedGroup = groups[selectedIndex];
    if (selectedGroup) {
      chrome.runtime.sendMessage({ action: "switchToGroup", groupId: selectedGroup.id });
    }
    closeOverlay();
  }
}, true);


// === UI表示関数 ===
function showOverlay() {
  if (overlayElement) document.body.removeChild(overlayElement);
  
  overlayElement = document.createElement("div");
  // 確実に最前面に出るように強力なスタイルを適用
  overlayElement.style.cssText = `
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    background: rgba(0, 0, 0, 0.9) !important;
    padding: 20px !important;
    border-radius: 10px !important;
    z-index: 2147483647 !important;
    display: flex !important;
    flex-direction: row !important;
    gap: 15px !important;
    color: white !important;
    font-family: sans-serif !important;
    box-shadow: 0 0 20px rgba(0,0,0,0.5) !important;
  `;

  groups.forEach((group, index) => {
    const card = document.createElement("div");
    card.id = `ts-card-${index}`;
    card.innerText = group.title || "無題";
    card.style.cssText = `
      padding: 10px 20px;
      background: #333;
      border: 1px solid #555;
      border-radius: 5px;
      min-width: 80px;
      text-align: center;
    `;
    overlayElement.appendChild(card);
  });
  document.body.appendChild(overlayElement);
  updateSelection();
}

function updateSelection() {
  if (!overlayElement) return;
  groups.forEach((_, index) => {
    const card = document.getElementById(`ts-card-${index}`);
    if (index === selectedIndex) {
      card.style.background = "#666";
      card.style.borderColor = "white";
    } else {
      card.style.background = "#333";
      card.style.borderColor = "#555";
    }
  });
}

function closeOverlay() {
  isSwitcherOpen = false;
  if (overlayElement) {
    document.body.removeChild(overlayElement);
    overlayElement = null;
  }
}