# 依音樂喜好推薦文章：可行方式

2026-10-03 使用者詢問能否根據個人喜好，包含 YouTube 線索，推薦想讀的文章。以下為可行性與建議，尚未實作帳號連動、讀者追蹤或資料收集。

先做讀者自己選音樂人、作品及主題，搭配主動收藏／「想看更多」；推薦既有文章並解釋匹配原因。偏好可先只存在目前瀏覽器，提供清除與關閉，也保留完整日期列表。不要只憑點開就斷定喜歡，更不從音樂偏好推論敏感個人屬性。推薦可保留少量陌生作品，避免永遠只看同一位歌手。

第二階段可讓讀者貼自己選的公開 YouTube 歌單，再選擇要採用哪些音樂人；第三階段才考慮 Google OAuth。使用者授權與明確同意後，YouTube Data API 能取回按讚影片、訂閱與可存取歌單，以作品和音樂人對應文章。非音樂影片應讓讀者排除，不能把頻道訂閱直接當成每支作品都喜歡。

YouTube Data API **無法取得觀看紀錄與稍後觀看內容**；Google 登入本身也不等於授權本站讀取 YouTube 資料。不能承諾直接讀取 YouTube 的完整偏好模型。正式整合需建立本站 Google Cloud / OAuth 設定、確認來源網址與授權範圍，依實際 scopes／發布狀態辦理必要驗證，並提供告知、撤回與刪除。密鑰、權杖、個人偏好不得寫進公開 `site/` 或 Git。採用 Google 建議的授權碼流程時，需私人授權後端交換與管理權杖；跨裝置保存與背景同步也需另行設計。第一階段的本機偏好推薦不需要改 GitHub Pages 發布架構。

查閱 2026-10-03 官方文件：

- [Videos: list](https://developers.google.com/youtube/v3/docs/videos/list)：`myRating=like` 需授權，可取得按讚影片。
- [Subscriptions: list](https://developers.google.com/youtube/v3/docs/subscriptions/list)：`mine=true` 需授權，可取得目前授權使用者的訂閱。
- [PlaylistItems: list](https://developers.google.com/youtube/v3/docs/playlistItems/list)：可讀可存取歌單；明載 `watchHistoryNotAccessible`、`watchLaterNotAccessible`。
- [Google Identity Services：Use Code Model](https://developers.google.com/identity/oauth2/web/guides/use-code-model)：Google 建議的授權碼流程與私人後端處理。
