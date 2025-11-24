chrome.commands.onCommand.addListener(async (command) => {
  // 変更点1: { currentWindow: true } を削除しました。
  // これで、裏にあるウィンドウも含めた「全ウィンドウの全タブ」を取得します。
  const tabs = await chrome.tabs.query({});

  const activeTab = tabs.find(tab => tab.active && tab.selected); 
  // ※補足: 全ウィンドウ取得時は、activeなタブが複数（各ウィンドウに1つ）あるため、
  // 現在ユーザーが操作している「本当のアクティブ」を特定するために
  // lastFocusedWindow: true を使って再取得するのが厳密には正解ですが、
  // 今回は簡易的に「現在のウィンドウのタブ」からスタートするロジックを維持するか、
  // あるいは「最後に触ったタブ」を探す処理が必要です。
  
  // ★もっと確実に動く版に修正します
  // まず「現在ユーザーが見ているウィンドウ」の情報を取得
  const [currentTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!currentTab) return;

  // 全タブのリストを取得
  const allTabs = await chrome.tabs.query({});
  //グループのIDを取得（グループに所属しない-1を除外）
  const groupIds = [
    ...new Set(allTabs.map(tab => tab.groupId))
  ].filter(groupId => groupId !== -1);

  const currentIndex = groupIds.indexOf(currentTab.groupId);
  
  let nextIndex;
  const length = groupIds.length;

  if (command === "next-group") {
    nextIndex = (currentIndex + 1) % length;
  } else if (command === "prev-group") {
    nextIndex = (currentIndex - 1 + length) % length;
  } else {
    return;
  }

  const targetGroupId = groupIds[nextIndex];
  const targetTab = allTabs.find(tab => tab.groupId === targetGroupId);

  if (targetTab) {
    // 1. タブをアクティブにする
    await chrome.tabs.update(targetTab.id, { active: true });
    
    // 変更点2: そのタブがある「ウィンドウ」を最前面に持ってくる
    // targetTab.windowId に、そのタブが所属するウィンドウのIDが入っています
    await chrome.windows.update(targetTab.windowId, { focused: true });
  }
});
//testcoments
