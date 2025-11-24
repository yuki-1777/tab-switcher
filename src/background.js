// content.js からのメッセージ（依頼）を待ち受ける「窓口」
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  // 1. 「グループのリストをください」と言われたら
  if (request.action === "getGroups") {
    // 非同期処理の結果を返すため、return true が必要
    getGroupList().then(groups => sendResponse({ groups }));
    return true; 
  }

  // 2. 「このグループに移動して」と言われたら
  if (request.action === "switchToGroup") {
    activateGroup(request.groupId);
  }
});

// グループ一覧を作成して返す関数
async function getGroupList() {
  // 全ウィンドウのタブを取得
  const allTabs = await chrome.tabs.query({});
  
  // グループIDのリストを作成（重複なし、グループなし(-1)は除外）
  const groupIds = [
    ...new Set(allTabs.map(tab => tab.groupId))
  ].filter(groupId => groupId !== -1);
  
  // IDだけじゃなく、表示用の「タイトル」や「色」も取得してまとめる
  const groupsInfo = [];
  for (const id of groupIds) {
    try {
      const group = await chrome.tabGroups.get(id);
      groupsInfo.push({
        id: group.id,
        title: group.title || "（無題のグループ）", // タイトルがない場合の表示
        color: group.color
      });
    } catch (e) {
      // グループが見つからない等のエラーは無視
    }
  }
  return groupsInfo;
}

// 指定されたグループへ移動する関数
async function activateGroup(groupId) {
  const allTabs = await chrome.tabs.query({});
  
  // そのグループに属する「最初のタブ」を見つける
  const targetTab = allTabs.find(tab => tab.groupId === groupId);

  if (targetTab) {
    // 1. タブをアクティブにする
    await chrome.tabs.update(targetTab.id, { active: true });
    
    // 2. そのウィンドウを最前面に持ってくる（ウィンドウ跨ぎ対応）
    await chrome.windows.update(targetTab.windowId, { focused: true });
  }
}