# 每日文章與自動發布

使用者於 2026-10-03 將配額從一篇提高為 **每天五篇，台北時間 09:00 開始自動發布**，自 2026-10-04 起生效。10 月 3 日已發布文章不重複新增。維持原儲存庫 `Alecliu/walk-into-the-sound`、`main` 與 GitHub Pages。

## 實際時程

- 05:00：讀取 GitHub 最新 main，逐篇查來源、撰稿，使用 humanizer-zh，另一次校閱重新打開來源。五篇各自完成與保存；不通過的欄位保留錯誤，其餘繼續。
- 09:00：重新計算當日已發表篇數，將通過校閱的稿件合併建置，執行測試、推送 main；當日最多五篇。
- 09:15、09:30：補查缺額，只續跑缺少／失敗欄位；已發表稿件不重複新增。已滿五篇只核對部署。
- GitHub Actions 成功、正式 HTML 與資料快照雜湊均相符後，才記錄 published。

每日五個欄位由 `scripts/daily_plan.py` 指定：兩篇新歌／近 60 天作品、一篇電影／動畫／影集／遊戲的音樂、一篇 MV／製作幕後／現場等輪替題材、一篇有溫度的歌曲人物故事。不限音樂場景，不設每日地域配額；日韓與製作人偶爾穿插，不建立國家分類。技術 slot ID 保留舊名稱以相容續跑，實際方向以 assignment.focus/topic 為準。新歌必須保留實際發行日與來源；沒有當期可比較數據時，不宣稱流量上升。華人政治、兩岸關係及台灣本土政治議題不選，華語音樂仍可收錄。

09:00 是啟動發布的時間，建置與 GitHub Pages 部署需要數分鐘，不承諾 09:00:00 已能看到。五篇各有最多 25 分鐘撰稿與 20 分鐘校閱時間，故備稿提前至 05:00，依序執行。電腦須開機、登入、連網且保持 Asia/Taipei 系統時區；五篇消耗的模型額度會高於一篇。caffeinate 僅避免工作中的閒置睡眠，不設定全機喚醒；睡眠／離線會延後。登入或喚醒補跑後若已過 09:00，備稿完成會接續發布，不必等隔天。跨日稿件不沿用日期發布。資料或授權不足不湊篇數，已查核的部分可先上線，詳情記在私有 receipt。

## 檔案

- `scripts/daily-blog.py`：備稿、校閱、內容合併、建置、推送、驗證。
- `scripts/daily_plan.py`：五篇配額、生效日、選題、新歌日期、跨稿去重與續跑選擇。
- `scripts/blog_validation.py`：文章、日期、來源、重複稿、照片、發布成品檢查。
- `scripts/editorial_policy.py`：攔截明確政治議題關鍵字，配合校閱者內容判讀。
- `scripts/story_photos.py`：Commons 授權查核、下載、圖片雜湊與發布時複核；不接受任意圖片網址。
- `scripts/build-site.py`：呼叫已安裝的 Data 外掛，不另換建置工具。
- `editorial/daily-writer.txt`、`daily-reviewer.txt`：撰稿與校閱規則。
- `editorial/daily-*.schema.json`：結構化輸出格式。
- `editorial/daily/YYYY-MM-DD-<slot>.json`：每篇可公開的來源查閱摘要與校閱結果；舊單篇紀錄保留。

私有草稿位於 `drafts/YYYY-MM-DD/slots/<slot>/`，每篇有 ready、candidate、review、photos/ 及執行日誌。撰稿者只指定 photoRequests 的 Commons 檔名；固定程式取得照片與 CC0／CC BY／CC BY-SA 授權，校閱者實際看圖並查來源，再填 checkedPhotoIds。發布只複製已查核的相同位元組，授權原始資料留在 `src/content/assets/story-photos/verified-photos.json`，網站圖說保留署名與連結。每個列出地點至少有一張照片，城市背景需明確標示。若下載受限或查核不過，該篇保持缺額。

`dailyKey` 使用 `YYYY-MM-DD:<slot>`；保留舊 `YYYY-MM-DD` 格式可讀性。ready 必須符合目前 policyVersion，舊政策下的草稿要重新校閱。五篇一起建置，每篇仍獨立校閱。重跑時以最新 main 判斷既有篇數、作品及欄位，不因前次推送後驗證失敗而再加同一篇。

機器路徑、GitHub／Codex 憑證、完整模型執行日誌都不加入儲存庫。排程執行檔由安裝器複製到同目錄下的 `runtime/`，工作目錄亦在 Application Support，避免 macOS 背景工作讀取 Documents 被拒；不更改全磁碟存取權限。程式更新後重跑安裝器以更新 runtime。設定與日誌在使用者的 `~/Library/Application Support/WalkIntoTheSound/`；憑證仍由原本的 GitHub CLI／Codex 登入管理。

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
# 使用現有已校閱稿驗證建置與測試，不啟動研究、不提交／推送
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

自動檢查包括日期、來源閱讀記錄、重新校閱、舊文章網址、每日去重、資料與成品一致、HTML／JSON 雜湊、現有 Node/Python 測試、對應 SHA 的 Actions 結果、正式站 HTTP 成品及圖片可取得性與大小。每日只新增資料，不改 React/CSS。這些檢查不等於每天用瀏覽器人工試完所有互動；版型或程式變動仍需桌面／手機瀏覽器驗證。

工作規則按 [OpenAI 官方 codex exec 文件](https://developers.openai.com/codex/noninteractive/) 使用非互動、唯讀模型執行及 JSON schema。模型只輸出稿件或校閱結果，推送由固定程式在檢查通過後執行。
