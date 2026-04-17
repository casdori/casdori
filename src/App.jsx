import { useState, useEffect } from "react";

// ══════════════════════════════════════════════════════════════
// Firebase設定
// ══════════════════════════════════════════════════════════════
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, push, onValue, off, remove, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDcePGEoUQgjV2St4o2s85wmvB_YKYEcQw",
  authDomain: "casdori-4cdd6.firebaseapp.com",
  databaseURL: "https://casdori-4cdd6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "casdori-4cdd6",
  storageBucket: "casdori-4cdd6.firebasestorage.app",
  messagingSenderId: "268483174849",
  appId: "1:268483174849:web:393c680b811ea1a84fcf40",
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// ══════════════════════════════════════════════════════════════
// DB層 - Firebase Realtime Database
// ══════════════════════════════════════════════════════════════
const DB = {
  // 店舗設定を読み込む
  loadShopSettings: async (shopId) => {
    try {
      const snap = await get(ref(database, `shops/${shopId}/settings`));
      return snap.exists() ? snap.val() : null;
    } catch { return null; }
  },
  // 店舗設定を保存
  saveShopSettings: async (shopId, settings) => {
    try {
      await set(ref(database, `shops/${shopId}/settings`), settings);
    } catch(e) { console.error(e); }
  },
  // 日次レポート保存
  saveDailyReport: async (shopId, report) => {
    try {
      await set(ref(database, `shops/${shopId}/reports/${report.date}`), report);
    } catch(e) { console.error(e); }
  },
  // レポート一覧取得
  getReportIndex: async (shopId) => {
    try {
      const snap = await get(ref(database, `shops/${shopId}/reports`));
      if (!snap.exists()) return [];
      return Object.keys(snap.val()).sort().reverse();
    } catch { return []; }
  },
  // レポート取得
  loadDailyReport: async (shopId, date) => {
    try {
      const snap = await get(ref(database, `shops/${shopId}/reports/${date}`));
      return snap.exists() ? snap.val() : null;
    } catch { return null; }
  },
  // 店舗一覧取得
  loadShops: async () => {
    try {
      const snap = await get(ref(database, `shopRegistry`));
      if (!snap.exists()) return [];
      return Object.values(snap.val());
    } catch { return []; }
  },
  // 店舗を登録
  saveShop: async (shop) => {
    try {
      await set(ref(database, `shopRegistry/${shop.shopId}`), shop);
    } catch(e) { console.error(e); }
  },
  // 注文バッチをFirebaseに保存（リアルタイム同期用）
  addBatch: async (shopId, batch) => {
    try {
      await set(ref(database, `shops/${shopId}/batches/${batch.batchId}`), batch);
    } catch(e) { console.error(e); }
  },
  updateBatchStatus: async (shopId, batchId, status) => {
    try {
      await update(ref(database, `shops/${shopId}/batches/${batchId}`), { status });
    } catch(e) { console.error(e); }
  },
  addService: async (shopId, svc) => {
    try {
      await set(ref(database, `shops/${shopId}/services/${svc.id}`), svc);
    } catch(e) { console.error(e); }
  },
  updateServiceStatus: async (shopId, svcId, status) => {
    try {
      await update(ref(database, `shops/${shopId}/services/${svcId}`), { status });
    } catch(e) { console.error(e); }
  },
  resetTable: async (shopId, tableId) => {
    try {
      const [bSnap, sSnap] = await Promise.all([
        get(ref(database, `shops/${shopId}/batches`)),
        get(ref(database, `shops/${shopId}/services`)),
      ]);
      const updates = {};
      if (bSnap.exists()) {
        Object.entries(bSnap.val()).forEach(([k,v]) => {
          if (String(v.tableId) === String(tableId)) updates[`shops/${shopId}/batches/${k}`] = null;
        });
      }
      if (sSnap.exists()) {
        Object.entries(sSnap.val()).forEach(([k,v]) => {
          if (String(v.tableId) === String(tableId)) updates[`shops/${shopId}/services/${k}`] = null;
        });
      }
      if (Object.keys(updates).length > 0) await update(ref(database), updates);
    } catch(e) { console.error(e); }
  },
  // リアルタイム購読
  subscribeShopData: (shopId, callback) => {
    const bRef = ref(database, `shops/${shopId}/batches`);
    const sRef = ref(database, `shops/${shopId}/services`);
    let batches = [];
    let services = [];
    const notify = () => callback({ batches: [...batches], services: [...services] });
    const bHandler = (snap) => {
      batches = snap.exists() ? Object.values(snap.val()) : [];
      batches.sort((a,b) => b.time > a.time ? 1 : -1);
      notify();
    };
    const sHandler = (snap) => {
      services = snap.exists() ? Object.values(snap.val()) : [];
      services.sort((a,b) => b.time > a.time ? 1 : -1);
      notify();
    };
    onValue(bRef, bHandler);
    onValue(sRef, sHandler);
    return () => { off(bRef, 'value', bHandler); off(sRef, 'value', sHandler); };
  },
};

// ── デフォルト店舗設定 ──
function defaultShopSettings(shopId, shopName) {
  return {
    shopId,
    shopName,
    pin: "0000",
    adminPin: "9999",
    tables: [
      { id:1, label:"1番" }, { id:2, label:"2番" }, { id:3, label:"3番" },
      { id:4, label:"4番" }, { id:5, label:"5番" }, { id:6, label:"6番" },
      { id:"vipA", label:"VIP(A)" }, { id:"vipB", label:"VIP(B)" },
    ],
    castList: ["あゆ","ここあ","すずか","さよこ","しおり","なつ","まほ","ひなた","ゆり","マーリー","なな"],
    baseLiquors: [
      { id:"jogo",name:"じょうご",emoji:"🥃" }, { id:"sato",name:"里の曙",emoji:"🍶" },
      { id:"rento",name:"れんと",emoji:"🍶" }, { id:"kuro",name:"黒伊佐錦",emoji:"🍶" },
      { id:"whisky",name:"ウイスキー",emoji:"🥃" }, { id:"marrika",name:"茉莉花",emoji:"🌸" },
    ],
    castDrinksSingle: [
      { id:"highball",name:"ハイボール",price:1000,emoji:"🥃" },
      { id:"lemon_sour",name:"レモンサワー",price:1000,emoji:"🍋" },
      { id:"beer",name:"ビール",price:1000,emoji:"🍺" },
      { id:"orange",name:"オレンジジュース",price:1000,emoji:"🍊" },
      { id:"cola",name:"コーラ",price:1000,emoji:"🥤" },
      { id:"coffee",name:"コーヒー",price:1000,emoji:"☕" },
      { id:"tequila_shot",name:"テキーラ（ショット）",price:2000,emoji:"🥃",special:true },
      { id:"habu_shot",name:"ハブ酒（ショット）",price:2000,emoji:"🐍",special:true },
      { id:"champagne_g",name:"シャンパングラス",price:2000,emoji:"🍾",special:true },
      { id:"wine_g",name:"グラスワイン",price:2000,emoji:"🍷",special:true },
      { id:"habu_kanransha",name:"ハブ酒観覧車",price:27000,emoji:"🎡",special:true },
      { id:"tequila_kanransha",name:"テキーラ観覧車",price:25000,emoji:"🎡",special:true },
    ],
  };
}


// ══════════════════════════════════════════════════════════════

// マスターデータ
// ══════════════════════════════════════════════════════════════
const CAST_LIST = ["あゆ","ここあ","すずか","さよこ","しおり","なつ","まほ","ひなた","ゆり","マーリー","なな"];

const TABLES = [
  { id: 1,      label: "1番"    },
  { id: 2,      label: "2番"    },
  { id: 3,      label: "3番"    },
  { id: 4,      label: "4番"    },
  { id: 5,      label: "5番"    },
  { id: 6,      label: "6番"    },
  { id: "vipA", label: "VIP(A)" },
  { id: "vipB", label: "VIP(B)" },
];

// ── ベース酒（選択後に割り方を選ぶ） ──
const BASE_LIQUORS = [
  { id: "jogo",    name: "じょうご",  emoji: "🥃" },
  { id: "sato",    name: "里の曙",    emoji: "🍶" },
  { id: "rento",   name: "れんと",    emoji: "🍶" },
  { id: "kuro",    name: "黒伊佐錦",  emoji: "🍶" },
  { id: "whisky",  name: "ウイスキー",emoji: "🥃" },
  { id: "marrika", name: "茉莉花",    emoji: "🌸" },
];

// ── 割り方 ──
const SPLIT_TYPES = [
  { id: "mizu",    name: "水割り",    emoji: "💧" },
  { id: "soda",    name: "ソーダ割り",emoji: "🫧" },
  { id: "oyu",     name: "お湯割り",  emoji: "♨️" },
  { id: "rock",    name: "ロック",    emoji: "🧊" },
  { id: "ryoku",   name: "緑茶割り",  emoji: "🍵" },
  { id: "sanpin",  name: "さんぴん割り",emoji:"🫖" },
  { id: "oolong",  name: "ウーロン割り",emoji:"🍵" },
  { id: "muto",    name: "無糖紅茶割り",emoji:"🍵" },
];

// ── その他キャストドリンク（1タップ選択）──
const CAST_DRINKS_SINGLE = [
  { id: "highball",     name: "ハイボール",           price: 1000, emoji: "🥃" },
  { id: "lemon_sour",   name: "レモンサワー",         price: 1000, emoji: "🍋" },
  { id: "beer",         name: "ビール",               price: 1000, emoji: "🍺" },
  { id: "orange",       name: "オレンジジュース",     price: 1000, emoji: "🍊" },
  { id: "cola",         name: "コーラ",               price: 1000, emoji: "🥤" },
  { id: "coffee",       name: "コーヒー",             price: 1000, emoji: "☕" },
  // ── ショット 2,000円 ──
  { id: "tequila_shot", name: "テキーラ（ショット）", price: 2000, emoji: "🥃", special: true },
  { id: "habu_shot",    name: "ハブ酒（ショット）",   price: 2000, emoji: "🐍", special: true },
  { id: "champagne_g",  name: "シャンパングラス",     price: 2000, emoji: "🍾", special: true },
  { id: "wine_g",       name: "グラスワイン",         price: 2000, emoji: "🍷", special: true },
  // ── 観覧車 ──
  { id: "habu_kanransha",   name: "ハブ酒観覧車",   price: 27000, emoji: "🎡", special: true },
  { id: "tequila_kanransha",name: "テキーラ観覧車", price: 25000, emoji: "🎡", special: true },
];

// 後方互換用
const CAST_DRINKS = CAST_DRINKS_SINGLE;

// ── ゲストドリンク（飲み放題・集計不要）──
// ゲストベース酒（キャストと同じ割り方選択）
const GUEST_BASE_LIQUORS = [
  { id: "g_jogo",    name: "じょうご",  emoji: "🥃" },
  { id: "g_rento",   name: "れんと",    emoji: "🍶" },
  { id: "g_sato",    name: "里の曙",    emoji: "🍶" },
  { id: "g_marrika", name: "茉莉花",    emoji: "🌸" },
  { id: "g_kuro",    name: "黒伊佐錦",  emoji: "🍶" },
];

const GUEST_DRINKS_SINGLE = [
  { id: "g_beer",   name: "ビール",         emoji: "🍺" },
  { id: "g_lemon",  name: "レモンサワー",   emoji: "🍋" },
  { id: "g_high",   name: "ハイボール",     emoji: "🥃" },
  { id: "g_cola",   name: "コーラ",         emoji: "🥤" },
  { id: "g_orange", name: "オレンジジュース",emoji: "🍊" },
  { id: "g_coffee", name: "コーヒー",       emoji: "☕" },
];

const GUEST_DRINKS_PITCHER = [
  { id: "g_p_ryoku",  name: "緑茶ピッチャー",     emoji: "🍵" },
  { id: "g_p_oolong", name: "ウーロンピッチャー", emoji: "🍵" },
  { id: "g_p_sanpin", name: "さんぴん茶ピッチャー",emoji: "🫖" },
  { id: "g_p_muto",   name: "無糖紅茶ピッチャー", emoji: "🍵" },
  { id: "g_p_orange", name: "オレンジピッチャー", emoji: "🍊" },
  { id: "g_p_cola",   name: "コーラピッチャー",   emoji: "🥤" },
];

const SERVICES = [
  { id: "ice",      name: "アイス（氷）", emoji: "🧊" },
  { id: "ashtray",  name: "灰皿",        emoji: "🪣" },
  { id: "oshibori", name: "おしぼり",    emoji: "🧻" },
  { id: "gomi",     name: "ゴミ回収",    emoji: "🗑️" },
];

// ══════════════════════════════════════════════════════════════
// ユーティリティ
// ══════════════════════════════════════════════════════════════
function uid() { return Math.random().toString(36).slice(2, 9); }
function nowShort() {
  return new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

// ══════════════════════════════════════════════════════════════

// グローバルストア
// batches: 一回の「まとめて送信」 = 1バッチ
// services: サービスは個別
// ══════════════════════════════════════════════════════════════
const Store = (() => {
  let batches  = [];   // [{ batchId, tableId, tableLabel, time, status:"pending"|"done", items:[...] }]
  let services = [];   // [{ id, tableId, tableLabel, ...svc, time, status }]
  let listeners = [];

  function notify() {
    const snapshot = { batches: [...batches], services: [...services] };
    listeners.forEach(fn => fn(snapshot));
  }

  return {
    subscribe: (fn) => {
      listeners.push(fn);
      fn({ batches: [...batches], services: [...services] });
      return () => { listeners = listeners.filter(l => l !== fn); };
    },
    // ドリンクをまとめてバッチ追加
    addBatch: (tableId, tableLabel, items) => {
      const batch = { batchId: uid(), tableId, tableLabel, time: nowShort(), status: "pending", items };
      batches = [batch, ...batches];
      notify();
    },
    // バッチを提供済みに
    doneBatch: (batchId) => {
      batches = batches.map(b => b.batchId === batchId ? { ...b, status: "done" } : b);
      notify();
    },
    // サービス追加
    addService: (tableId, tableLabel, svc) => {
      services = [{ id: uid(), tableId, tableLabel, ...svc, time: nowShort(), status: "pending" }, ...services];
      notify();
    },
    // サービス対応済み
    doneService: (id) => {
      services = services.map(s => s.id === id ? { ...s, status: "done" } : s);
      notify();
    },
    // テーブルリセット
    resetTable: (tableId) => {
      batches  = batches.filter(b  => String(b.tableId)  !== String(tableId));
      services = services.filter(s => String(s.tableId) !== String(tableId));
      notify();
    },
  };
})();

// ══════════════════════════════════════════════════════════════
// カラー
// ══════════════════════════════════════════════════════════════

const C = {
  bg:          "#08050f",
  bgCard:      "rgba(255,255,255,0.04)",
  gold:        "#e8b84b",
  goldDim:     "rgba(232,184,75,0.15)",
  goldBorder:  "rgba(232,184,75,0.35)",
  pink:        "#f06dab",
  pinkDim:     "rgba(240,109,171,0.15)",
  pinkBorder:  "rgba(240,109,171,0.4)",
  red:         "#f05050",
  redDim:      "rgba(240,80,80,0.15)",
  green:       "#3ecf8e",
  greenDim:    "rgba(62,207,142,0.14)",
  purple:      "#9b59f5",
  purpleDim:   "rgba(155,89,245,0.14)",
  purpleBorder:"rgba(155,89,245,0.4)",
  teal:        "#4ecdc4",
  tealDim:     "rgba(78,205,196,0.14)",
  tealBorder:  "rgba(78,205,196,0.4)",
  text:        "#ede8f8",
  textDim:     "#7a6a8a",
  border:      "rgba(255,255,255,0.08)",
};

// ══════════════════════════════════════════════════════════════

// ── UI共通スタイル ──
const inputStyle = {
  width:"100%", padding:"14px 16px", borderRadius:14, fontSize:15, boxSizing:"border-box",
  border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)",
  color:"#ede8f8", outline:"none",
};
function btnStyle(color) {
  return {
    padding:"14px", borderRadius:14, border:"none", cursor:"pointer",
    background:color, color: color===C.gold ? "#0a0618" : "#fff",
    fontSize:15, fontWeight:800,
  };
}

// ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen]   = useState("login");  // login | landing | cast | admin | settings | report
  const [session, setSession] = useState(null);     // { shopId, settings, role }

  function handleLogin(sess) {
    setSession(sess);
    setScreen("landing");
  }

  function handleSaveSettings(newSettings) {
    setSession(prev => ({ ...prev, settings: newSettings }));
  }

  // 設定からマスターデータを動的解決
  const shopSettings = session?.settings;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif", color:C.text }}>
      <BgAura />
      {screen === "login"    && <LoginScreen onLogin={handleLogin} />}
      {screen === "settings" && session && (
        <SettingsPanel settings={shopSettings} shopId={session.shopId} onSave={handleSaveSettings} onExit={()=>setScreen("landing")} />
      )}
      {screen === "report"   && session && (
        <DailyReportPanel shopId={session.shopId} onExit={()=>setScreen("admin")} />
      )}
      {screen === "landing"  && session && (
        <Landing onSelect={setScreen} session={session} onLogout={()=>{setSession(null);setScreen("login");}} />
      )}
      {screen === "cast"     && session && (
        <CastTerminal onExit={()=>setScreen("landing")} settings={shopSettings} />
      )}
      {screen === "admin"    && session && (
        <AdminPanel onExit={()=>setScreen("landing")} onSettings={()=>setScreen("settings")} onReport={()=>setScreen("report")} settings={shopSettings} shopId={session.shopId} />
      )}
    </div>
  );
}


function BgAura() {
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(155,89,245,0.1) 0%,transparent 70%)", top:-250, left:-200 }} />
      <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(232,184,75,0.07) 0%,transparent 70%)", bottom:-150, right:-100 }} />
      <div style={{ position:"absolute", width:350, height:350, borderRadius:"50%", background:"radial-gradient(circle,rgba(240,109,171,0.07) 0%,transparent 70%)", top:"35%", right:"5%" }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════

// SPARROWロゴ（実画像埋め込み）
// ══════════════════════════════════════════════════════════════
const LOGO_SRC = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAkACQAAD/4QECRXhpZgAATU0AKgAAAAgABwEOAAIAAAALAAAAYgESAAMAAAABAAEAAAEaAAUAAAABAAAAbgEbAAUAAAABAAAAdgEoAAMAAAABAAIAAAEyAAIAAAAUAAAAfodpAAQAAAABAAAAkgAAAABTY3JlZW5zaG90AAAAAACQAAAAAQAAAJAAAAABMjAyNjowNDoxMSAxNjo0OToyNgAABZADAAIAAAAUAAAA1JKGAAcAAAASAAAA6KABAAMAAAAB//8AAKACAAQAAAABAAAFCqADAAQAAAABAAADgwAAAAAyMDI2OjA0OjExIDE2OjQ5OjI2AEFTQ0lJAAAAU2NyZWVuc2hvdP/tAG5QaG90b3Nob3AgMy4wADhCSU0EBAAAAAAANhwBWgADGyVHHAIAAAIAAhwCeAAKU2NyZWVuc2hvdBwCPAAGMTY0OTI2HAI3AAgyMDI2MDQxMThCSU0EJQAAAAAAEEgpjC56dZerDgghvY7FrGf/4gIoSUNDX1BST0ZJTEUAAQEAAAIYYXBwbAQAAABtbnRyUkdCIFhZWiAH5gABAAEAAAAAAABhY3NwQVBQTAAAAABBUFBMAAAAAAAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLWFwcGwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApkZXNjAAAA/AAAADBjcHJ0AAABLAAAAFB3dHB0AAABfAAAABRyWFlaAAABkAAAABRnWFlaAAABpAAAABRiWFlaAAABuAAAABRyVFJDAAABzAAAACBjaGFkAAAB7AAAACxiVFJDAAABzAAAACBnVFJDAAABzAAAACBtbHVjAAAAAAAAAAEAAAAMZW5VUwAAABQAAAAcAEQAaQBzAHAAbABhAHkAIABQADNtbHVjAAAAAAAAAAEAAAAMZW5VUwAAADQAAAAcAEMAbwBwAHkAcgBpAGcAaAB0ACAAQQBwAHAAbABlACAASQBuAGMALgAsACAAMgAwADIAMlhZWiAAAAAAAAD21QABAAAAANMsWFlaIAAAAAAAAIPfAAA9v////7tYWVogAAAAAAAASr8AALE3AAAKuVhZWiAAAAAAAAAoOAAAEQsAAMi5cGFyYQAAAAAAAwAAAAJmZgAA8qcAAA1ZAAAT0AAACltzZjMyAAAAAAABDEIAAAXe///zJgAAB5MAAP2Q///7ov///aMAAAPcAADAbv/AABEIA4MFCgMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJCgv/xAC1EAACAQMDAgQDBQUEBAAAAX0BAgMABBEFEiExQQYTUWEHInEUMoGRoQgjQrHBFVLR8CQzYnKCCQoWFxgZGiUmJygpKjQ1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4eLj5OXm5+jp6vHy8/T19vf4+fr/xAAfAQADAQEBAQEBAQEBAAAAAAAAAQIDBAUGBwgJCgv/xAC1EQACAQIEBAMEBwUEBAABAncAAQIDEQQFITEGEkFRB2FxEyIygQgUQpGhscEJIzNS8BVictEKFiQ04SXxFxgZGiYnKCkqNTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqCg4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2dri4+Tl5ufo6ery8/T19vf4+fr/2wBDAAICAgICAgMCAgMFAwMDBQYFBQUFBggGBgYGBggKCAgICAgICgoKCgoKCgoMDAwMDAwODg4ODg8PDw8PDw8PDw//2wBDAQIDAwQEBAcEBAcQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/3QAEAFH/2gAMAwEAAhEDEQA/AP38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9D9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//R/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/0v38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9P9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//U/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/1f38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9b9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//X/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACimtTaAJKKjooAkoqOnjpQAtFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFIc9qMH1qW9QFooooTAKKKKoAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/0P38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiimtQA6imZNGTQA+iiigAooooAKTApaQnFABgUYFRbn3e1S5FABgUvSiigAooooAKKKQnFAC0UzJoyaAH0UUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFMyaMmgB9FIDmloAbnHWlzxxTHpq1duoEuRRzUa5zT8nPPSp2AUnFLUUkioMsQMUwS8DHOaS12AsUU0HsadQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH//0f38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiikJxQAtFJuFG4UALRUYlFP3CgBaa1KTimswoASim7xjOKTep6VWoDtwo3CoQ2TiguBUt23KSZNvHrRvHrWLPrOn224TSqpXqCQP61nXXi/w9aJvnvoVHu6/41jKtTW7NPZSfQ6aZ2GMUiynvXlt98YvBGnf6++Rs+jKf61zV1+0H8PLfJa8P4EGsHiqV/iRfsZ9j3wuCpAquEmr5qk/ae+HEcmBcyZq5D+0z8P5ThblvyFT9bo/zB7GfY+jVWTvmpA2Bg9a8Fi/aF8CzDi6/PbXV6d8WPB+pRo8d7HlvV1H9a1jiaTe4exn2PUN49aN49a5mPxTosyB47uJwf7rqf5GtG21G1u8mFwwHPBGP61qqkHszJ05Loau8e9G/NV/NXGetOSQN2rTmRLTJ6KKKYmh46UtIOlLQIKKKKACikJxRuFAADmlqNWp4OaAFooooAKKKKACiiigAooooAKKKTIobAWiiikmAUhOKWmMwpgOBzS0xWFO3CgBaQ9KNwpjOAKaQCA5paatOPHWk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T/vkVyyymO3Mbxxllax+D0vw08cxZL6dIMeiN/hVY+APGZ/5h0n/AHy3+FfvK2mWDqUe3jIbr8gqD+wdF/59Yv8AvkVzvJl/MV9d8j8If+EB8Zf9A+T/AL4b/ClX4f8AjVzxpkhHrsb/AAr93P7A0T/n0i/75FKNF04DC20YH+4KFk0esiXjfI/C2P4XeOp+mnsPwP8AhWhB8GPiPL/x7WPT1BH9K/cX+x7P/nhH/wB8j/Cpo9OtIs/uU5/2R/hWqyen3IeLfY/Fmy/Z8+KF0R/ocYz6t/8AWrrLL9ln4nXUixy20IV+vz1+wS20S9I1GPYU/wAtf7tarKKXch4ryPy0sf2M/F0vN8Y41P8AdkWuy0b9hzR3G7VNTuUPcKQf61+jQTHQY+lG0Dp/St1lUFsyPbyPjfRv2PvAmlFC11PPt7OAc/rXrOg/BDwJoQBTS4JSp6tGMn6+9e3lT3FG3/ZrqWXwXUPbyOVsvCPh63/49dPig9kQCugisLSAbEQADtVxQecDFO479a7YUIRVjlc29hmzbgKMAU4pmng80/J9K1VJdCLshWNVqPGG+UYq1k+lMx7VagS7sjpygDkCpsCiheYyqzMOlCu27BqxgelGB6VpdF3Q6iiioICm7jTqKXKAg6UtFFMAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/1/38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKTAPalooAiGe9AWpaQDFKWoFeSJZMFqgktw6FDypq+VB61E0ZCHBrmdNN6jufKHxv8AgdpvjLT5LjSLZUvQpyQOWPqa/KnxN4T1XwpqU1neRkBHI5z2r99vKLIUlwQfavmH46/BjRfFunNe2lvm8XHKjqB2wK+czDAJK6PRpV7H5D5yNw7800rgA10Pizw7feFNauNKvIHjEJwNw5rm8SAeYR8vFfn1WjJPU+hpTUxzMF5PeognmOGoC7/mbofSrCfJ93pUp8iOmcFax6V8NPiHf/DvX4Ly1b5Cyh+cZUHOK/Yz4d/ETTPG+iW2oWkgMsqAuo7Ma/CaTkF8cr096+kP2ffjBqPg7W4rG8l/0KZvmU8fqa+iy/GvmSbPnsRRuz9k05OR71PXJ6Hr9trNlDcWUyyiRAcqe55x9a6gEkZr9HjNTimmePJNbklGM0whyeKmHShECbTRtNOorouO4zYKNgp9FFwuM8setJ5Z9akoouFxgTHegqe1PoqGmIiKnHQU3avoKnowKmzHchwlOyBUmBTdopWYg/CkGDS7FpQAOlFmA0JijaafRTSYEWw0vln1qSitbjuR7T7U7aadRSER4xSHPapcZpNooAaOtPpu2nUAFFFFACDPeloooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//0P38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKTAKQ57UtFMApCMgig57U3B60eYETDA5NUJo95w43Ae1X5ELjjtTlQ7cYpSipKzKTsfH/wC0B8E7TxhYTanpdkq32CxZRyxNfltrOj3Gg30ul3ilDGSpz61+/M8AkjMUmGRuxr4Y/aJ+AyahpsviPRYQbkMMhRyR1J4FfGZhgn/y7Vz1sNXUd2fmhsMZI/h7Upx2q5qNje6VcmyvI2VlOOhxVNj5fYmvg6tOcZOMlY9mNZSegnIBBoglKsGiHlunQilUFwdvam5Aj2j73rRSlyO5tKHMj67+Avx+ufDGpR6Nr77rOTCKzE9Sa/U3QNdsda0+O+s5RLFIMg+1fz8JvQB0OHU5H+Nfa37PHx5l0a6g8OeIZT5OQiMTxjvkmvtstxkea03ZHhYmjpofqekhYcCpFPHNc5o2u6frFslzZPvDjIx3B710AcKOa+zg1PWOp5Eotbk1FM3rTtwrcgWiiik2AUUzeKUtimOw6kOe1AOaWgQUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf//R/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBoBxSjgUtFJgV3CZwayb2D7WDBKhaJl2kdsEYrYbbnpzUTqXG0HFck4tgfA3x+/Z4TUVbXPDaANkt5SDkmvzo1TTL7R7ySxvYykiHBU+or+gK7t4ZIfInTduGMkZxXxr8bP2eYvEkM2q6HCq3oy2OAG9fxr5XG4Jzm5HpUKvKrH5dRJ5YYseophxjA61t+JfDWreGtRayv4XiKnHzKQPwyBWJx/8Arr4vEYeVNnv06yYi9eOato7Ioe3JV19D1NV+R7VBO7gYj4PrXPQq2k7mjgpI+xPgf+0DfeGbiHTvEFxuhztDscYycAV+nGg+JdP8S6fDqWmyq8cwyCD1FfgTb3B2jcPmU5/GvpH4S/HfWvBF1Ha3ku+ybAIZs4A9BX2mDzNR908XEUHufsbGvy5p6SAHGK808DfEfQfGekRXml3Cs21dwJAOe/Ga9GhcOueD719vRrRqq547i1uXcn0oPPFNzxnil3elbkAVB7U1lp241ETmktNgvYlWl3CkWlHIprYBaKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiijIoAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/0v38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKW4BSYFLSE4osA0rVaRAxw4yMYqWRm7UxGLnkcUnTUlqWlbU+evi/wDBLQ/iBYyyCJUu8HY47N9BX5f+P/hH4k+H94UvbZ3txn98BhePrX7jOnY9K4bxh4G0fxbYm11KFXGMAEZFfOYrAKS0OqlWs9T8F7gMGwOKiWTjDV9t/GH9mTWNJ8zU/DcQltQcnsRnrgCvja+0y80qRre8hZCvXcCDXxGIwXstT36Na6MlJvmwFp5jadsscEfhTl2BdyD86ljI5LcZrzVBxdzscOZHongn4meIfAV1G+lzMseckZzkd+tfpp8Hv2gNC8W2cVrf3KwXRGNjnkmvyJXEjfNyBVuz1fUdGvornTJWiZSDlTivZw+ZOlaLZ5VXDn9Acd5HeR7oHyp9DVyPhMA5Nflp8K/2ptQ0HbY+KQDa7gPNyWbB/Kv0H8IfEjwv41sku9Euw4IBw2FbP0zX3GExbmeVOlY9JU8YNFVopN6K571OD37V7zV0cbiTICKeOBUaE8+1PBJpJaEjqKKKACiiigAooooAKKKKACiiigAooooAKKTmjmnYBaKKKQBRRRQAmT6UE4pNwpjk9hVWAQt65qMnsM5ppcnrUTypEpkkYKoGeeKGOxdXOBz0p3Qc1m215FO37pww9jmtLbUiHUUg4FLQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQB//T/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKMZoooAYUBHNAQCn0U7juMKk9aUgY6Zp1I3Sk1cRQuLSC5XZOocDoCM182/FX9n7w142Se7ht/Lu5M8jhc/QCvps9aieMhC45Jrhr4eE46o3p1HHqfiX42+CPirwjLKUtWlgVjh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9X8Wr5u4q3kuOmfpXVT9rUIq8kEj55+G/wAENf8AG0kcgt2gtickupAP0NfpR8Lfgd4d8BWStHD5lzJguz4Ygj03A4r1/RPD9holjHp9igSKL7oHGK3hGRjqPX3r6TDYaW7PJqVE9hBGoUKoAUDA46cYqdMIMKOPSmgdzUhX0r6OELI4Gxwz60zbzmn0UxDx0paQdKWgAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//V/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKYetPopNAN3GnUUUW6gRY4xSbfWpqKq42yn5Y/GlkGUO0VbwKTAqWkStDNEHmJ8wzXN6t4L0DVoGivbOOTdnJKgn9a7bAqBjxjFZSoRl0N1UaPlzxT+zb4Q1wfJCYSuceWMZz6188+I/wBj+9aKSXQ2BAORvkANfpNj/OaaVH8VeVVy2Ene5t7eWx+LOufs7+O9FaQm38xE/u5b8sV5Pqfg/wAUaSx+0abcAD/pk/8AhX77tDE52lFP4Vhal4V0nVIzFdW6MrdeBXkVcpj0ZusVJbn4FOtyuRPbSIR/eQj+dNM6bcZ2kevFftvqHwF+GOqNvvdJVyevP/1q8+1b9kz4S3jvJDpCozf7R/wrzpZSt1I6IYy+jR+Qhcu2AytjtmlCEg5AFfp3N+xj4SaZmsNlpkcZyaxbn9im2kkQW+rRKvf5D/hXDLL6sfhdzo+uLsfmqYzuwD+tXYomVd+cgV+h8/7EKsR5esxD/gB/wq7D+xRbxoRLrEb56jY3+FEcBWa1YPFq2iPzmLbumDVcybs7cNj0wa/SSH9j/RNPcvfX8SQqMnIOCK+avi34f+F3gkvpfhny574f6xkYkj88VzVcE6a1ka0a3Puj53VTsHPNRtvzwM1VSXd8+PvVci3Yz1zXjTk4vc72kkVyXPGaftbGTk1ND5cu8SHaRiug0Xw5r+u3Udjo9q88jN91Rk4relCVSxyTqo5csSRHGCXbgDHJr3b4ZfAvxd46uo54rfyrbqxkyv8AOvpn4T/svQrc2eseKrXEsZD+W4IKkda+8dC0HT9Et1tLGFY0UcYA4/QV9Zg8t1TbPMq1n0PIfhl8FtC8H2Cebbq82ANzKCfzxXvtvBHBGscS7VHoKPufIB0q2v3RxxX2NHDRgjzak292QlAenFABXoc1bwKMCvQVkrIwIgvHPNSEelLRRcCOipKKQCDgUtFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFAH//1v38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAEAIpaKKbYBRRRSAKKKKACiiigBOahbNT03aKAIO/SlPPWpCoFR1SHcjwT0p4X3NKqjNTjpUtCIggx0zUZUk46VZyAKrnjk5rF0rhexG4Kqcc5qvCSWIx0qdpARxxVaScWybyQKu1OMdTSPMywSudpwK5LxL4s0Xw1ayXmoziNIhluQT+Wa8h+J3xy0DwTbyiO6S4udpwiNyCR/jX5l/ED40eLPHl7LHdXB+zZOABjj6ivCxOY0YJpHXTpu6ue4/GX9pC81m5m0rwzOywEkFxlWr40vpZ9QvXv72QvK/Uk5zUaNLHKWPXnJNFxJEx8wrubv7V8NicU6ukT3YKMSbylKgquM9KdBFcXEwggTJJwMV6R4L+GfiXxdPALO3YxT8g7cgV94fCv9l3QdJEd/4ki8+4U7hjKj9RWOGy2pVeqOetXXQ+Tfhh+z9r/jR/PuYmitsgsx+U4PpkV+kvgD4L+G/BFrB9miEsyqCXdQGzXrGl6VYWECW1pEsccQwAAM/ia1xx0xivvMLlapx1R4062pXW2ywfpjtVraF6DmgP6UV70aUY6I5XNsZj5tzfpVkZxUNTjgVqSmLRRRQMKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//1/38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAIy2Dik3Ckb7xprfKu49KAH7hQXxVSOdZWKpyR19qmbAIDHGaAJdwqWqTy7MHrn0qVZyTjGKqwE4OaWohIB14pcrjOaTstwHg5pcio946YpeKnmXcB9FR7hQXFO67gSUU0MDSkgUALRUe4f5NO3ihtAITntTSM0hYmkz71N30AVRg5pxkweaY7YxVSWdEGXOMZP5VlKtGPxaFKLexOXFDTKo+Y4rz7xH8RvC3hm2N1qN5GpX+HeAeK+Gvid+11vmuLDwmrKy5VXYBlP0rz8Rj6MY/EdNOhKT2Pt7xX8RPDXhW0mudSu1jMasRjBOfpmvgL4m/tW6lrDHT/DChIQCvnKxDc9DivkfXvGninxVcvfaveM5kJyqkgY+lYYihYKsZKk8MT618niMbKekWenCgluaes69f63ePd6hM0sj9yc8HrWESYiJUGAOcVe0/w9q+r3Qt9Jhedm/uDNfVfw4/ZW8R+JjBca6Vgtyf3inKsVPoc8V46w06j2OxezS3PmfQ/D2s+I72O1srdj5nTAOK+1PhT+yrK9wNT8R5IYA+UwBHFfaHgL4S+HfBFnHa2VqjlQBucBjn6kV6tDarCgWIBcegxX0mFyxp3mrHlTrnH+GfA+geG7aGDTbKOExAAbRiuvNs5IYcAHtU6oUOc08BzwTX1tKnCitDz5SbBI1UYHXvUgQHilAApw4NbqTbMhgQ1JtFAzil5q2+wrEOOcVL/DTAQaf/DWcU7gkOooorQYUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFF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IPP2dnUGujg+A/gWIgjS4M/9cxXWsnqSJ+tI/FVPMPIQ077PdddhNfuHD8H/AATCNv8AZNuf+2Yq0PhR4IAwdHt/++BVyyeUENYtH4XtDd/3SKWKKRclxt+tfua3wl8FN/zB7f8A79iqNx8GfA14Rv0yBAvpGKhZVUewni4n4evIiA5b86pG4ilIhRss3GOnNft3L8APAEuQ1jHz6IKyLv8AZv8Ah/IhC2qLkdQgyPcc1p/ZVfcx+tQZ+MUUTQncEwR710Np4i1qy4t5HUDtk1+sD/su+AZlOGlGfYf41xOsfseeFrlibK5lT8h/WksFWQKtA+EdH+NXxB0QqLa8k2J0Fex6D+134zsWSPU0luFHq2P617Bc/sW6cYz9nvZtx9WFcff/ALF+qxKWt5y495BXRGjWiDqQe56D4f8A2ztAmwus2n2cjoxcc17t4e/aN+F/iJVUazBFKf4Nxr4P1H9kzxjECltGkg/2n/lXD3H7M/xM0yQzWsYQqc/I5Br06VeUFyyepyTUZPQ/YbTdf0fVIxNpc6zoe4NbCTQy9GGe+PavxnsdF+NvhO7jZZ7ny4jnaGfBHp0r1bwd+0V8SPDd21tr+myyoCRuEUjnH5V6McTcwaP1GLR5yWqyrLtyDxXyp4J/aE0jxBItvdxyQSHrvjZP/QsV9JWd6l7bxXMLZjkG5fcV6NOfMc7RtHnpSjPeo4zkVLW4gooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//S/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACkwKWigBu0UuBS0UAR7KPLGcmpKKBWGBAOlBX0x+VPooGRmNSPmGaiNrEeoqzRUuK7DTZXNtEeqio2soG6ov5Vcopezj2C7KQsLZeiAVItrEo+UYqzRS9nHsO7K5t48cDFKsCr0qeiqUIrZCuxu0YxSFM+1PoqhEYjwaQxL2qWik1fcBm0elJ5Y55qSihJARmMGkEKdxUtFVcBpUfSmmJT15qSiosh3K7Qxk4IpQigYqQ9aSnyrsFyBoUPOB+VR/Zoe6g/hVwDNGwVHsoDTZj3Gj6ddf66BD+A/wAKyD4P8O5J+xJls54H+FdfsFMK0lTgug+ZnlV58JPBF7cm6msiJDjlWx/Su/sNOttPtI7O1XbFEoVRWkVpyrWiSWyJbFTI6VKtIB6U+mIKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//9P9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAGkEmjaadRQAgGKWiigApCM0tFAEZU0oXFPooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP//U/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigBu4UbhTce1GPalcB24UbhTce1GPai4ElFNWnUIAooopgFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFJ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opPUdyoA5OcVMVbAFS0VPKhNkO00oU5qWiqJsFFFFAwooooAYwqAqT2q1RTTsBUkRioC9qbHERywzV3AowKhxTd2XzaWKpBPQVIqkLmpQMUtU+xmo63I4wRnNPHApaKBhRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/9P9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigBOaTaadRTuAUUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigBOaXAoop3AKKKKQBRRRQAUUUUAFFFFABRRRQAnNHNLRTuAUUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAqOpKTAoAZRT8CjAoAZSjg07AowKAFooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigApCCaWigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//1P38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAoopm45xSbsA4HNBOKZv9eKh805xiqSuNItUmRUIk61LuNJtLcGh1FIDmjINAhaKYXVTg0hf0pXHYeDmlpoIpScUxC0U3caNxoAdRTN4pN/oKEwJKKbupScUrgLRTA9BfFMB9FRCTPIp3mD0oAdkGlpoI60bqAHUUzeKQvtGTQOxJSZPpUSyZqTcKG0twsKSBQTioJJCrYAzTi/emwSJqKYWxSF/ShILElFNBzxTWfBwKTYiSiow+aeDmgBaKjL7etI0gAB9aV1ewEm4UtRq2eSMVJTAKKKQnFAC0VFuIo3mpbSAloquXIGSaUSj1xVJpiuTbhS1SNyA+1RmrJkwM02rDSJKKhEmRxzTTI3ORihajasWKKjD84pS2KLAkPpCcVF5hPSjcaOlyWyakyKrvK6dBmnBy3JGKSs9hk9Jk+lM30b8DNF0DQ8HNLUAkxTvM6+1D01Y7EtJk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ooAZsFGwU+incBNopNop1FIBNoo2ilooAbtNLtFLRQA3aKNop1FO4Ddpo2mnUUgE2imMoqSigCMD0p+D7UtFO4BRRRSAaQTRtNOop3Abto2mnUUgG7fSjaadRQA3aaNvrTqKAE2ijaKWigBu00bTTqKAG7aNop1FADdvpRt9adRQAwrmjbjpT6KAEAApaKKAEAIo2ilop3AbtNABFOoouAUUUUgCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/9P9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//U/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/1f38ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9b9/KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//X/fyiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q==";

// ══════════════════════════════════════════════════════════════
// ランディング
// ══════════════════════════════════════════════════════════════

// ログイン画面
// ══════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [shopCode, setShopCode] = useState("");
  const [pin, setPin]           = useState("");
  const [role, setRole]         = useState("cast"); // "cast" | "admin"
  const [error, setError]       = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState("");
  const [newPin, setNewPin]     = useState("");

  async function handleLogin() {
    setError("");
    setError("ログイン中...");
    try {
      const shops = await DB.loadShops();
      const shop = shops.find(s => s.shopId === shopCode.trim().toUpperCase());
      if (!shop) { setError("店舗コードが見つかりません"); return; }
      const settings = await DB.loadShopSettings(shop.shopId);
      if (!settings) { setError("設定が見つかりません"); return; }
      const correctPin = role === "admin" ? settings.adminPin : settings.pin;
      if (pin !== correctPin) { setError("PINが違います"); return; }
      Store.setShopId(shop.shopId);
      onLogin({ shopId: shop.shopId, settings, role });
    } catch(e) {
      setError("接続エラーが発生しました。再度お試しください。");
    }
  }

  async function handleCreate() {
    if (!newName.trim()) { setError("店舗名を入力してください"); return; }
    if (newPin.length < 4) { setError("PINは4桁以上で設定してください"); return; }
    setError("登録中...");
    try {
      const shopId = newName.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8) + Math.random().toString(36).slice(2,5).toUpperCase();
      const settings = defaultShopSettings(shopId, newName.trim());
      settings.pin = newPin;
      settings.adminPin = newPin;
      await DB.saveShop({ shopId, shopName: newName.trim() });
      await DB.saveShopSettings(shopId, settings);
      setShopCode(shopId);
      setCreating(false);
      setError(`✅ 店舗コード: ${shopId} — メモしてください！`);
    } catch(e) {
      setError("登録に失敗しました。ネットワークを確認してください。");
    }
  }

  if (creating) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <BgAura />
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:28, fontWeight:900, color:C.gold }}>新規店舗登録</div>
          <div style={{ fontSize:13, color:C.textDim, marginTop:4 }}>無料で始めましょう</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>店舗名</div>
            <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="例: キャバクラ SPARROW"
              style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>スタッフPIN（数字4桁以上）</div>
            <input value={newPin} onChange={e=>setNewPin(e.target.value)} type="password" placeholder="0000"
              style={inputStyle} />
          </div>
          {error && <div style={{ fontSize:13, color: error.startsWith("✅") ? C.green : C.red, padding:"8px 12px", background:"rgba(0,0,0,0.3)", borderRadius:10 }}>{error}</div>}
          <button onClick={handleCreate} style={btnStyle(C.gold)}>登録する</button>
          <button onClick={()=>{setCreating(false);setError("");}} style={btnStyle(C.textDim)}>← 戻る</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <BgAura />
      <div style={{ position:"relative", zIndex:1, width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:32, fontWeight:900, color:C.gold, letterSpacing:"0.08em" }}>CLUB SYSTEM</div>
          <div style={{ fontSize:13, color:C.textDim, marginTop:4 }}>キャバクラ向けオーダー管理</div>
        </div>

        {/* 役割選択 */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {[["cast","💗 スタッフ"],["admin","👑 管理者"]].map(([r,label])=>(
            <button key={r} onClick={()=>setRole(r)} style={{
              flex:1, padding:"12px", borderRadius:14, cursor:"pointer", fontWeight:700, fontSize:14,
              border: `1px solid ${role===r ? C.gold : C.border}`,
              background: role===r ? C.goldDim : "transparent",
              color: role===r ? C.gold : C.textDim,
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>店舗コード</div>
            <input value={shopCode} onChange={e=>setShopCode(e.target.value.toUpperCase())} placeholder="例: SPARROW123"
              style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>PIN</div>
            <input value={pin} onChange={e=>setPin(e.target.value)} type="password" placeholder="••••"
              style={inputStyle} />
          </div>
          {error && <div style={{ fontSize:13, color:C.red, padding:"8px 12px", background:"rgba(240,80,80,0.1)", borderRadius:10 }}>{error}</div>}
          <button onClick={handleLogin} style={btnStyle(C.gold)}>ログイン</button>
          <button onClick={()=>{setCreating(true);setError("");}} style={{
            padding:"12px", borderRadius:14, border:`1px solid ${C.border}`,
            background:"transparent", color:C.textDim, cursor:"pointer", fontSize:14,
          }}>初めての方 → 新規店舗登録</button>
        </div>
      </div>
    </div>
  );
}



// ══════════════════════════════════════════════════════════════

// 店舗設定画面
// ══════════════════════════════════════════════════════════════
function SettingsPanel({ settings, shopId, onSave, onExit }) {
  const [tab, setTab] = useState("cast");
  const [s, setS]     = useState(() => JSON.parse(JSON.stringify(settings)));
  const [saved, setSaved] = useState(false);

  async function save() {
    await DB.saveShopSettings(shopId, s);
    onSave(s);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  }

  const tabStyle = (active) => ({
    padding:"10px 14px", borderRadius:20, fontSize:13, fontWeight:700, cursor:"pointer",
    border: `1px solid ${active ? C.gold : C.border}`,
    background: active ? C.goldDim : "transparent",
    color: active ? C.gold : C.textDim, flexShrink:0,
  });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text }}>
      <BgAura />
      <div style={{ position:"relative", zIndex:1 }}>
        {/* ヘッダー */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:`1px solid ${C.border}`, background:"rgba(8,5,15,0.9)" }}>
          <button onClick={onExit} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 14px", color:C.textDim, cursor:"pointer", fontSize:13 }}>← 戻る</button>
          <div style={{ flex:1, fontSize:17, fontWeight:800, color:C.gold }}>⚙️ 店舗設定</div>
          <button onClick={save} style={{ background: saved ? C.green : C.gold, border:"none", borderRadius:12, padding:"10px 20px", color:"#0a0618", fontWeight:800, cursor:"pointer", fontSize:14 }}>
            {saved ? "✓ 保存済み" : "保存"}
          </button>
        </div>

        {/* タブ */}
        <div style={{ display:"flex", gap:8, padding:"12px 16px", overflowX:"auto" }}>
          {[["cast","👗 キャスト"],["table","🍽️ テーブル"],["menu","🍹 メニュー"],["pin","🔐 PIN"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={tabStyle(tab===k)}>{l}</button>
          ))}
        </div>

        <div style={{ padding:"0 16px 100px" }}>

          {/* キャスト */}
          {tab==="cast" && (
            <div>
              <div style={{ fontSize:12, color:C.textDim, marginBottom:12 }}>キャスト名（1行1人）</div>
              <textarea value={s.castList.join("\n")} rows={12}
                onChange={e=>setS({...s, castList: e.target.value.split("\n").map(x=>x.trim()).filter(Boolean)})}
                style={{ ...inputStyle, height:280, resize:"vertical", lineHeight:1.8, fontSize:16 }} />
              <div style={{ fontSize:12, color:C.textDim, marginTop:8 }}>{s.castList.length}名登録中</div>
            </div>
          )}

          {/* テーブル */}
          {tab==="table" && (
            <div>
              <div style={{ fontSize:12, color:C.textDim, marginBottom:12 }}>テーブル設定</div>
              {s.tables.map((t,i)=>(
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                  <input value={t.label} onChange={e=>{
                    const tables=[...s.tables]; tables[i]={...t,label:e.target.value}; setS({...s,tables});
                  }} style={{ ...inputStyle, flex:1, padding:"10px 14px" }} />
                  <button onClick={()=>setS({...s,tables:s.tables.filter((_,j)=>j!==i)})}
                    style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${C.red}`, background:C.redDim, color:C.red, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <button onClick={()=>setS({...s,tables:[...s.tables,{id:`t${uid()}`,label:`${s.tables.length+1}番`}]})}
                style={{ width:"100%", padding:"12px", borderRadius:12, border:`1px dashed ${C.gold}`, background:"transparent", color:C.gold, cursor:"pointer", marginTop:8, fontSize:14 }}>
                ＋ テーブル追加
              </button>
            </div>
          )}

          {/* メニュー */}
          {tab==="menu" && (
            <div>
              <div style={{ fontSize:13, color:C.gold, fontWeight:700, marginBottom:10 }}>🍹 その他キャストドリンク</div>
              {s.castDrinksSingle.map((d,i)=>(
                <div key={i} style={{ display:"flex", gap:6, marginBottom:8, alignItems:"center" }}>
                  <input value={d.emoji} onChange={e=>{const m=[...s.castDrinksSingle];m[i]={...d,emoji:e.target.value};setS({...s,castDrinksSingle:m});}}
                    style={{ ...inputStyle, width:50, padding:"10px 8px", textAlign:"center", fontSize:20 }} />
                  <input value={d.name} onChange={e=>{const m=[...s.castDrinksSingle];m[i]={...d,name:e.target.value};setS({...s,castDrinksSingle:m});}}
                    style={{ ...inputStyle, flex:1, padding:"10px 12px" }} />
                  <input value={d.price} type="number" onChange={e=>{const m=[...s.castDrinksSingle];m[i]={...d,price:Number(e.target.value)};setS({...s,castDrinksSingle:m});}}
                    style={{ ...inputStyle, width:90, padding:"10px 8px" }} />
                  <button onClick={()=>setS({...s,castDrinksSingle:s.castDrinksSingle.filter((_,j)=>j!==i)})}
                    style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${C.red}`, background:C.redDim, color:C.red, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <button onClick={()=>setS({...s,castDrinksSingle:[...s.castDrinksSingle,{id:`d${uid()}`,name:"新しいドリンク",price:1000,emoji:"🍹"}]})}
                style={{ width:"100%", padding:"12px", borderRadius:12, border:`1px dashed ${C.gold}`, background:"transparent", color:C.gold, cursor:"pointer", marginTop:4, fontSize:13 }}>
                ＋ ドリンク追加
              </button>

              <div style={{ fontSize:13, color:C.gold, fontWeight:700, margin:"20px 0 10px" }}>🍶 ベース酒</div>
              {s.baseLiquors.map((b,i)=>(
                <div key={i} style={{ display:"flex", gap:6, marginBottom:8, alignItems:"center" }}>
                  <input value={b.emoji} onChange={e=>{const m=[...s.baseLiquors];m[i]={...b,emoji:e.target.value};setS({...s,baseLiquors:m});}}
                    style={{ ...inputStyle, width:50, padding:"10px 8px", textAlign:"center", fontSize:20 }} />
                  <input value={b.name} onChange={e=>{const m=[...s.baseLiquors];m[i]={...b,name:e.target.value};setS({...s,baseLiquors:m});}}
                    style={{ ...inputStyle, flex:1, padding:"10px 12px" }} />
                  <button onClick={()=>setS({...s,baseLiquors:s.baseLiquors.filter((_,j)=>j!==i)})}
                    style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${C.red}`, background:C.redDim, color:C.red, cursor:"pointer" }}>✕</button>
                </div>
              ))}
              <button onClick={()=>setS({...s,baseLiquors:[...s.baseLiquors,{id:`b${uid()}`,name:"新しいベース",emoji:"🥃"}]})}
                style={{ width:"100%", padding:"12px", borderRadius:12, border:`1px dashed ${C.gold}`, background:"transparent", color:C.gold, cursor:"pointer", marginTop:4, fontSize:13 }}>
                ＋ ベース酒追加
              </button>
            </div>
          )}

          {/* PIN */}
          {tab==="pin" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ padding:"16px", background:C.bgCard, borderRadius:14, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:12, color:C.textDim, marginBottom:4 }}>店舗コード（変更不可）</div>
                <div style={{ fontSize:18, fontWeight:900, color:C.gold, letterSpacing:"0.1em" }}>{shopId}</div>
                <div style={{ fontSize:11, color:C.textDim, marginTop:4 }}>スタッフに共有するコードです</div>
              </div>
              <div>
                <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>スタッフPIN（キャスト端末用）</div>
                <input value={s.pin} onChange={e=>setS({...s,pin:e.target.value})} type="text" placeholder="0000" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>管理者PIN（管理パネル用）</div>
                <input value={s.adminPin} onChange={e=>setS({...s,adminPin:e.target.value})} type="text" placeholder="9999" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>店舗名</div>
                <input value={s.shopName} onChange={e=>setS({...s,shopName:e.target.value})} style={inputStyle} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════

// 日次レポート画面
// ══════════════════════════════════════════════════════════════
function DailyReportPanel({ shopId, onExit }) {
  const today = new Date().toISOString().slice(0,10);
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [report, setReport] = useState(null);

  useEffect(() => {
    DB.getReportIndex(shopId).then(idx => {
      setDates(idx);
      if (idx.length > 0) {
        setSelectedDate(idx[0]);
        DB.loadDailyReport(shopId, idx[0]).then(setReport);
      }
    });
  }, [shopId]);

  function selectDate(d) {
    setSelectedDate(d);
    DB.loadDailyReport(shopId, d).then(setReport);
  }

  const totalSales = report ? report.tableReports.reduce((s,t)=>s+t.total,0) : 0;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text }}>
      <BgAura />
      <div style={{ position:"relative", zIndex:1 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:`1px solid ${C.border}`, background:"rgba(8,5,15,0.9)" }}>
          <button onClick={onExit} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:10, padding:"8px 14px", color:C.textDim, cursor:"pointer", fontSize:13 }}>← 戻る</button>
          <div style={{ fontSize:17, fontWeight:800, color:C.gold }}>📊 日次レポート</div>
        </div>

        <div style={{ padding:"16px" }}>
          {/* 日付セレクター */}
          {dates.length > 0 ? (
            <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:20, paddingBottom:4 }}>
              {dates.map(d=>(
                <button key={d} onClick={()=>selectDate(d)} style={{
                  padding:"8px 14px", borderRadius:16, fontSize:13, fontWeight:700, whiteSpace:"nowrap", flexShrink:0,
                  border:`1px solid ${selectedDate===d ? C.gold : C.border}`,
                  background: selectedDate===d ? C.goldDim : "transparent",
                  color: selectedDate===d ? C.gold : C.textDim, cursor:"pointer",
                }}>{d}</button>
              ))}
            </div>
          ) : (
            <div style={{ textAlign:"center", padding:"40px 20px", color:C.textDim }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
              <div>レポートはまだありません</div>
              <div style={{ fontSize:12, marginTop:8 }}>営業終了後に「レポート保存」を押すと記録されます</div>
            </div>
          )}

          {report && (
            <>
              {/* 総売上 */}
              <div style={{ padding:"20px", background:C.goldDim, border:`1px solid ${C.goldBorder}`, borderRadius:18, marginBottom:16, textAlign:"center" }}>
                <div style={{ fontSize:12, color:C.textDim, marginBottom:4 }}>{selectedDate} 総売上</div>
                <div style={{ fontSize:36, fontWeight:900, color:C.gold }}>¥{totalSales.toLocaleString()}</div>
                <div style={{ fontSize:13, color:C.textDim, marginTop:4 }}>{report.tableReports.length}卓 ／ {report.totalCups}杯</div>
              </div>

              {/* 卓別 */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:13, color:C.textDim, marginBottom:10 }}>▍卓別売上</div>
                {report.tableReports.map((t,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:C.bgCard, borderRadius:12, marginBottom:8, border:`1px solid ${C.border}` }}>
                    <div style={{ fontWeight:800, color:C.gold, width:70 }}>{t.tableLabel}</div>
                    <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${totalSales>0?(t.total/totalSales)*100:0}%`, background:`linear-gradient(90deg,${C.gold},${C.pink})`, borderRadius:3 }} />
                    </div>
                    <div style={{ fontWeight:800, color:C.gold, width:90, textAlign:"right" }}>¥{t.total.toLocaleString()}</div>
                  </div>
                ))}
              </div>

              {/* キャスト別 */}
              {report.castReports && report.castReports.length > 0 && (
                <div>
                  <div style={{ fontSize:13, color:C.textDim, marginBottom:10 }}>▍キャスト別売上</div>
                  {report.castReports.sort((a,b)=>b.revenue-a.revenue).map((c,i)=>(
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:C.bgCard, borderRadius:12, marginBottom:6, border:`1px solid ${C.border}` }}>
                      <div style={{ color:C.pink, fontWeight:700, width:70 }}>{c.castName}</div>
                      <div style={{ flex:1, height:5, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${report.castReports[0].revenue>0?(c.revenue/report.castReports[0].revenue)*100:0}%`, background:`linear-gradient(90deg,${C.gold},${C.pink})`, borderRadius:3 }} />
                      </div>
                      <div style={{ color:C.gold, fontWeight:800, width:90, textAlign:"right" }}>¥{c.revenue.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════

function Landing({ onSelect, session, onLogout }) {
  return (
    <div style={{
      position:"relative", zIndex:1, minHeight:"100vh",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      gap:28, padding:"32px 24px",
    }}>
      {/* 店舗名 */}
      <div style={{ position:"absolute", top:16, right:16, display:"flex", gap:8 }}>
        <div style={{ fontSize:12, color:C.textDim, padding:"6px 12px", background:C.bgCard, borderRadius:20, border:`1px solid ${C.border}` }}>
          {session?.settings?.shopName || "店舗"}
        </div>
        <button onClick={onLogout} style={{ fontSize:12, color:C.textDim, padding:"6px 12px", background:"transparent", border:`1px solid ${C.border}`, borderRadius:20, cursor:"pointer" }}>
          ログアウト
        </button>
      </div>

      {/* ロゴ画像 */}
      <div style={{ textAlign:"center" }}>
        <div style={{
          display:"inline-block", borderRadius:16, padding:"20px 24px",
          background:"rgba(232,184,75,0.08)",
          boxShadow:"0 0 60px rgba(232,184,75,0.18), 0 0 20px rgba(232,184,75,0.1)",
        }}>
          <img src={LOGO_SRC} alt="SPARROW AMAMI OSHIMA" style={{
            width:260, maxWidth:"80vw", display:"block",
            mixBlendMode:"multiply",
            filter:"sepia(1) saturate(1.5) hue-rotate(-10deg) brightness(0.85)",
          }} />
        </div>
        <div style={{ fontSize:11, color:C.textDim, letterSpacing:"0.2em", marginTop:12, fontFamily:"'Palatino Linotype',serif" }}>
          ORDER MANAGEMENT SYSTEM
        </div>
      </div>

      {/* 区切り線 */}
      <div style={{ width:200, height:1, background:`linear-gradient(90deg,transparent,${C.goldBorder},transparent)` }} />

      {/* モード選択 */}
      <div style={{ display:"flex", flexDirection:"column", gap:14, width:"100%", maxWidth:380 }}>
        {[
          { key:"cast",  icon:"💗", title:"キャスト端末",    desc:"卓固定・ドリンク＆サービス注文", color:C.pink },
          { key:"admin", icon:"👑", title:"管理・ドリンク場", desc:"注文集計・キッチンディスプレイ", color:C.gold },
        ].map(m => (
          <button key={m.key} onClick={() => onSelect(m.key)} style={{
            background: C.bgCard, border: `1px solid ${C.goldBorder}`, borderRadius: 20,
            padding: "22px 24px", cursor: "pointer", textAlign: "left",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span style={{ fontSize:34 }}>{m.icon}</span>
            <div>
              <div style={{ fontSize:17, fontWeight:700, color:m.color, marginBottom:4 }}>{m.title}</div>
              <div style={{ fontSize:12, color:C.textDim }}>{m.desc}</div>
            </div>
            <span style={{ marginLeft:"auto", fontSize:20, color:m.color }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════

// キャスト端末
// ══════════════════════════════════════════════════════════════
function CastTerminal({ onExit, settings }) {
  const [phase, setPhase]           = useState("tableSetup");
  const [tableId, setTableId]       = useState(null);
  const [activeCast, setActiveCast] = useState(null);
  const [isGuest, setIsGuest]       = useState(false);
  const [selectedDrink, setSelectedDrink] = useState(null);
  const [selectedBase, setSelectedBase]   = useState(null);
  const [selectedSplit, setSelectedSplit] = useState(null);
  const [splitModal, setSplitModal]       = useState(false);
  const [isNonAlco, setIsNonAlco]   = useState(false);
  const [qty, setQty]               = useState(1);
  const [cart, setCart]             = useState([]);
  const [notif, setNotif]           = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [guestTab, setGuestTab]     = useState("base");

  // 設定から動的取得（フォールバックあり）
  const dynTables      = settings?.tables      || TABLES;
  const dynCastList    = settings?.castList    || CAST_LIST;
  const dynBaseLiquors = settings?.baseLiquors || BASE_LIQUORS;
  const dynCastSingle  = settings?.castDrinksSingle || CAST_DRINKS_SINGLE;

  const tableInfo = dynTables.find(t => t.id === tableId);

  // 現在確定しているドリンクオブジェクト（表示用）
  const resolvedDrink = (() => {
    if (selectedBase && selectedSplit) {
      const baseList = isGuest ? GUEST_BASE_LIQUORS : dynBaseLiquors;
      const base  = baseList.find(b => b.id === selectedBase);
      const split = SPLIT_TYPES.find(s => s.id === selectedSplit);
      return { name:`${base.name} ${split.name}`, emoji: base.emoji, price: isGuest ? 0 : 1000, isBase: true };
    }
    if (selectedDrink) {
      if (isGuest) {
        return GUEST_DRINKS_SINGLE.find(d => d.id === selectedDrink)
            || GUEST_DRINKS_PITCHER.find(d => d.id === selectedDrink)
            || null;
      }
      return dynCastSingle.find(d => d.id === selectedDrink) || null;
    }
    return null;
  })();

  const hasSelection = !!resolvedDrink;

  function flash(msg, type = "ok") {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 2600);
  }

  function goToDrink(castName, guest) {
    setActiveCast(guest ? null : castName);
    setIsGuest(guest);
    setSelectedDrink(null);
    setSelectedBase(null);
    setSelectedSplit(null);
    setSplitModal(false);
    setIsNonAlco(false);
    setQty(1);
    setPhase("drinkSelect");
  }

  // ベース酒タップ → 割り方モーダル表示
  function handleBaseTap(baseId) {
    if (selectedBase === baseId) {
      setSelectedBase(null);
      setSelectedSplit(null);
      setSplitModal(false);
    } else {
      setSelectedBase(baseId);
      setSelectedSplit(null);
      setSplitModal(true);
    }
    setSelectedDrink(null);
  }

  // 割り方選択確定
  function handleSplitSelect(splitId) {
    setSelectedSplit(splitId);
    setSplitModal(false);
  }

  // シングルドリンクタップ
  function handleSingleTap(drinkId) {
    setSelectedDrink(d => d === drinkId ? null : drinkId);
    setSelectedBase(null);
    setSelectedSplit(null);
    setSplitModal(false);
  }

  function addToCart() {
    if (!resolvedDrink) return;
    const item = {
      id: uid(),
      castName: isGuest ? null : activeCast,
      isGuest,
      drinkId: selectedBase ? `${selectedBase}_${selectedSplit}` : selectedDrink,
      drinkName: resolvedDrink.name,
      emoji: resolvedDrink.emoji,
      price: isGuest ? 0 : resolvedDrink.price,  // ゲストは0円（集計不要）
      qty,
      nonAlco: isNonAlco,
      special: resolvedDrink.special || false,
      noCount: isGuest,  // ゲストは売上集計しない
    };
    setCart(prev => [...prev, item]);
    flash(`${isGuest ? "ゲスト" : activeCast} → ${resolvedDrink.name}${isNonAlco ? " ❤️" : ""} ×${qty} 追加`);
    setActiveCast(null); setIsGuest(false);
    setSelectedDrink(null); setSelectedBase(null); setSelectedSplit(null);
    setSplitModal(false); setIsNonAlco(false); setQty(1);
    setPhase("castSelect");
  }

  function sendService(svc) {
    Store.addService(tableId, tableInfo?.label, svc);
    flash(`${svc.name} を送信しました`);
  }

  // 場内指名をカートに追加
  function addShimei(castName) {
    const item = {
      id: uid(),
      castName,
      isGuest: false,
      drinkId: "shimei",
      drinkName: "場内指名",
      emoji: "⭐",
      price: settings?.shimeiPrice || 0,
      qty: 1,
      nonAlco: false,
      special: false,
      noCount: false,
      isShimei: true,
    };
    setCart(prev => [...prev, item]);
    flash(`⭐ ${castName} 場内指名 追加`);
  }

  function submitAll() {
    Store.addBatch(tableId, tableInfo?.label, [...cart]);
    flash(`${cart.length}件の注文を送信しました ✓`);
    setCart([]);
    setConfirmOpen(false);
    setPhase("castSelect");
  }

  // ① テーブル設定
  if (phase === "tableSetup") {
    return (
      <Centered>
        <div style={S.setupCard}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ fontSize:36, color:C.gold }}>♛</div>
            <div style={{ fontSize:18, fontWeight:900, color:C.gold, letterSpacing:"0.12em", marginTop:4 }}>CAST TERMINAL</div>
            <div style={{ fontSize:13, color:C.textDim, marginTop:8 }}>テーブル番号を選択</div>
            <div style={{ fontSize:11, color:C.red, marginTop:4 }}>※ 設定後は変更できません</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
            {dynTables.filter(t => typeof t.id === "number").map(t => (
              <button key={t.id} onClick={() => setTableId(t.id)} style={{
                padding:"18px 8px", borderRadius:14, fontSize:22, fontWeight:800,
                border:`2px solid ${tableId === t.id ? C.gold : C.border}`,
                background: tableId === t.id ? C.goldDim : C.bgCard,
                color: tableId === t.id ? C.gold : C.textDim, cursor:"pointer",
                boxShadow: tableId === t.id ? `0 0 20px rgba(232,184,75,0.2)` : "none",
              }}>{t.label}</button>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:28 }}>
            {dynTables.filter(t => typeof t.id === "string").map(t => (
              <button key={t.id} onClick={() => setTableId(t.id)} style={{
                padding:"16px 8px", borderRadius:14, fontSize:15, fontWeight:800,
                border:`2px solid ${tableId === t.id ? C.gold : C.border}`,
                background: tableId === t.id ? C.goldDim : C.bgCard,
                color: tableId === t.id ? C.gold : C.textDim, cursor:"pointer",
                boxShadow: tableId === t.id ? `0 0 20px rgba(232,184,75,0.2)` : "none",
              }}>{t.label}</button>
            ))}
          </div>
          <BigBtn color={C.gold} disabled={tableId == null} onClick={() => setPhase("castSelect")}>
            {tableId != null ? `${tableInfo.label} で開始する →` : "テーブルを選択してください"}
          </BigBtn>
        </div>
      </Centered>
    );
  }

  // ② キャスト選択
  if (phase === "castSelect") {
    return (
      <div style={S.screen}>
        <Header
          left={<><TableBadge label={tableInfo?.label} /><span style={{ fontSize:12, color:C.textDim }}>キャスト選択</span></>}
          right={<ExitBtn onClick={onExit} />}
        />
        {notif && <Notif msg={notif.msg} />}
        <div style={S.body}>

          {/* サービス */}
          <SLabel>✨ サービス（即時送信）</SLabel>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:24 }}>
            {SERVICES.map(svc => (
              <button key={svc.id} onClick={() => sendService(svc)} style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                padding:"16px 6px", borderRadius:14, cursor:"pointer",
                border:`1px solid ${C.tealBorder}`, background:C.tealDim,
              }}>
                <span style={{ fontSize:28 }}>{svc.emoji}</span>
                <span style={{ fontSize:12, fontWeight:700, color:C.teal, textAlign:"center", lineHeight:1.3 }}>{svc.name}</span>
              </button>
            ))}
          </div>

          {/* カート */}
          {cart.length > 0 && (
            <div style={{ marginBottom:20 }}>
              <SLabel>🛒 現在のオーダー（{cart.length}件）</SLabel>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
                {cart.map(item => (
                  <div key={item.id} style={S.cartRow}>
                    <span style={{ fontSize:18 }}>{item.emoji}</span>
                    <span style={{ ...S.cartCast, color: item.isShimei ? C.gold : item.isGuest ? C.purple : C.pink }}>
                      {item.isGuest ? "ゲスト" : item.castName}
                    </span>
                    <span style={{ flex:1, fontSize:14, color: item.isShimei ? C.gold : C.text, fontWeight: item.isShimei ? 700 : 400 }}>
                      {item.drinkName}{item.nonAlco ? " ❤️" : ""}
                    </span>
                    <span style={{ fontSize:12, color:C.textDim }}>×{item.qty}</span>
                    <button style={S.trash} onClick={() => setCart(p => p.filter(i => i.id !== item.id))}>✕</button>
                  </div>
                ))}
              </div>
              <BigBtn color={C.green} onClick={() => setConfirmOpen(true)}>
                まとめて注文を送信する（{cart.length}件）→
              </BigBtn>
            </div>
          )}

          {/* キャスト */}
          <SLabel>💗 キャストを選択</SLabel>
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
            {dynCastList.map(name => {
              const drinkCount  = cart.filter(i => i.castName === name && !i.isShimei).length;
              const shimeiCount = cart.filter(i => i.castName === name && i.isShimei).length;
              return (
                <div key={name} style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {/* 名前ラベル */}
                  <div style={{ width:72, fontSize:14, fontWeight:700, color:C.pink, flexShrink:0, textAlign:"center" }}>
                    {name}
                    {shimeiCount > 0 && <div style={{ fontSize:10, color:C.gold }}>⭐×{shimeiCount}</div>}
                  </div>
                  {/* ドリンクボタン */}
                  <button onClick={() => goToDrink(name, false)} style={{
                    flex:1, padding:"14px 8px", borderRadius:14, cursor:"pointer",
                    border:`1px solid ${drinkCount > 0 ? C.pink : C.border}`,
                    background: drinkCount > 0 ? C.pinkDim : C.bgCard,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6, position:"relative",
                  }}>
                    <span style={{ fontSize:18 }}>🍹</span>
                    <span style={{ fontSize:13, fontWeight:700, color: drinkCount > 0 ? C.pink : C.textDim }}>ドリンク</span>
                    {drinkCount > 0 && <span style={{ fontSize:11, color:C.pink, fontWeight:800 }}>×{drinkCount}</span>}
                  </button>
                  {/* 場内指名ボタン */}
                  <button onClick={() => addShimei(name)} style={{
                    flex:1, padding:"14px 8px", borderRadius:14, cursor:"pointer",
                    border:`1px solid ${shimeiCount > 0 ? C.gold : C.border}`,
                    background: shimeiCount > 0 ? C.goldDim : C.bgCard,
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  }}>
                    <span style={{ fontSize:18 }}>⭐</span>
                    <span style={{ fontSize:13, fontWeight:700, color: shimeiCount > 0 ? C.gold : C.textDim }}>場内指名</span>
                    {shimeiCount > 0 && <span style={{ fontSize:11, color:C.gold, fontWeight:800 }}>×{shimeiCount}</span>}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ゲスト */}
          {(() => {
            const count = cart.filter(i => i.isGuest).length;
            return (
              <button onClick={() => goToDrink(null, true)} style={{
                width:"100%", padding:"16px 20px", borderRadius:14, cursor:"pointer",
                border:`1px solid ${count > 0 ? C.purple : C.border}`,
                background: count > 0 ? C.purpleDim : C.bgCard,
                display:"flex", alignItems:"center", gap:12,
              }}>
                <span style={{ fontSize:28 }}>🥂</span>
                <span style={{ fontSize:16, fontWeight:700, color: count > 0 ? C.purple : C.text }}>ゲスト注文</span>
                {count > 0 && <span style={{ marginLeft:"auto", fontSize:13, color:C.purple, fontWeight:800 }}>{count}件</span>}
              </button>
            );
          })()}
        </div>

        {/* 送信確認モーダル */}
        {confirmOpen && (
          <Overlay onClick={() => setConfirmOpen(false)}>
            <div style={S.modal} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize:16, fontWeight:800, color:C.gold, marginBottom:4 }}>注文確認</div>
              <div style={{ fontSize:13, color:C.textDim, marginBottom:16 }}>{tableInfo?.label}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16, maxHeight:"45vh", overflowY:"auto" }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", background:C.goldDim, borderRadius:10 }}>
                    <span style={{ fontSize:18 }}>{item.emoji}</span>
                    <span style={{ fontWeight:700, fontSize:13, width:56, flexShrink:0, color: item.isShimei ? C.gold : item.isGuest ? C.purple : C.pink }}>
                      {item.isGuest ? "ゲスト" : item.castName}
                    </span>
                    <span style={{ flex:1, fontSize:14, fontWeight: item.isShimei ? 700 : 400, color: item.isShimei ? C.gold : C.text }}>{item.drinkName}{item.nonAlco ? " ❤️" : ""}</span>
                    <span style={{ fontSize:12, color:C.textDim }}>×{item.qty}</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <CancelBtn onClick={() => setConfirmOpen(false)}>戻る</CancelBtn>
                <BigBtn color={C.green} onClick={submitAll}>送信する</BigBtn>
              </div>
            </div>
          </Overlay>
        )}
      </div>
    );
  }

  // ③ ドリンク選択
  const ac = isGuest ? C.purple : C.gold;

  return (
    <div style={S.screen}>
      <Header
        left={
          <>
            <TableBadge label={tableInfo?.label} />
            <button onClick={() => { setPhase("castSelect"); setActiveCast(null); setIsGuest(false); setSplitModal(false); }} style={S.backBtn}>
              ← 戻る
            </button>
          </>
        }
        right={<ExitBtn onClick={onExit} />}
      />
      {notif && <Notif msg={notif.msg} />}

      <div style={{ ...S.body, paddingBottom: 130 }}>

        {/* ステータスバー */}
        <div style={S.statusBar}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>選択中</div>
            <div style={{ fontSize:16, fontWeight:800, color: isGuest ? C.purple : C.pink }}>
              {isGuest ? "🥂 ゲスト" : `💗 ${activeCast}`}
            </div>
          </div>
          <div style={{ width:1, background:C.border, margin:"0 12px", alignSelf:"stretch" }} />
          <div style={{ flex:2 }}>
            <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>選択中のドリンク</div>
            <div style={{ fontSize:13, fontWeight:700, color: resolvedDrink ? ac : C.textDim, lineHeight:1.3 }}>
              {resolvedDrink
                ? `${resolvedDrink.emoji} ${resolvedDrink.name}${isNonAlco ? " ❤️" : ""}`
                : selectedBase
                  ? `${dynBaseLiquors.find(b=>b.id===selectedBase)?.emoji} ${dynBaseLiquors.find(b=>b.id===selectedBase)?.name} → 割り方を選択`
                  : "— 未選択 —"}
            </div>
          </div>
          <div style={{ width:1, background:C.border, margin:"0 12px", alignSelf:"stretch" }} />
          <div>
            <div style={{ fontSize:10, color:C.textDim, marginBottom:3 }}>カート</div>
            <div style={{ fontSize:16, fontWeight:800, color:C.green }}>{cart.length}件</div>
          </div>
        </div>

        {/* ❤️ ノンアルトグル（キャストのみ） */}
        {!isGuest && (
          <button onClick={() => setIsNonAlco(v => !v)} style={{
            display:"flex", alignItems:"center", gap:10, width:"100%",
            padding:"12px 16px", borderRadius:14, marginBottom:16, cursor:"pointer",
            border:`2px solid ${isNonAlco ? C.pink : C.border}`,
            background: isNonAlco ? C.pinkDim : C.bgCard,
            color: isNonAlco ? C.pink : C.textDim, fontSize:14, fontWeight:700,
          }}>
            <span style={{ fontSize:18 }}>❤️</span>
            <span>ノンアルコール</span>
            {isNonAlco && <span style={{ marginLeft:"auto", fontSize:12, background:C.pinkBorder, padding:"2px 10px", borderRadius:10, color:C.pink }}>ON ✓</span>}
          </button>
        )}

        {/* ═══ キャストメニュー ═══ */}
        {!isGuest && (
          <>
            {/* ── ベース酒（2ステップ選択） ── */}
            <SLabel>🍶 ベース酒を選択</SLabel>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
              {dynBaseLiquors.map(b => {
                const active = selectedBase === b.id;
                return (
                  <button key={b.id} onClick={() => handleBaseTap(b.id)} style={{
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                    padding:"16px 6px", borderRadius:14, cursor:"pointer",
                    border:`2px solid ${active ? C.gold : C.border}`,
                    background: active ? C.goldDim : C.bgCard,
                    boxShadow: active ? `0 0 18px rgba(232,184,75,0.3)` : "none",
                    transition:"all 0.12s", position:"relative",
                  }}>
                    <span style={{ fontSize:28 }}>{b.emoji}</span>
                    <span style={{ fontSize:12, fontWeight:active?700:400, color:active?C.gold:C.text, textAlign:"center" }}>{b.name}</span>
                    {active && selectedSplit && (
                      <span style={{ fontSize:10, color:C.gold, marginTop:2 }}>
                        {SPLIT_TYPES.find(s=>s.id===selectedSplit)?.name}
                      </span>
                    )}
                    {active && !selectedSplit && (
                      <span style={{ fontSize:10, color:C.gold, marginTop:2 }}>割り方を選択 →</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── その他ドリンク ── */}
            <SLabel>🍹 その他ドリンク</SLabel>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:8 }}>
              {dynCastSingle.map(d => {
                const active = selectedDrink === d.id;
                const isSpecial = d.special;
                const bc = isSpecial ? (active ? C.red : "rgba(240,80,80,0.35)") : (active ? C.gold : C.border);
                const bg = isSpecial ? (active ? C.redDim : "rgba(240,80,80,0.06)") : (active ? C.goldDim : C.bgCard);
                const tc = isSpecial ? C.red : C.gold;
                return (
                  <button key={d.id} onClick={() => handleSingleTap(d.id)} style={{
                    display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                    padding:"14px 6px", borderRadius:14, cursor:"pointer",
                    border:`2px solid ${bc}`, background: bg,
                    boxShadow: active ? `0 0 18px rgba(${isSpecial?"240,80,80":"232,184,75"},0.25)` : "none",
                    transition:"all 0.12s", position:"relative",
                  }}>
                    {isSpecial && (
                      <span style={{ position:"absolute", top:4, right:4, fontSize:9, fontWeight:800, color:C.red, background:"rgba(240,80,80,0.15)", padding:"1px 5px", borderRadius:6 }}>
                        ¥{d.price.toLocaleString()}
                      </span>
                    )}
                    <span style={{ fontSize:26 }}>{d.emoji}</span>
                    <span style={{ fontSize:11, fontWeight:active?700:400, color:active?tc:C.text, textAlign:"center", lineHeight:1.3 }}>{d.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ═══ ゲストメニュー ═══ */}
        {isGuest && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:14 }}>
              {[
                { key:"base",    label:"🍶 お酒" },
                { key:"single",  label:"🥤 ドリンク" },
                { key:"pitcher", label:"🫙 ピッチャー" },
              ].map(t => (
                <button key={t.key} onClick={() => { setGuestTab(t.key); setSelectedDrink(null); setSelectedBase(null); setSelectedSplit(null); setSplitModal(false); }} style={{
                  flex:1, padding:"10px 4px", borderRadius:20, fontSize:12, fontWeight:700,
                  border:`1px solid ${guestTab===t.key ? C.purple : C.border}`,
                  background: guestTab===t.key ? C.purpleDim : "transparent",
                  color: guestTab===t.key ? C.purple : C.textDim, cursor:"pointer",
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ゲストベース酒 */}
            {guestTab === "base" && (
              <>
                <SLabel>🍶 お酒を選択（飲み放題）</SLabel>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:8 }}>
                  {GUEST_BASE_LIQUORS.map(b => {
                    const active = selectedBase === b.id;
                    return (
                      <button key={b.id} onClick={() => handleBaseTap(b.id)} style={{
                        display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                        padding:"16px 6px", borderRadius:14, cursor:"pointer",
                        border:`2px solid ${active ? C.purple : C.border}`,
                        background: active ? C.purpleDim : C.bgCard,
                        boxShadow: active ? `0 0 18px rgba(155,89,245,0.3)` : "none",
                        transition:"all 0.12s", position:"relative",
                      }}>
                        <span style={{ fontSize:28 }}>{b.emoji}</span>
                        <span style={{ fontSize:12, fontWeight:active?700:400, color:active?C.purple:C.text, textAlign:"center" }}>{b.name}</span>
                        {active && selectedSplit && (
                          <span style={{ fontSize:10, color:C.purple, marginTop:2 }}>
                            {SPLIT_TYPES.find(s=>s.id===selectedSplit)?.name}
                          </span>
                        )}
                        {active && !selectedSplit && (
                          <span style={{ fontSize:10, color:C.purple, marginTop:2 }}>割り方を選択 →</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ゲストその他 */}
            {guestTab === "single" && (
              <>
                <SLabel>🥤 ドリンクを選択（飲み放題）</SLabel>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:8 }}>
                  {GUEST_DRINKS_SINGLE.map(d => {
                    const active = selectedDrink === d.id;
                    return (
                      <button key={d.id} onClick={() => handleSingleTap(d.id)} style={{
                        display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                        padding:"14px 6px", borderRadius:14, cursor:"pointer",
                        border:`2px solid ${active ? C.purple : C.border}`,
                        background: active ? C.purpleDim : C.bgCard,
                        boxShadow: active ? `0 0 18px rgba(155,89,245,0.25)` : "none",
                        transition:"all 0.12s",
                      }}>
                        <span style={{ fontSize:26 }}>{d.emoji}</span>
                        <span style={{ fontSize:11, fontWeight:active?700:400, color:active?C.purple:C.text, textAlign:"center", lineHeight:1.3 }}>{d.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* ゲストピッチャー */}
            {guestTab === "pitcher" && (
              <>
                <SLabel>🫙 ピッチャーを選択（飲み放題）</SLabel>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:8 }}>
                  {GUEST_DRINKS_PITCHER.map(d => {
                    const active = selectedDrink === d.id;
                    return (
                      <button key={d.id} onClick={() => handleSingleTap(d.id)} style={{
                        display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                        padding:"14px 6px", borderRadius:14, cursor:"pointer",
                        border:`2px solid ${active ? C.teal : C.tealBorder}`,
                        background: active ? C.tealDim : "rgba(78,205,196,0.04)",
                        boxShadow: active ? `0 0 18px rgba(78,205,196,0.25)` : "none",
                        transition:"all 0.12s", position:"relative",
                      }}>
                        <span style={{ position:"absolute", top:4, left:4, fontSize:9, fontWeight:800, color:C.teal, background:"rgba(78,205,196,0.15)", padding:"1px 5px", borderRadius:6 }}>P</span>
                        <span style={{ fontSize:26 }}>{d.emoji}</span>
                        <span style={{ fontSize:11, fontWeight:active?700:400, color:active?C.teal:C.text, textAlign:"center", lineHeight:1.3 }}>{d.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── 割り方選択モーダル ── */}
      {splitModal && selectedBase && (
        <Overlay onClick={() => setSplitModal(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            {(() => {
              const baseList = isGuest ? GUEST_BASE_LIQUORS : dynBaseLiquors;
              const base = baseList.find(b => b.id === selectedBase);
              return (
                <>
                  <div style={{ fontSize:16, fontWeight:800, color: isGuest ? C.purple : C.gold, marginBottom:6 }}>
                    {base?.emoji} {base?.name}
                  </div>
                  <div style={{ fontSize:13, color:C.textDim, marginBottom:18 }}>割り方を選択してください</div>
                </>
              );
            })()}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
              {SPLIT_TYPES.map(st => (
                <button key={st.id} onClick={() => handleSplitSelect(st.id)} style={{
                  display:"flex", flexDirection:"column", alignItems:"center", gap:8,
                  padding:"18px 12px", borderRadius:16, cursor:"pointer",
                  border:`1px solid ${isGuest ? C.purpleBorder : C.goldBorder}`,
                  background: isGuest ? C.purpleDim : C.goldDim,
                }}>
                  <span style={{ fontSize:30 }}>{st.emoji}</span>
                  <span style={{ fontSize:14, fontWeight:700, color: isGuest ? C.purple : C.gold }}>{st.name}</span>
                </button>
              ))}
            </div>
            <button style={{ width:"100%", marginTop:14, padding:"12px", borderRadius:12, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, fontSize:14, cursor:"pointer" }}
              onClick={() => { setSplitModal(false); setSelectedBase(null); }}>
              キャンセル
            </button>
          </div>
        </Overlay>
      )}

      {/* ── 固定注文バー ── */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:200,
        background:"rgba(8,5,15,0.97)", backdropFilter:"blur(16px)",
        borderTop:`1px solid ${hasSelection ? (isGuest ? C.purpleBorder : C.goldBorder) : C.border}`,
        padding:"12px 16px 20px",
      }}>
        {hasSelection ? (
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <span style={{ fontSize:24 }}>{resolvedDrink.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
                  {resolvedDrink.name}{isNonAlco ? " ❤️" : ""}
                  {resolvedDrink.special && <span style={{ fontSize:11, color:C.red, marginLeft:6 }}>¥2,000</span>}
                </div>
                <div style={{ fontSize:11, color:C.textDim }}>{isGuest ? "🥂 ゲスト" : `💗 ${activeCast}`}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <button onClick={() => setQty(q => Math.max(1,q-1))} style={{ ...qbs, width:36, height:36, fontSize:18 }}>−</button>
                <span style={{ fontSize:22, fontWeight:900, color:ac, minWidth:24, textAlign:"center" }}>{qty}</span>
                <button onClick={() => setQty(q => q+1)} style={{ ...qbs, width:36, height:36, fontSize:18 }}>＋</button>
              </div>
            </div>
            <button onClick={addToCart} style={{
              width:"100%", padding:"14px",
              background:`linear-gradient(135deg,${ac},${ac}bb)`,
              border:"none", borderRadius:14,
              color:"#0a0618", fontSize:16, fontWeight:800, cursor:"pointer",
            }}>
              カートに追加する →
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 0" }}>
            <span style={{ fontSize:16 }}>👆</span>
            <span style={{ fontSize:14, color:C.textDim }}>ドリンクを選択してください</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 管理・ドリンク場パネル
// ══════════════════════════════════════════════════════════════
function AdminPanel({ onExit, onSettings, onReport, settings, shopId }) {
  const [data, setData]   = useState({ batches:[], services:[] });
  const [tab, setTab]     = useState("kitchen");
  const [resetTarget, setResetTarget] = useState(null);
  const [reportSaved, setReportSaved] = useState(false);

  useEffect(() => {
    return Store.subscribe(setData);
  }, []);

  const { batches, services } = data;

  const pendingBatches  = batches.filter(b => b.status === "pending");
  const doneBatches     = batches.filter(b => b.status === "done");
  const pendingServices = services.filter(s => s.status === "pending");
  const doneServices    = services.filter(s => s.status === "done");

  // 日次レポートを保存
  async function saveReport() {
    const today = new Date().toISOString().slice(0,10);
    // テーブル別集計
    const tMap = {};
    batches.forEach(b => {
      const k = String(b.tableId);
      if (!tMap[k]) tMap[k] = { tableLabel: b.tableLabel, total:0, cups:0 };
      b.items.forEach(item => {
        if (!item.noCount) { tMap[k].total += (item.price||0)*(item.qty||1); tMap[k].cups += (item.qty||1); }
      });
    });
    // キャスト別集計
    const cMap = {};
    batches.forEach(b => b.items.forEach(item => {
      if (item.noCount || !item.castName) return;
      if (!cMap[item.castName]) cMap[item.castName] = { castName:item.castName, revenue:0, cups:0 };
      cMap[item.castName].revenue += (item.price||0)*(item.qty||1);
      cMap[item.castName].cups    += (item.qty||1);
    }));
    const tableReports = Object.values(tMap);
    const castReports  = Object.values(cMap);
    const totalCups    = tableReports.reduce((s,t)=>s+t.cups,0);
    const report = { date:today, tableReports, castReports, totalCups };
    if (shopId) await DB.saveDailyReport(shopId, report);
    setReportSaved(true);
    setTimeout(()=>setReportSaved(false), 3000);
  }

  // 集計用
  const tableMap = {};
  [...batches, ...services].forEach(o => {
    const k = String(o.tableId);
    if (!tableMap[k]) tableMap[k] = { tableLabel: o.tableLabel, batches:[], services:[] };
    if (o.batchId) tableMap[k].batches.push(o);
    else tableMap[k].services.push(o);
  });

  const totalPending = pendingBatches.length + pendingServices.length;

  return (
    <div style={S.screen}>
      <Header
        left={
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20, color:C.gold }}>♛</span>
            <span style={{ fontSize:15, fontWeight:900, letterSpacing:"0.1em", color:C.gold }}>ADMIN</span>
            {totalPending > 0 && (
              <span style={{ background:C.goldDim, border:`1px solid ${C.gold}`, color:C.gold, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:700 }}>
                待機 {totalPending}件
              </span>
            )}
          </div>
        }
        right={
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {[{k:"kitchen",l:"🍹 ドリンク場"},{k:"stats",l:"📊 集計"}].map(t => (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                padding:"5px 14px", borderRadius:20, fontSize:13, fontWeight:700,
                border:`1px solid ${tab===t.k ? C.gold : C.border}`,
                background: tab===t.k ? C.goldDim : "transparent",
                color: tab===t.k ? C.gold : C.textDim, cursor:"pointer",
              }}>{t.l}</button>
            ))}
            {onReport && (
              <button onClick={onReport} style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:700, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer" }}>
                📈 履歴
              </button>
            )}
            {onSettings && (
              <button onClick={onSettings} style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:700, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer" }}>
                ⚙️ 設定
              </button>
            )}
            <button onClick={saveReport} style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:700, border:`1px solid ${reportSaved ? C.green : C.goldBorder}`, background: reportSaved ? C.greenDim : "transparent", color: reportSaved ? C.green : C.gold, cursor:"pointer" }}>
              {reportSaved ? "✓ 保存済" : "💾 保存"}
            </button>
            <ExitBtn onClick={onExit} />
          </div>
        }
      />

      <div style={{ flex:1, padding:"16px 14px 40px", maxWidth:960, margin:"0 auto", width:"100%", overflowY:"auto" }}>

        {/* ── キッチン ── */}
        {tab === "kitchen" && (
          <div>
            {/* サービス待ち */}
            {pendingServices.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <SLabel>✨ サービス待ち — {pendingServices.length}件</SLabel>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:10 }}>
                  {pendingServices.map(s => (
                    <ServiceCard key={s.id} svc={s} onDone={() => Store.doneService(s.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* ドリンク注文バッチ（待機） */}
            <SLabel>🍹 ドリンク待ち — {pendingBatches.length}件</SLabel>
            {pendingBatches.length === 0
              ? <EmptyState>待機中のドリンク注文はありません</EmptyState>
              : (
                <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:28 }}>
                  {pendingBatches.map(batch => (
                    <BatchCard key={batch.batchId} batch={batch} onDone={() => Store.doneBatch(batch.batchId)} />
                  ))}
                </div>
              )
            }

            {/* 提供済み */}
            {(doneBatches.length > 0 || doneServices.length > 0) && (
              <div>
                <SLabel>✓ 提供済み</SLabel>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {[...doneBatches.map(b=>({...b,_type:"batch"})), ...doneServices.map(s=>({...s,_type:"service"}))]
                    .sort((a,b) => (a.time < b.time ? 1 : -1))
                    .map(item =>
                      item._type === "batch"
                        ? <BatchCard key={item.batchId} batch={item} done />
                        : <ServiceCard key={item.id} svc={item} done />
                    )
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 集計 ── */}
        {tab === "stats" && (
          <div>
            {Object.keys(tableMap).length === 0
              ? <EmptyState>まだ注文がありません</EmptyState>
              : Object.entries(tableMap)
                  .sort((a,b) => TABLES.findIndex(t=>String(t.id)===a[0]) - TABLES.findIndex(t=>String(t.id)===b[0]))
                  .map(([tid, d]) => (
                    <TableStats key={tid} data={d} onReset={() => setResetTarget(tid)} />
                  ))
            }
          </div>
        )}
      </div>

      {/* リセット確認 */}
      {resetTarget && (
        <Overlay onClick={() => setResetTarget(null)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:800, color:C.gold, marginBottom:10 }}>会計・リセット確認</div>
            <div style={{ fontSize:14, color:C.text, marginBottom:6 }}>
              {tableMap[resetTarget]?.tableLabel} の全データをリセットします。
            </div>
            <div style={{ fontSize:13, color:C.red, fontWeight:700, marginBottom:20 }}>この操作は元に戻せません。</div>
            <div style={{ display:"flex", gap:10 }}>
              <CancelBtn onClick={() => setResetTarget(null)}>キャンセル</CancelBtn>
              <button onClick={() => { Store.resetTable(resetTarget); setResetTarget(null); }} style={{
                flex:2, padding:"14px", borderRadius:14, border:"none",
                background:"linear-gradient(135deg,#f05050,#c03030)",
                color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer",
              }}>
                リセット実行
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// ── バッチカード（1回の注文まとめ） ──────────────────────────
function BatchCard({ batch, onDone, done }) {
  return (
    <div style={{
      background: done ? "rgba(255,255,255,0.015)" : C.goldDim,
      border: `1px solid ${done ? C.border : C.goldBorder}`,
      borderRadius: 18,
      padding: "16px 18px",
      opacity: done ? 0.45 : 1,
      transition: "opacity 0.3s",
    }}>
      {/* ヘッダー行 */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
        <div style={{ fontSize:18, fontWeight:900, color: done ? C.textDim : C.gold }}>{batch.tableLabel}</div>
        <div style={{ fontSize:12, color:C.textDim }}>{batch.time}</div>
        <div style={{ marginLeft:"auto", fontSize:12, color: done ? C.green : C.gold, fontWeight:700 }}>
          {done ? "✓ 提供済み" : `${batch.items.length}点`}
        </div>
      </div>

      {/* アイテムリスト */}
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom: done ? 0 : 14 }}>
        {batch.items.map(item => (
          <div key={item.id} style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"8px 10px", borderRadius:10,
            background: done ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.2)",
          }}>
            <span style={{ fontSize:20 }}>{item.emoji}</span>
            <span style={{ fontWeight:700, fontSize:13, width:56, flexShrink:0, color: item.isGuest ? C.purple : C.pink }}>
              {item.isGuest ? "ゲスト" : item.castName}
            </span>
            <span style={{ flex:1, fontSize:14, color:C.text }}>
              {item.drinkName}{item.nonAlco ? " ❤️" : ""}
            </span>
            {(item.qty||1) > 1 && (
              <span style={{ fontSize:12, color:C.textDim, flexShrink:0 }}>×{item.qty}</span>
            )}
          </div>
        ))}
      </div>

      {/* 提供済みボタン */}
      {!done && onDone && (
        <button onClick={onDone} style={{
          width:"100%", padding:"12px", borderRadius:12, cursor:"pointer",
          background:"rgba(62,207,142,0.14)", border:`1px solid ${C.green}`,
          color:C.green, fontSize:14, fontWeight:800,
        }}>
          ✓ まとめて提供済み
        </button>
      )}
    </div>
  );
}

// ── サービスカード ────────────────────────────────────────────
function ServiceCard({ svc, onDone, done }) {
  return (
    <div style={{
      background: done ? "rgba(255,255,255,0.015)" : C.tealDim,
      border: `1px solid ${done ? C.border : C.tealBorder}`,
      borderRadius: 14, padding:"14px", opacity: done ? 0.4 : 1,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: done ? 0 : 10 }}>
        <span style={{ fontSize:28 }}>{svc.emoji}</span>
        <div>
          <div style={{ fontSize:13, fontWeight:900, color: done ? C.textDim : C.teal }}>{svc.tableLabel}</div>
          <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{svc.name}</div>
          <div style={{ fontSize:11, color:C.textDim }}>{svc.time}</div>
        </div>
      </div>
      {!done && onDone && (
        <button onClick={onDone} style={{
          width:"100%", padding:"9px", borderRadius:10, cursor:"pointer",
          background:"rgba(78,205,196,0.14)", border:`1px solid ${C.teal}`,
          color:C.teal, fontSize:13, fontWeight:700,
        }}>
          対応済み ✓
        </button>
      )}
      {done && <div style={{ fontSize:12, color:C.green, fontWeight:700 }}>✓ 完了</div>}
    </div>
  );
}

// ── テーブル集計 ──────────────────────────────────────────────
function TableStats({ data, onReset }) {
  // キャスト別集計（ゲストドリンクは除外）
  const castMap = {};
  data.batches.forEach(b => {
    b.items.forEach(item => {
      if (item.noCount || item.isGuest || !item.castName) return;
      if (!castMap[item.castName]) castMap[item.castName] = { cups: 0, revenue: 0, items: [] };
      const q = item.qty || 1;
      const price = item.price || 0;
      castMap[item.castName].cups    += q;
      castMap[item.castName].revenue += price * q;
      castMap[item.castName].items.push(item);
    });
  });
  const castEntries = Object.entries(castMap).sort((a,b) => b[1].revenue - a[1].revenue);
  const tableTotal  = castEntries.reduce((s,[,v]) => s + v.revenue, 0);
  const maxRev      = Math.max(...castEntries.map(([,v]) => v.revenue), 1);

  // キャストドリンク明細のみ（ゲスト除外）
  const castItems = data.batches.flatMap(b =>
    b.items
      .filter(i => !i.noCount && !i.isGuest && i.castName)
      .map(i => ({ ...i, batchStatus: b.status }))
  );

  return (
    <div style={{ background:C.bgCard, border:`1px solid ${C.goldBorder}`, borderRadius:18, padding:"20px 18px", marginBottom:16 }}>

      {/* ヘッダー */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ fontSize:22, fontWeight:900, color:C.gold }}>{data.tableLabel}</div>
        <div style={{ fontSize:12, color:C.textDim }}>注文 {data.batches.length}回</div>
        {/* 卓合計 */}
        <div style={{ marginLeft:"auto", textAlign:"right" }}>
          <div style={{ fontSize:11, color:C.textDim }}>卓合計売上</div>
          <div style={{ fontSize:22, fontWeight:900, color:C.gold }}>
            ¥{tableTotal.toLocaleString()}
          </div>
        </div>
      </div>

      {/* キャスト別売上バー */}
      {castEntries.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, color:C.textDim, marginBottom:10, letterSpacing:"0.05em" }}>▍キャスト別売上</div>
          {castEntries.map(([name, v]) => (
            <div key={name} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}` }}>
              <span style={{ width:60, fontSize:13, fontWeight:700, color:C.pink, flexShrink:0 }}>{name}</span>
              <div style={{ flex:1 }}>
                {/* 売上バー */}
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                  <div style={{ flex:1, height:7, background:"rgba(255,255,255,0.07)", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(v.revenue/maxRev)*100}%`, background:`linear-gradient(90deg,${C.gold},${C.pink})`, borderRadius:4 }} />
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:C.gold, width:80, textAlign:"right" }}>
                    ¥{v.revenue.toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize:11, color:C.textDim }}>{v.cups}杯</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* キャストドリンク明細（ゲスト除外）*/}
      {castItems.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, color:C.textDim, marginBottom:8 }}>▍注文明細（キャストドリンクのみ）</div>
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {castItems.map((item,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, padding:"5px 8px", background:"rgba(255,255,255,0.02)", borderRadius:8 }}>
                <span style={{ fontSize:15 }}>{item.emoji}</span>
                <span style={{ color:C.pink, fontWeight:700, width:52, flexShrink:0 }}>{item.castName}</span>
                <span style={{ flex:1 }}>{item.drinkName}{item.nonAlco ? " ❤️" : ""}</span>
                <span style={{ color:C.textDim, flexShrink:0 }}>×{item.qty||1}</span>
                <span style={{ color:C.gold, fontWeight:700, width:68, textAlign:"right", flexShrink:0 }}>
                  ¥{((item.price||0)*(item.qty||1)).toLocaleString()}
                </span>
                <span style={{ fontSize:10, color:item.batchStatus==="done"?C.green:C.gold, fontWeight:700, marginLeft:2, flexShrink:0 }}>
                  {item.batchStatus==="done"?"✓":"待"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* サービス */}
      {data.services.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, color:C.textDim, marginBottom:6 }}>▍サービス</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {data.services.map(s => (
              <span key={s.id} style={{ padding:"3px 10px", borderRadius:8, fontSize:12, fontWeight:600, border:`1px solid ${C.tealBorder}`, background:C.tealDim, color:C.teal }}>
                {s.emoji} {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* リセット */}
      <button onClick={onReset} style={{
        width:"100%", marginTop:8, padding:"10px", borderRadius:12, fontSize:13, fontWeight:700,
        border:`1px solid ${C.red}`, background:C.redDim, color:C.red, cursor:"pointer",
      }}>
        💴 会計リセット
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// 共通コンポーネント
// ══════════════════════════════════════════════════════════════
function QtyCtrl({ qty, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
      <button onClick={() => onChange(q => Math.max(1,q-1))} style={qbs}>−</button>
      <span style={{ fontSize:26, fontWeight:900, color:C.gold, minWidth:28, textAlign:"center" }}>{qty}</span>
      <button onClick={() => onChange(q => q+1)} style={qbs}>＋</button>
    </div>
  );
}
const qbs = { width:40, height:40, borderRadius:"50%", border:`1px solid ${C.gold}`, background:"transparent", color:C.gold, fontSize:22, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" };

function Header({ left, right }) {
  return (
    <header style={{ position:"sticky", top:0, zIndex:100, background:"rgba(8,5,15,0.95)", backdropFilter:"blur(14px)", borderBottom:`1px solid ${C.goldBorder}`, padding:"0 16px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>{left}</div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>{right}</div>
    </header>
  );
}
function TableBadge({ label }) {
  return <div style={{ background:C.goldDim, border:`1px solid ${C.gold}`, color:C.gold, padding:"4px 12px", borderRadius:20, fontSize:14, fontWeight:800, flexShrink:0 }}>{label}</div>;
}
function ExitBtn({ onClick }) {
  return <button onClick={onClick} style={{ padding:"5px 14px", borderRadius:20, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer", fontSize:12 }}>EXIT</button>;
}
function BigBtn({ children, color, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ width:"100%", padding:"15px", background:disabled?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${color},${color}bb)`, border:"none", borderRadius:14, color:disabled?C.textDim:"#0a0618", fontSize:16, fontWeight:800, cursor:disabled?"default":"pointer", opacity:disabled?0.45:1 }}>
      {children}
    </button>
  );
}
function CancelBtn({ children, onClick }) {
  return <button onClick={onClick} style={{ flex:1, padding:"14px", borderRadius:14, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, fontSize:14, cursor:"pointer" }}>{children}</button>;
}
function SLabel({ children }) {
  return <div style={{ fontSize:13, fontWeight:700, color:C.gold, marginBottom:10, letterSpacing:"0.04em" }}>{children}</div>;
}
function EmptyState({ children }) {
  return <div style={{ textAlign:"center", color:C.textDim, fontSize:14, padding:"40px 0" }}>{children}</div>;
}
function Overlay({ children, onClick }) {
  return <div onClick={onClick} style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(8,5,15,0.9)", backdropFilter:"blur(6px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>{children}</div>;
}
function Notif({ msg }) {
  return <div style={{ position:"fixed", top:66, left:"50%", transform:"translateX(-50%)", background:C.gold, color:"#0a0618", padding:"10px 24px", borderRadius:24, fontWeight:800, fontSize:14, zIndex:999, boxShadow:`0 4px 24px rgba(232,184,75,0.4)`, whiteSpace:"nowrap", pointerEvents:"none" }}>{msg}</div>;
}
function Centered({ children }) {
  return <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>{children}</div>;
}

const S = {
  screen:    { position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column" },
  body:      { flex:1, padding:"16px 14px 120px", maxWidth:640, margin:"0 auto", width:"100%", overflowY:"auto" },
  setupCard: { background:C.bgCard, border:`1px solid ${C.goldBorder}`, borderRadius:24, padding:"36px 28px", maxWidth:440, width:"100%" },
  statusBar: { display:"flex", alignItems:"center", background:C.bgCard, border:`1px solid ${C.goldBorder}`, borderRadius:16, padding:"14px 16px", marginBottom:16 },
  cartRow:   { display:"flex", alignItems:"center", gap:8, padding:"10px 12px", borderRadius:12, background:C.bgCard, border:`1px solid ${C.border}` },
  cartCast:  { width:52, fontSize:13, fontWeight:700, flexShrink:0 },
  trash:     { background:"none", border:"none", color:"rgba(240,80,80,0.6)", cursor:"pointer", fontSize:14, padding:"0 2px", flexShrink:0 },
  backBtn:   { padding:"5px 14px", borderRadius:20, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer", fontSize:13 },
  orderPanel:{ background:C.bgCard, border:`1px solid ${C.goldBorder}`, borderRadius:18, padding:"18px 16px" },
  modal:     { background:"#100820", border:`1px solid ${C.goldBorder}`, borderRadius:"22px 22px 0 0", padding:"28px 22px 48px", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" },
};
