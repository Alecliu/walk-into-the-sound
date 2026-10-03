import React from 'react';
import { CityStories } from './CityStories.jsx';
import './blog.css';

export function StoryHome({ stories, storyId, onOpen, initialLens = '' }) {
  return <div className="wis-blog">
    {!storyId && <header className="wis-blog-masthead"><span className="wis-eyebrow">一個愛聽歌、也愛查資料的音樂部落格</span><h1>走到那首歌</h1><p className="wis-subtitle">Walk into the sound</p><p className="wis-blog-intro">一首歌怎麼寫出來？錄音時發生了什麼？<br/>從訪談、唱片和現場紀錄找答案，也記下值得繼續聽的新作品。</p></header>}
    <CityStories stories={stories} storyId={storyId} onOpen={onOpen} initialLens={initialLens}/>
  </div>;
}

export function AboutStories({ onBrowse }) {
  return <section className="wis-about"><span className="wis-eyebrow">ABOUT THE BLOG</span><h1>關於這裡</h1><p className="wis-about-lead">喜歡一首歌，就想多知道一點。</p><p>誰寫的、在哪裡錄的，某一段編曲又是怎麼決定的？這個部落格記錄查資料時找到的故事，也整理新歌和還想繼續追蹤的音樂人。</p><p>文章放在同一份列表，用標籤找主題。電影配樂、歌詞裡的地點、錄音室故事、新歌觀察，都可以從這裡開始讀。</p><h2>資料怎麼查</h2><p>優先閱讀創作者訪談、官方作品資料與現場紀錄，再對照報刊、可靠部落格或 Wikipedia。每篇都附上出處；資料有矛盾就說明，不替人物補對話或心情。聆聽建議與資料事實會分清楚。</p><p>榜單提供選題線索，排名上升不等於一定會走紅。文章會交代平台、榜單與日期，並回到作品、演出或創作者的說法。照片附作者、來源和授權；未確認的歌曲網址標示為 YouTube 搜尋。</p><button className="ms-primary" onClick={() => onBrowse('')}>閱讀文章 →</button></section>;
}
