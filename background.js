chrome.commands.onCommand.addListener(async (command) => {
  // 1. 情報を集める
  const tabs = await chrome.tabs.query({ currentWindow: true });

  // 2. 現在開いている（アクティブな）タブを見つける
  const activeTab = tabs.find(tab => tab.active);
  if (!activeTab) return; // 念のため、アクティブなタブがなければ何もしない

  // 3. 存在する「グループID」のリストを作る（重複なしで）
  // tabs.map でIDだけ抜き出し、new Set で重複を削除し、[...] で配列に戻す
  const groupIds = [...new Set(tabs.map(tab => tab.groupId))];

  // 4. 現在のグループが、リストの何番目にあるか調べる
  const currentIndex = groupIds.indexOf(activeTab.groupId);

  // 5. 次（または前）の番号を計算する（ループするように）
  let nextIndex;
  const length = groupIds.length;

  if (command === "next-group") {
    // % (あまりの計算) を使うと、最後から最初に戻る計算ができる
    nextIndex = (currentIndex + 1) % length;
  } else if (command === "prev-group") {
    // 前に戻る計算（負の数にならないように length を足してから割る）
    nextIndex = (currentIndex - 1 + length) % length;
  } else {
    return; // 知らないコマンドなら何もしない
  }

  // 6. 計算した番号のグループIDを取得
  const targetGroupId = groupIds[nextIndex];

  // 7. そのグループに所属する「最初のタブ」を見つける
  const targetTab = tabs.find(tab => tab.groupId === targetGroupId);

  // 8. そのタブをアクティブにする（クリックする動作）
  if (targetTab) {
    await chrome.tabs.update(targetTab.id, { active: true });
  }
});