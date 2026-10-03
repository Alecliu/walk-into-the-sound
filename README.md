# 走到那首歌 · Walk into the sound

一個愛聽歌、也愛查資料的音樂部落格。從訪談、唱片與現場紀錄整理故事，也寫值得繼續追蹤的新作品和音樂人。

[正式網站](https://alecliu.github.io/walk-into-the-sound/)

## 閱讀與更新

- 文章依日期排列，同一頁用主題標籤篩選，不必逐個進入專欄。
- 城市、街區、地點連動；每篇保留出處、時間線與聆聽連結。
- 原有二十篇與文章網址保留；今日掃描、潛力雷達收在音樂探索選單。
- 自 2026-10-04 起，每天台北時間 09:00 開始自動發布五篇；保留兩篇新歌，其餘輪替熟悉的影視／動畫／遊戲、歌曲人物、MV 與製作幕後。各地音樂人多元選題，不設每日地區配額，排除華人政治、兩岸關係與台灣本土政治題材。這台 Mac 於 05:00 開始逐篇備稿、照片查核及校閱，發布後核對 Actions 與正式成品。需要開機、登入、網路及有效授權；不合格稿件不為湊數發布。詳見 [每日發布](editorial/DAILY-PUBLISH.md)。
- 文章按愛心會打開三篇推薦；「偏好與收藏」可選主題、音樂人、關閉推薦或清除資料。只讀寫此站自有的瀏覽器儲存鍵，不讀取觀看歷史、不上傳收藏；尚未連接 YouTube 帳號。
- 21 篇既有文章都有地點照片；新增 18 張 Commons 授權照片，圖說區分確切地點與城市背景，保留來源與完整署名。授權索引見 [照片授權](src/content/assets/story-photos/LICENSES.md)。

## 開發

先閱讀 [AGENTS.md](AGENTS.md)、[接手與操作手冊](HANDOVER.md) 及 [編輯方式](editorial/EDITORIAL.md)。可編輯介面在 `src/content/`；文章與來源在 `src/data.json`。使用已安裝的 Data 外掛建置，不要手改壓縮成品。

```sh
# 內容完成並設 buildStatus=complete 後，建置及更新完整發布成品
python3 scripts/build-site.py --publish
npm test
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/verify-site.py

# 本機預覽
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

GitHub Actions 發布的是完整 **`site/`**。修改原始碼後必須重新建置、檢查、更新包含 `assets/` 的完整 site，再提交並推送 `main`。正式網址的結果與 Actions 成功都需確認。

後續環境及操作方式更新於 `HANDOVER.md`；編輯與驗證紀錄保留在 `editorial/`。照片、字型及元件授權完整保留，照片紀錄見 `src/content/assets/story-photos/LICENSES.md`。密碼、憑證、排程本機設定與私有日誌不進 Git。
