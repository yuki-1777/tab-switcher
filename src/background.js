// 最近アクティブになったグループIDを保存する履歴リスト（先頭が最新）
let recentGroupIds = [];

// 1. タブがアクティブになったら、そのグループを履歴の先頭に持ってくる
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.groupId !== -1) {
      updateRecentGroups(tab.groupId);
    }
  } catch (e) {
    // タブが閉じられた直後などはエラーになることがあるので無視
  }
});

// 2. ウィンドウがフォーカスされた時も、そのタブのグループを先頭にする
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (tab && tab.groupId !== -1) {
      updateRecentGroups(tab.groupId);
    }
  } catch (e) {}
});

// 履歴リストを更新する関数
function updateRecentGroups(groupId) {
  // 一旦リストから削除して、先頭に追加（重複排除）
  recentGroupIds = recentGroupIds.filter(id => id !== groupId);
  recentGroupIds.unshift(groupId);
}


// --- content.js からのメッセージ処理 ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === "getGroups") {
    getSortedGroupList().then(groups => sendResponse({ groups }));
    return true; 
  }

  if (request.action === "switchToGroup") {
    activateGroup(request.groupId);
  }
});

// 並び替え済みのグループ一覧を作成する関数
async function getSortedGroupList() {
  const allTabs = await chrome.tabs.query({});
  
  // 現在存在する全グループIDを取得
  const currentGroupIds = [...new Set(allTabs.map(tab => tab.groupId))].filter(id => id !== -1);
  
  // 1. 履歴にあるグループを順番に並べる
  let sortedIds = recentGroupIds.filter(id => currentGroupIds.includes(id));
  
  // 2. 履歴にない（新しく作ったばかりの）グループを後ろに追加
  const unrecordedIds = currentGroupIds.filter(id => !recentGroupIds.includes(id));
  sortedIds = [...sortedIds, ...unrecordedIds];

  // グループの詳細情報を取得
  const groupsInfo = [];
  for (const id of sortedIds) {
    try {
      const group = await chrome.tabGroups.get(id);
      groupsInfo.push({
        id: group.id,
        title: group.title || "（無題）",
        color: group.color
      });
    } catch (e) {}
  }
  return groupsInfo;
}

// 指定されたグループへ移動する関数（変更なし）
async function activateGroup(groupId) {
  const allTabs = await chrome.tabs.query({});
  const targetTab = allTabs.find(tab => tab.groupId === groupId);

  if (targetTab) {
    await chrome.tabs.update(targetTab.id, { active: true });
    await chrome.windows.update(targetTab.windowId, { focused: true });
    
    // 移動した事実を履歴に反映（念のため）
    updateRecentGroups(groupId);
  }
}