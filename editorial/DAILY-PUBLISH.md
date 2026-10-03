# 每日文章與自動發布

使用者於 2026-10-03 確認：**台北時間每天 09:00 自動發布一篇**。維持原儲存庫 `Alecliu/walk-into-the-sound`、`main` 與 GitHub Pages，不另建網站。

## 實際時程

- 08:00：在獨立工作目錄讀取 GitHub 最新 main，以已登入的 Codex 查來源、撰稿，使用 humanizer-zh 校閱。另一次校閱執行重新打開來源；不通過便停止。
- 09:00：確認當天尚無文章，驗證稿件、重建完整成品、執行測試、推送 main。
- 09:15、09:30：再檢查未完成發布；已存在文章只核對部署，不重複新增。
- GitHub Actions 成功、正式 HTML 與資料快照雜湊均相符後，才記錄 published。

09:00 是啟動發布的時間，建置與 GitHub Pages 部署需要數分鐘，不承諾 09:00:00 已能看到。電腦須開機、登入、連網且保持 Asia/Taipei 系統時區。執行時 caffeinate 避免閒置睡眠，不設定全機喚醒或能源選項；睡眠／離線會延後。登入時會補檢查，若當天缺稿先備稿，完成檢查後才發布。資料或授權不足不湊篇數，詳情記在私有 receipt。

## 檔案

- `scripts/daily-blog.py`：備稿、校閱、內容合併、建置、推送、驗證。
- `scripts/blog_validation.py`：文章、日期、來源、重複稿、照片、發布成品檢查。
- `scripts/build-site.py`：呼叫已安裝的 Data 外掛，不另換建置工具。
- `editorial/daily-writer.txt`、`daily-reviewer.txt`：撰稿與校閱規則。
- `editorial/daily-*.schema.json`：結構化輸出格式。
- `editorial/daily/YYYY-MM-DD.json`：可公開的來源查閱摘要與校閱結果。

機器路徑、GitHub／Codex 憑證、完整模型執行日誌都不加入儲存庫。設定與日誌在使用者的 `~/Library/Application Support/WalkIntoTheSound/`；憑證仍由原本的 GitHub CLI／Codex 登入管理。

## 安裝與查看

先確認本機 `codex login status` 與 `gh auth status` 有效，Data 外掛與 humanizer-zh 已安裝。安裝器會檢查工具及本儲存庫推送權限。

```sh
python3 scripts/install-daily-blog.py --install
python3 scripts/daily-blog.py status
launchctl print "gui/$(id -u)/com.walkintothesound.prepare"
launchctl print "gui/$(id -u)/com.walkintothesound.publish"
```

不帶 `--install` 只建立私人設定、檢查授權，不載入工作。排程使用目前已登入的 Codex 方案，會消耗一般模型使用額度；額度、登入或來源故障都可能使當天停止。若換機或外掛版本變更，先更新安裝器對應的正式工具位置，再重跑自我檢查，不能複製憑證。

```sh
# 手動備稿；不推送
python3 scripts/daily-blog.py prepare
# 驗證建置與測試步驟，不提交／推送新文章
python3 scripts/daily-blog.py publish --dry-run
# 09:00 後手動補一次；仍有同日去重與全部檢查
python3 scripts/daily-blog.py publish
```

每日工作使用私人 Git mirror 與暫存 worktree，推送不用 force。不改開發目錄、不覆蓋未提交工作；遠端競爭造成推送失敗會留下記錄。失敗 worktree 保留供排查，成功後移除。每次人工開發前先查看本機修改，再安全同步 main。

如需停用：

```sh
launchctl bootout "gui/$(id -u)/com.walkintothesound.prepare"
launchctl bootout "gui/$(id -u)/com.walkintothesound.publish"
```

## 驗證範圍

自動檢查包括日期、來源閱讀記錄、重新校閱、舊文章網址、每日去重、資料與成品一致、HTML／JSON 雜湊、現有 Node/Python 測試、對應 SHA 的 Actions 結果、正式站 HTTP 成品。每日只新增資料，不改 React/CSS。這些檢查不等於每天用瀏覽器人工試完所有互動；版型或程式變動仍需桌面／手機瀏覽器驗證。

工作規則按 [OpenAI 官方 codex exec 文件](https://developers.openai.com/codex/noninteractive/) 使用非互動、唯讀模型執行及 JSON schema。模型只輸出稿件或校閱結果，推送由固定程式在檢查通過後執行。
