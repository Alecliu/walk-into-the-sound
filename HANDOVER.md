# 走到那首歌｜開發與內容接手

接手日期：2026-10-03。後續環境、內容流程與部署資訊集中更新於本專案；本文件記錄操作方式，`editorial/` 記錄每次內容及驗證結果。修改前先閱讀 [AGENTS.md](AGENTS.md) 與 [README.md](README.md)。

本次實測結果：[Intel 電腦接手驗證紀錄](editorial/HANDOVER-2026-10-03.md)。

## 專案與接手基準

- 儲存庫：[Alecliu/walk-into-the-sound](https://github.com/Alecliu/walk-into-the-sound)，主要分支 `main`。
- 正式網站：[走到那首歌](https://alecliu.github.io/walk-into-the-sound/)。
- GitHub 基準：`e334466052363ce40b4e690ede0f4e3053671519`，`Import verified story website and source`，2026-10-02。
- 發布流程：[.github/workflows/pages.yml](.github/workflows/pages.yml)。推送 `main` 或手動觸發後，Actions 檢查並發布 **`site/`**；它不會代為編譯 `src/`。
- 首次接手只處理環境；2026-10-03 使用者接著授權改為部落格、調整文風、每天 09:00 自動發布。新規格見 [編輯方式](editorial/EDITORIAL.md) 與 [每日發布](editorial/DAILY-PUBLISH.md)。繼續使用這個儲存庫，不要修改 `daily-music-scan`。

工作前先確認本機狀態，再同步遠端：

```sh
git status --short --branch
git diff
git diff --cached
git remote -v
git fetch origin
git log --oneline --left-right HEAD...origin/main
```

工作目錄乾淨、目前位於 `main` 且可以快轉時，才執行 `git pull --ff-only origin main`。若有未提交檔案，先檢查並備份、提交或妥善保留，勿使用 `reset --hard`、`clean -fd` 或強制推送來解決分歧。

## Intel Mac 工具

接手時實測為 macOS 12.1、`x86_64`。可執行的工具是 Git 2.32.1、Node 24.18.0（`process.arch` 為 `x64`）、npm 11.16.0、Python 3.8.9，以及已安裝的 Data 外掛 1.0.11。

另已安裝官方 GitHub CLI 2.102.0 的 `macOS_amd64` 版本，執行檔在 `$HOME/.local/bin/gh`，已確認可在這台 Intel Mac 執行。2026-10-03 已由使用者完成 `Alecliu` 帳號登入，執行 `gh auth setup-git`，並確認本儲存庫的 `push` 權限為 `true`。憑證保存在系統鑰匙圈，Git 使用 HTTPS 與 GitHub CLI credential helper。提交使用 Alecliu 的 GitHub noreply 身分；排程提交名稱為 Walk into the sound。Git 身分僅設定在本儲存庫或單次命令，不改其他專案。

Node 是同時包含 Intel 與 ARM 的 universal 執行檔，本機實際以 Intel 架構執行。沒有複製原電腦的 Node、`node_modules` 或 Apple Silicon 專用工具。

一般內容建置使用 Data 外掛內附的已驗證 runtime 與編譯器，不需要 `npm install`、Homebrew、Vite 開發伺服器或專案 `node_modules`。JavaScript 模型測試使用 Node 內建測試器，Python 測試只需標準函式庫。

可重新確認版本：

```sh
uname -m
sw_vers
node -p 'JSON.stringify({executable:process.execPath,arch:process.arch,version:process.version})'
python3 --version
git --version
```

### 建置方式的重要差異

本專案的 `package.json` 保留了 Vite 原始 runtime 建置入口，但 **不要將 `npm run build` 當成一般內容建置指令**。接手基準缺少保護清單中的 `.openai/hosting.json`，所以直接執行 `node scripts/verify-protected-runtime.mjs` 會失敗；其餘保護檔案的雜湊與清單一致。

`AGENTS.md` 指定的一般建置是下方的 installed-plugin 流程，已在 Intel 本機成功執行。不要為了修復另一條建置路徑而偽造 hosting 設定、更新完整性清單、跳過檢查，或改用另一套網站。將來若確實需要 `--source` 建置，須先查明缺失檔案的正式來源，依 `AGENTS.md` 處理必要的保護檔案變更，並另外安裝相容依賴。

## 建置與預覽

以下指令都從專案根目錄執行。以目前使用者的安裝位置解析外掛，不使用原電腦的絕對路徑：

```sh
WIS_NODE="$(node -p 'process.execPath')"
WIS_DATA_PLUGIN="${CODEX_HOME:-$HOME/.codex}/plugins/cache/openai-curated-remote/data-analytics/1.0.11"
test -f "$WIS_DATA_PLUGIN/scripts/data-app.mjs"

"$WIS_NODE" "$WIS_DATA_PLUGIN/scripts/data-app.mjs" prepare --project-dir "$PWD"
python3 scripts/build-site.py --node "$WIS_NODE" --plugin "$WIS_DATA_PLUGIN"
```

若外掛版本或位置改變，先在 Codex 已安裝的 Data 外掛目錄找到 `scripts/data-app.mjs`，更新 `WIS_DATA_PLUGIN`，再跑 `prepare`。找不到時先恢復官方 Data 外掛，勿自行重寫建置流程。`prepare` 回傳的 `documentation.entryPoint` 是該 runtime 的元件文件入口。

建置成功會生成 `dist/index.html`、`dist/snapshot.<sha256>.json`、`dist/data-app-build.json` 及 `dist/assets/`；必須保留整組檔案。包裝命令依舊呼叫上述官方 build --separate-data，再將 `web-assets.json` 所列的原圖逐檔校驗、複製成內容雜湊檔名，不修改生成的 HTML。一般發布用的建置移除程序環境中的工作階段 ID，避免帶入本機 Codex 工作階段標記；沒有手改 HTML。

啟動本機預覽：

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

開啟 <http://127.0.0.1:4173/>。終端機要保持開啟，結束時按 `Ctrl+C`。若 4173 已被其他工作使用，改用空閒連接埠，不要終止別人的服務。重建後重新整理同一個頁籤；這是靜態成品預覽，沒有熱更新。

只想查看 GitHub 目前提交的發布版本時，可將上面的 `--directory dist` 改為 `--directory site`。不要直接以 `file://` 開啟，資料 sidecar 需要 HTTP 載入。

## 修改與編輯原則

- 網站大標題「走到那首歌」，副標「Walk into the sound」。首頁避免重複品牌名稱。
- 音樂故事是主軸，從地點或物件開始，可寫歌手、樂手、團體、製作人、電影、影集、歌詞及音樂背後的故事。今日掃描、潛力雷達保留為附屬內容。
- 接手時二十篇、四個專欄各五篇；現在改為同一份按日期排列的文章列表，以 `topics` 標籤篩選。既有二十篇與網址完整保留，新增「新歌觀察」「音樂人筆記」。檢查允許文章持續增加，仍要求舊網址保留、來源、照片授權、完整成品雜湊與原始資料一致。
- 介面與文稿使用繁體中文，具體、有溫度，故事脈絡清楚；避免空泛抒情、制式 AI 語氣。更新文章時使用已安裝的 `humanizer-zh`，入口為 `${CODEX_HOME:-$HOME/.codex}/skills/humanizer-zh/SKILL.md`，先核對事實，再潤飾文字。若換機缺少技能，先確認可信來源與授權。
- 訪談、報章雜誌、可靠部落格、Wikipedia 或官方紀錄須留下可點擊出處與查閱日期。不捏造對話、事件細節或人物心理；無法閱讀的來源不當作已查證。
- 以城市、街區、地點呈現，不使用國家分類。音樂平台標籤顯示平台名稱。
- 城市、街區、打卡點須連動。改變上層條件時清除不相容的下層選項，不能留下沒有故事的地點組合。
- 照片須有可確認的免費使用授權，保留作者、原始來源與授權。現有資訊在 [照片授權紀錄](src/content/assets/story-photos/LICENSES.md)；免費觀看不等於允許轉載。
- YouTube 直接連結須有確認紀錄；搜尋連結清楚標示「YouTube 搜尋」。

文章與音樂資料在 `src/data.json`；介面在 `src/content/`，照片在 `src/content/assets/story-photos/`。遵守 `AGENTS.md` 的可編輯範圍。不要手改 `site/index.html` 或其他壓縮成品；原始碼與資料變更後重新建置。

## 檢查與準備發布成品

現有測試：

```sh
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/verify-site.py
```

`verify-site.py` 檢查的是 `site/`，不是新建置的 `dist/`。它驗證完整 HTML 與快照雜湊、manifest、原始資料與成品完全相符、完成狀態、二十個原始網址、文章來源與照片授權欄位，不能取代瀏覽器驗證。

每次修改後先重建、預覽 `dist/`，至少檢查：首頁名稱及副標、主題標籤、文章列表與文章直接網址／重新載入、城市及下層篩選／清除篩選、照片載入及授權、文章出處、聆聽連結與搜尋標示；確認桌面與窄畫面沒有橫向溢出或 JavaScript 錯誤。

確認新成品可用後，再把完整 `dist/` 放進 `site/`。先檢查 `git diff -- site`，若有他人尚未提交的發布成品，先保留再處理。以下指令將舊 `site/` 備份到系統暫存目錄，避免把備份一起複製進發布目錄：

```sh
# 先完成前面的 build、測試與瀏覽器檢查；確認本機 site/ 沒有待保留的修改。
WIS_BACKUP="$(mktemp -d "${TMPDIR:-/tmp}/walk-into-the-sound-site.XXXXXX")"
cp -R site "$WIS_BACKUP/site"
echo "$WIS_BACKUP"
rsync -a --delete dist/ site/
touch site/.nojekyll
python3 scripts/verify-site.py
git diff --check
git status --short
git diff --stat
```

`rsync --delete` 會移除舊快照，確保發布目錄只有本次完整成品；不要只複製 `index.html` 或只更新 `src/`。備份存於終端機顯示的 `$WIS_BACKUP`，不納入 Git。遇到檢查失敗就先修正，不推送。

## GitHub 授權與發布

預覽、建置與既有測試不用登入。要推送儲存庫、操作 Actions 或確認帳號寫入權限，需登入有此儲存庫權限的 GitHub 帳號。

GitHub CLI 可使用 [官方 macOS Intel 預編譯版本](https://github.com/cli/cli/releases)，下載項目為 `macOS_amd64`，安裝前核對官方 SHA-256；不要使用 `arm64`。本機工具放在使用者目錄，登入憑證不放在專案中。

```sh
"$HOME/.local/bin/gh" auth login --hostname github.com --git-protocol https --web
"$HOME/.local/bin/gh" auth setup-git
"$HOME/.local/bin/gh" auth status
"$HOME/.local/bin/gh" api repos/Alecliu/walk-into-the-sound --jq '.permissions.push'
```

登入由使用者完成，不把密碼、一次性代碼或 token 貼進聊天或寫進儲存庫。提交前確認 `git config user.name`、`git config user.email`，使用本人同意的身分；不要替使用者猜姓名或郵件。

如果尚未設定，從專案根目錄執行以下指令，將引號中的內容換成本人要使用的 GitHub 顯示名稱與提交郵件（也可使用 GitHub 提供的 noreply 郵件）：

```sh
git config --local user.name "你的提交名稱"
git config --local user.email "你的 GitHub 提交郵件"
```

這些設定寫入本機 `.git/config`，不納入網站或版本控制。

正式更新順序：修改原始碼與資料 → 建置 → 模型測試與瀏覽器檢查 → 完整更新 `site/` → `verify-site.py` → 審閱 diff → 明確選取要提交的檔案 → commit → `git push origin main`。

只加入本次變更與完整 `site/`，不要直接 `git add .`。不得提交密碼、憑證、私人檔案、本機設定、外掛快取、`node_modules`、暫存檔或備份。

推送後確認本次 commit 對應的 Actions：

```sh
WIS_HEAD="$(git rev-parse HEAD)"
"$HOME/.local/bin/gh" run list --repo Alecliu/walk-into-the-sound \
  --workflow pages.yml --branch main --commit "$WIS_HEAD" --limit 5
# 將上一步確認的數字代入：
"$HOME/.local/bin/gh" run watch <run-id> --repo Alecliu/walk-into-the-sound --exit-status
```

成功後開啟 [正式網址](https://alecliu.github.io/walk-into-the-sound/)，檢查實際更新內容、文章、照片、篩選器與資料是否載入。不能只看到舊的成功紀錄就宣稱本次發布成功；如 CDN 尚未更新，等待並確認本次成品的 HTML／快照雜湊。

網站內建的 `Publish` 是原 Data runtime 的功能，不是這個專案的 GitHub Pages 發布入口。繼續使用既有 Actions 流程。

## 日常快捷指令

```sh
# 先把 src/data.json 的 buildStatus 設為 complete，僅在內容完成後執行
python3 scripts/build-site.py --publish
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/verify-site.py
git diff --check
```

`build-site.py` 呼叫同一個已安裝的 Data 外掛，檢查完整成品，先備份舊 site，再整組更新。它不會提交或推送。直接呼叫官方 compiler 後，仍需由這個包裝命令補齊及驗證靜態圖片。正式發布仍需檢查 diff 後提交 `main`、推送 GitHub，確認 Actions 與正式網址。

每日排程在獨立工作目錄新增文章，不會自行 pull 或改動這個開發目錄。開始下一次人工修改前，先檢查 `git status`，乾淨時以 `git pull --ff-only origin main` 取回排程新文章，避免以舊資料發布。
