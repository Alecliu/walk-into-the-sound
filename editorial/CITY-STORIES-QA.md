# 城市專欄驗證｜2026-09-30

- 已完成 installed-runtime separate-data build，保護檔案驗證通過，buildStatus 為 complete。
- JavaScript 測試 25 項、Python 測試 7 項全部通過；既有 1,400 筆榜單資料通過驗證。
- 瀏覽器實際檢查桌面列表與 390px 手機文章，文章頁寬 390px、文件捲動寬 390px，沒有頁面橫向溢出。
- 已驗證城市篩選、Abbey Road 地點搜尋、無結果狀態、清除篩選、文章直接網址與重新載入。
- 已逐頁檢查 today/radar/china/weekly/archive/cross/explore/themes/saved/sources/cities 的閱讀主畫面，未出現國家或國籍相關標籤；韓國流行樂於閱讀介面使用 K-pop。
- 原始查核資料、封存週報及來源網址保留原始識別，不修改其證據。來源檢視器的原始資料不是去識別化匯出。
- 瀏覽器未記錄 JavaScript errors。
- 本次完成本機預覽，未提交、推送或更新線上 GitHub Pages。

## 2026-10-01｜定名與標籤

主選單、首頁與專欄已使用「走到那某歌」，副標為「一座城市，一段音樂的故事。」結構化標籤分城市、街區、打卡點，可由列表及文章點選。瀏覽器已確認 Mathew Street 篩選、文章 Cavern Club 標籤返回列表、清除篩選與 Larry 人物搜尋。26 項 JavaScript 測試通過，包含別名、多關鍵字、標籤交集與個人音樂人資料。原網址保留；本機更新，未發布。

## 2026-10-02 · Walk Into the Sound

- Installed-runtime separate-data build passed, 35 modules / 15 assets, complete status.
- 27 model tests passed, including cascading places and searching works/objects without an artist.
- Browser: default URL opens story homepage; saved shared title is Walk Into the Sound.
- Desktop 1440px and mobile 390px inspected; homepage and film article have no horizontal overflow, photos load.
- Category path filters to Penny Lane; records/objects filter shows 2 stories; story navigation resets to all 5.
- Liverpool narrows neighborhoods to Penny Lane / Mathew Street; Penny Lane narrows place to Penny Lane street and shows 1 story.
- Featured article and photo attribution render; today's scan and radar remain accessible, radar displays its existing signals.
- Browser console check found no errors. Temporary viewport reset. Local preview only; no publication or Git push.


## 2026-10-02 · Twenty-story edition

- Build: installed prebuilt runtime verification passed; 35 authored modules, 15 assets; buildStatus complete.
- Existing automated suite: 27/27 passed.
- Dataset: 20 unique article routes; each of the four columns has five full articles and at least two sources.
- Cascading tags: all 359 reachable states across all stories and each column retain a nonempty result.
- Browser, desktop 1440px: 20-story collection, five-story category, city London > St Martin’s Lane > London Coliseum, one resulting Björk story; search Falling Slowly opens Once story.
- Listening: Once article exposes the verified official YouTube URL; Björk fallback explicitly labelled YouTube search. Four direct official links have checked provenance and dates.
- Mobile 390px: homepage and article visually checked; all 20 cards present, no clipped location text or horizontal page overflow.
- Homepage rendered title and subtitle each occur once. Shared title changed through the supported editor to 音樂故事選集.
- Browser error log empty. No public deployment performed.
