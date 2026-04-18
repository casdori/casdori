import { useState, useEffect } from "react";

// ══════════════════════════════════════════════════════════════
// インメモリDB（デモ用 / 本番はFirebase版src/App.jsxを使用）
// ══════════════════════════════════════════════════════════════
const _mem = { shops:{}, settings:{}, reports:{}, batches:{}, services:{}, listeners:{} };
const DB = {
  loadShopSettings: async (id) => _mem.settings[id] || null,
  saveShopSettings: async (id, s) => { _mem.settings[id] = JSON.parse(JSON.stringify(s)); },
  saveDailyReport:  async (id, r) => { if(!_mem.reports[id]) _mem.reports[id]={}; _mem.reports[id][r.date]=r; },
  getReportIndex:   async (id) => Object.keys(_mem.reports[id]||{}).sort().reverse(),
  loadDailyReport:  async (id, d) => (_mem.reports[id]||{})[d]||null,
  loadShops:        async () => Object.values(_mem.shops),
  saveShop:         async (s) => { _mem.shops[s.shopId]=s; },
  addBatch: async (shopId, batch) => {
    if(!_mem.batches[shopId]) _mem.batches[shopId]={};
    _mem.batches[shopId][batch.batchId]=batch;
    _notify(shopId);
  },
  updateBatchStatus: async (shopId, batchId, status) => {
    if(_mem.batches[shopId]?.[batchId]) _mem.batches[shopId][batchId].status=status;
    _notify(shopId);
  },
  addService: async (shopId, svc) => {
    if(!_mem.services[shopId]) _mem.services[shopId]={};
    _mem.services[shopId][svc.id]=svc;
    _notify(shopId);
  },
  updateServiceStatus: async (shopId, svcId, status) => {
    if(_mem.services[shopId]?.[svcId]) _mem.services[shopId][svcId].status=status;
    _notify(shopId);
  },
  resetTable: async (shopId, tableId) => {
    Object.entries(_mem.batches[shopId]||{}).forEach(([k,v])=>{ if(String(v.tableId)===String(tableId)) delete _mem.batches[shopId][k]; });
    Object.entries(_mem.services[shopId]||{}).forEach(([k,v])=>{ if(String(v.tableId)===String(tableId)) delete _mem.services[shopId][k]; });
    _notify(shopId);
  },
  subscribe: (shopId, cb) => {
    if(!_mem.listeners[shopId]) _mem.listeners[shopId]=[];
    _mem.listeners[shopId].push(cb);
    cb({ batches:Object.values(_mem.batches[shopId]||{}), services:Object.values(_mem.services[shopId]||{}) });
    return () => { _mem.listeners[shopId]=(_mem.listeners[shopId]||[]).filter(f=>f!==cb); };
  },
};
function _notify(shopId) {
  const cbs = _mem.listeners[shopId]||[];
  const batches  = Object.values(_mem.batches[shopId]||{}).sort((a,b)=>b.time>a.time?1:-1);
  const services = Object.values(_mem.services[shopId]||{}).sort((a,b)=>b.time>a.time?1:-1);
  cbs.forEach(cb=>cb({batches,services}));
}

function uid() { return Math.random().toString(36).slice(2,9); }
function nowShort() { return new Date().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}); }

function defaultSettings(shopId, shopName) {
  return {
    shopId, shopName, pin:"0000", adminPin:"0000",
    tables:[
      {id:1,label:"1番"},{id:2,label:"2番"},{id:3,label:"3番"},
      {id:4,label:"4番"},{id:5,label:"5番"},{id:6,label:"6番"},
      {id:"vipA",label:"VIP(A)"},{id:"vipB",label:"VIP(B)"},
    ],
    castList:["あゆ","ここあ","すずか","さよこ","しおり","なつ","まほ","ひなた","ゆり","マーリー","なな"],
    baseLiquors:[
      {id:"jogo",name:"じょうご",emoji:"🥃"},{id:"sato",name:"里の曙",emoji:"🍶"},
      {id:"rento",name:"れんと",emoji:"🍶"},{id:"kuro",name:"黒伊佐錦",emoji:"🍶"},
      {id:"whisky",name:"ウイスキー",emoji:"🥃"},{id:"marrika",name:"茉莉花",emoji:"🌸"},
    ],
    castDrinks:[
      {id:"highball",name:"ハイボール",price:1000,emoji:"🥃"},
      {id:"lemon",name:"レモンサワー",price:1000,emoji:"🍋"},
      {id:"beer",name:"ビール",price:1000,emoji:"🍺"},
      {id:"orange",name:"オレンジジュース",price:1000,emoji:"🍊"},
      {id:"cola",name:"コーラ",price:1000,emoji:"🥤"},
      {id:"coffee",name:"コーヒー",price:1000,emoji:"☕"},
      {id:"tequila",name:"テキーラ（ショット）",price:2000,emoji:"🥃",special:true},
      {id:"habu",name:"ハブ酒（ショット）",price:2000,emoji:"🐍",special:true},
      {id:"champagne",name:"シャンパングラス",price:2000,emoji:"🍾",special:true},
      {id:"wine",name:"グラスワイン",price:2000,emoji:"🍷",special:true},
      {id:"habu_k",name:"ハブ酒観覧車",price:27000,emoji:"🎡",special:true},
      {id:"tequila_k",name:"テキーラ観覧車",price:25000,emoji:"🎡",special:true},
    ],
  };
}

const SPLIT_TYPES = [
  {id:"mizu",name:"水割り",emoji:"💧"},{id:"soda",name:"ソーダ割り",emoji:"🫧"},
  {id:"oyu",name:"お湯割り",emoji:"♨️"},{id:"rock",name:"ロック",emoji:"🧊"},
  {id:"ryoku",name:"緑茶割り",emoji:"🍵"},{id:"sanpin",name:"さんぴん割り",emoji:"🫖"},
  {id:"oolong",name:"ウーロン割り",emoji:"🍵"},{id:"muto",name:"無糖紅茶割り",emoji:"🍵"},
];
const GUEST_BASE = [
  {id:"g_jogo",name:"じょうご",emoji:"🥃"},{id:"g_rento",name:"れんと",emoji:"🍶"},
  {id:"g_sato",name:"里の曙",emoji:"🍶"},{id:"g_marrika",name:"茉莉花",emoji:"🌸"},
  {id:"g_kuro",name:"黒伊佐錦",emoji:"🍶"},
];
const GUEST_SINGLE = [
  {id:"gb",name:"ビール",emoji:"🍺"},{id:"gl",name:"レモンサワー",emoji:"🍋"},
  {id:"gh",name:"ハイボール",emoji:"🥃"},{id:"gc",name:"コーラ",emoji:"🥤"},
  {id:"go",name:"オレンジジュース",emoji:"🍊"},{id:"gcf",name:"コーヒー",emoji:"☕"},
];
const GUEST_PITCHER = [
  {id:"gpr",name:"緑茶ピッチャー",emoji:"🍵"},{id:"gpu",name:"ウーロンピッチャー",emoji:"🍵"},
  {id:"gps",name:"さんぴん茶ピッチャー",emoji:"🫖"},{id:"gpm",name:"無糖紅茶ピッチャー",emoji:"🍵"},
  {id:"gpo",name:"オレンジピッチャー",emoji:"🍊"},{id:"gpc",name:"コーラピッチャー",emoji:"🥤"},
];
const SERVICES = [
  {id:"ice",name:"アイス（氷）",emoji:"🧊"},{id:"ash",name:"灰皿",emoji:"🪣"},
  {id:"oshi",name:"おしぼり",emoji:"🧻"},{id:"gomi",name:"ゴミ回収",emoji:"🗑️"},
];

const C = {
  bg:"#08050f", bgCard:"rgba(255,255,255,0.04)",
  gold:"#e8b84b", goldDim:"rgba(232,184,75,0.15)", goldBorder:"rgba(232,184,75,0.35)",
  pink:"#f06dab", pinkDim:"rgba(240,109,171,0.15)", pinkBorder:"rgba(240,109,171,0.4)",
  red:"#f05050",  redDim:"rgba(240,80,80,0.15)",
  green:"#3ecf8e", greenDim:"rgba(62,207,142,0.14)",
  purple:"#9b59f5", purpleDim:"rgba(155,89,245,0.14)", purpleBorder:"rgba(155,89,245,0.4)",
  teal:"#4ecdc4", tealDim:"rgba(78,205,196,0.14)", tealBorder:"rgba(78,205,196,0.4)",
  text:"#ede8f8", textDim:"#7a6a8a", border:"rgba(255,255,255,0.08)",
};

// ══════════════════════════════════════════════════════════════
// URLパラメーター解析
// ?shop=SHOPID&role=cast  → キャスト端末として直接起動
// ?shop=SHOPID&role=admin → 管理画面として直接起動
// パラメーターなし        → ランディング（入り口）
// ══════════════════════════════════════════════════════════════
function getUrlParams() {
  try {
    const p = new URLSearchParams(window.location.search);
    return { shop: p.get("shop"), role: p.get("role") };
  } catch { return {}; }
}

const DEMO_ID = "DEMO001";

export default function App() {
  const { shop, role } = getUrlParams();

  // URLパラメーターで起動画面を決定
  const initScreen = () => {
    if (shop && role === "cast")  return "cast";
    if (shop && role === "admin") return "admin";
    return "landing";
  };

  const [screen, setScreen]     = useState(initScreen);
  const [shopId, setShopId]     = useState(shop || DEMO_ID);
  const [settings, setSettings] = useState(() => defaultSettings(shop || DEMO_ID, "CASDORIデモ店"));
  const [loaded, setLoaded]     = useState(!shop); // URLパラメーターがある場合は設定を読み込む

  // URLパラメーターで起動した場合、Firebaseから設定を読み込む
  useEffect(() => {
    if (!shop) return;
    DB.loadShopSettings(shop).then(s => {
      if (s) setSettings(s);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:C.gold, fontSize:18, fontWeight:700 }}>読み込み中...</div>
    </div>
  );

  const bg = (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(155,89,245,0.09) 0%,transparent 70%)", top:-200, left:-150 }} />
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(232,184,75,0.07) 0%,transparent 70%)", bottom:-100, right:-80 }} />
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'Noto Sans JP',sans-serif", color:C.text }}>
      {bg}
      {screen==="landing"  && <Landing  onSelect={setScreen} shopName={settings.shopName} adminPin={settings.adminPin} />}
      {screen==="cast"     && <CastTerminal  onExit={()=>setScreen("landing")} settings={settings} shopId={shopId} />}
      {screen==="admin"    && <AdminPanel    onExit={()=>setScreen("landing")} onSettings={()=>setScreen("settings")} onReport={()=>setScreen("report")} settings={settings} shopId={shopId} />}
      {screen==="settings" && <SettingsPanel settings={settings} shopId={shopId} onSave={s=>setSettings(s)} onExit={()=>setScreen("landing")} />}
      {screen==="report"   && <DailyReportPanel shopId={shopId} onExit={()=>setScreen("admin")} />}
    </div>
  );
}

function Landing({ onSelect, shopName, adminPin }) {
  const [pinModal, setPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  function tryAdmin() {
    if (!adminPin || adminPin === "") {
      // PINが未設定なら直接入る
      onSelect("admin");
      return;
    }
    setPinInput("");
    setPinError(false);
    setPinModal(true);
  }

  function submitPin() {
    if (pinInput === adminPin) {
      setPinModal(false);
      onSelect("admin");
    } else {
      setPinError(true);
      setPinInput("");
      setTimeout(() => setPinError(false), 2000);
    }
  }

  return (
    <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:28, padding:"32px 24px" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ padding:"20px 32px", background:"rgba(232,184,75,0.08)", borderRadius:16, boxShadow:"0 0 60px rgba(232,184,75,0.15)" }}>
          <div style={{ fontSize:42, fontWeight:900, letterSpacing:"0.12em", color:C.gold, fontFamily:"Georgia,serif" }}>CASDORI</div>
          <div style={{ fontSize:12, color:"#b8842a", letterSpacing:"0.2em", marginTop:4 }}>キャスト ドリンク管理</div>
        </div>
        <div style={{ fontSize:13, color:C.textDim, marginTop:10 }}>{shopName}</div>
      </div>
      <div style={{ width:200, height:1, background:"linear-gradient(90deg,transparent,rgba(232,184,75,0.35),transparent)" }} />
      <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%", maxWidth:380 }}>
        {/* キャスト端末：そのまま入れる */}
        <button onClick={()=>onSelect("cast")} style={{ background:C.bgCard, border:"1px solid rgba(232,184,75,0.35)", borderRadius:20, padding:"22px 24px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:32 }}>💗</span>
          <div><div style={{ fontSize:17, fontWeight:700, color:C.pink, marginBottom:4 }}>キャスト端末</div><div style={{ fontSize:12, color:C.textDim }}>ドリンク注文</div></div>
          <span style={{ marginLeft:"auto", fontSize:20, color:C.pink }}>→</span>
        </button>
        {/* 管理画面：PIN認証あり */}
        <button onClick={tryAdmin} style={{ background:C.bgCard, border:"1px solid rgba(232,184,75,0.35)", borderRadius:20, padding:"22px 24px", cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:32 }}>👑</span>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:C.gold, marginBottom:4 }}>管理・ドリンク場</div>
            <div style={{ fontSize:12, color:C.textDim }}>注文集計・管理 🔒</div>
          </div>
          <span style={{ marginLeft:"auto", fontSize:20, color:C.gold }}>→</span>
        </button>
      </div>

      {/* PIN入力モーダル */}
      {pinModal && (
        <div onClick={()=>setPinModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:360, background:"#130b28", borderRadius:24, padding:28 }}>
            <div style={{ textAlign:"center", marginBottom:24 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🔐</div>
              <div style={{ fontSize:18, fontWeight:800, color:C.gold }}>管理者PIN</div>
              <div style={{ fontSize:13, color:C.textDim, marginTop:4 }}>PINを入力してください</div>
            </div>
            <input
              value={pinInput}
              onChange={e=>setPinInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&submitPin()}
              type="password"
              placeholder="••••"
              autoFocus
              style={{ width:"100%", padding:"16px", borderRadius:14, fontSize:24, textAlign:"center", letterSpacing:"0.3em", boxSizing:"border-box", border:`2px solid ${pinError?C.red:C.goldBorder}`, background:"rgba(255,255,255,0.07)", color:"#ede8f8", outline:"none", marginBottom:12 }}
            />
            {pinError && <div style={{ textAlign:"center", color:C.red, fontSize:14, fontWeight:700, marginBottom:12 }}>PINが違います</div>}
            {/* テンキー */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
              {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((n,i)=>(
                <button key={i} onClick={()=>{
                  if(n==="⌫") setPinInput(p=>p.slice(0,-1));
                  else if(n!=="") setPinInput(p=>p+String(n));
                }} style={{ padding:"18px", borderRadius:14, border:`1px solid ${C.border}`, background:n==="⌫"?C.redDim:C.bgCard, color:n==="⌫"?C.red:C.text, fontSize:20, fontWeight:700, cursor:n===""?"default":"pointer", opacity:n===""?0:1 }}>
                  {n}
                </button>
              ))}
            </div>
            <button onClick={submitPin} style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", background:C.gold, color:"#0a0618", fontWeight:800, fontSize:16, cursor:"pointer" }}>
              入室する →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CastTerminal({ onExit, settings, shopId }) {
  const [phase, setPhase]           = useState("tableSetup");
  const [tableId, setTableId]       = useState(null);
  const [activeCast, setActiveCast] = useState(null);
  const [isGuest, setIsGuest]       = useState(false);
  const [selBase, setSelBase]       = useState(null);
  const [selSplit, setSelSplit]     = useState(null);
  const [selDrink, setSelDrink]     = useState(null);
  const [splitModal, setSplitModal] = useState(false);
  const [nonAlco, setNonAlco]       = useState(false);
  const [qty, setQty]               = useState(1);
  const [qtyModal, setQtyModal]     = useState(false);
  const [cart, setCart]             = useState([]);
  const [notif, setNotif]           = useState(null);
  const [confirm, setConfirm]       = useState(false);
  const [guestTab, setGuestTab]     = useState("base");

  const tables   = settings?.tables      || [];
  const casts    = settings?.castList    || [];
  const bases    = settings?.baseLiquors || [];
  const drinks   = settings?.castDrinks  || [];
  const tInfo    = tables.find(t=>t.id===tableId);

  const resolved = (() => {
    if (selBase && selSplit) {
      const bl = isGuest ? GUEST_BASE : bases;
      const b = bl.find(x=>x.id===selBase);
      const s = SPLIT_TYPES.find(x=>x.id===selSplit);
      if (!b||!s) return null;
      return { name:`${b.name} ${s.name}`, emoji:b.emoji, price:isGuest?0:1000 };
    }
    if (selDrink) {
      if (isGuest) return [...GUEST_SINGLE,...GUEST_PITCHER].find(d=>d.id===selDrink)||null;
      return drinks.find(d=>d.id===selDrink)||null;
    }
    return null;
  })();

  function flash(m) { setNotif(m); setTimeout(()=>setNotif(null),2500); }
  function goToDrink(name, guest) {
    setActiveCast(guest?null:name); setIsGuest(guest);
    setSelDrink(null); setSelBase(null); setSelSplit(null); setSplitModal(false); setPhase("drink");
  }
  function tapBase(id) {
    if(selBase===id){setSelBase(null);setSelSplit(null);}else{setSelBase(id);setSelSplit(null);setSplitModal(true);}
    setSelDrink(null);
  }
  function tapDrink(id) { setSelDrink(id); setSelBase(null); setSelSplit(null); setSplitModal(false); setQty(1); setQtyModal(true); }
  function addCart() {
    if(!resolved) return;
    setCart(p=>[...p,{id:uid(),castName:isGuest?null:activeCast,isGuest,drinkName:resolved.name,emoji:resolved.emoji,price:isGuest?0:resolved.price,qty,nonAlco,noCount:isGuest,special:resolved.special||false}]);
    flash(`${isGuest?"ゲスト":activeCast} → ${resolved.name} ×${qty} 追加`);
    setQtyModal(false); setSelDrink(null); setSelBase(null); setSelSplit(null); setSplitModal(false); setNonAlco(false); setQty(1);
  }
  function sendSvc(svc) { DB.addService(shopId,{id:uid(),tableId,tableLabel:tInfo?.label,...svc,time:nowShort(),status:"pending"}); flash(`${svc.name} 送信`); }
  function submit() {
    DB.addBatch(shopId,{batchId:uid(),tableId,tableLabel:tInfo?.label,time:nowShort(),status:"pending",items:[...cart]});
    flash(`${cart.length}件 送信 ✓`); setCart([]); setConfirm(false); setPhase("castSelect");
  }

  if (phase==="tableSetup") return (
    <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:32, color:C.gold }}>♛</div>
          <div style={{ fontSize:18, fontWeight:900, color:C.gold }}>CAST TERMINAL</div>
          <div style={{ fontSize:13, color:C.textDim, marginTop:8 }}>テーブル番号を選択</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
          {tables.filter(t=>typeof t.id==="number").map(t=>(
            <button key={t.id} onClick={()=>setTableId(t.id)} style={{ padding:"18px 8px", borderRadius:14, fontSize:20, fontWeight:800, border:`2px solid ${tableId===t.id?C.gold:C.border}`, background:tableId===t.id?C.goldDim:C.bgCard, color:tableId===t.id?C.gold:C.textDim, cursor:"pointer" }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10, marginBottom:24 }}>
          {tables.filter(t=>typeof t.id==="string").map(t=>(
            <button key={t.id} onClick={()=>setTableId(t.id)} style={{ padding:"16px 8px", borderRadius:14, fontSize:15, fontWeight:800, border:`2px solid ${tableId===t.id?C.gold:C.border}`, background:tableId===t.id?C.goldDim:C.bgCard, color:tableId===t.id?C.gold:C.textDim, cursor:"pointer" }}>{t.label}</button>
          ))}
        </div>
        <button disabled={!tableId} onClick={()=>setPhase("castSelect")} style={{ width:"100%", padding:"16px", borderRadius:16, border:"none", background:tableId?C.gold:"rgba(255,255,255,0.1)", color:tableId?"#0a0618":C.textDim, fontWeight:800, fontSize:16, cursor:tableId?"pointer":"not-allowed" }}>
          {tableId?`${tInfo?.label} で開始 →`:"テーブルを選択してください"}
        </button>
        <button onClick={onExit} style={{ width:"100%", marginTop:10, padding:"12px", borderRadius:14, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer", fontSize:14 }}>← 戻る</button>
      </div>
    </div>
  );

  if (phase==="castSelect") return (
    <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:`1px solid ${C.border}`, background:"rgba(8,5,15,0.95)", gap:10 }}>
        <div style={{ padding:"4px 12px", background:C.goldDim, border:`1px solid ${C.goldBorder}`, borderRadius:20, fontSize:14, fontWeight:800, color:C.gold }}>{tInfo?.label}</div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          {cart.length>0 && <button onClick={()=>setConfirm(true)} style={{ padding:"6px 14px", borderRadius:14, border:"none", background:C.green, color:"#0a0618", fontWeight:800, cursor:"pointer", fontSize:13 }}>送信 {cart.length}件</button>}
          <button onClick={onExit} style={{ padding:"6px 12px", borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer", fontSize:13 }}>終了</button>
        </div>
      </div>
      {notif && <div style={{ margin:"10px 16px", padding:"10px 14px", background:C.greenDim, border:`1px solid ${C.green}`, borderRadius:12, color:C.green, fontSize:14, fontWeight:700 }}>{notif}</div>}
      <div style={{ padding:"16px", overflowY:"auto", flex:1 }}>
        <div style={{ fontSize:12, color:C.teal, fontWeight:700, marginBottom:8 }}>✨ サービス</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 }}>
          {SERVICES.map(svc=>(
            <button key={svc.id} onClick={()=>sendSvc(svc)} style={{ padding:"12px 4px", borderRadius:12, border:`1px solid ${C.tealBorder}`, background:C.tealDim, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:22 }}>{svc.emoji}</span>
              <span style={{ fontSize:10, fontWeight:700, color:C.teal }}>{svc.name}</span>
            </button>
          ))}
        </div>
        {cart.length>0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, color:C.gold, fontWeight:700, marginBottom:8 }}>🛒 カート（{cart.length}件）</div>
            {cart.map(item=>(
              <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:C.bgCard, borderRadius:10, marginBottom:6 }}>
                <span style={{ fontSize:16 }}>{item.emoji}</span>
                <span style={{ fontSize:13, fontWeight:700, color:item.isGuest?C.purple:C.pink, width:50, flexShrink:0 }}>{item.isGuest?"ゲスト":item.castName}</span>
                <span style={{ flex:1, fontSize:13 }}>{item.drinkName}{item.nonAlco?" ❤️":""}</span>
                <span style={{ fontSize:12, color:C.textDim }}>×{item.qty}</span>
                <button onClick={()=>setCart(p=>p.filter(i=>i.id!==item.id))} style={{ background:"transparent", border:"none", color:C.red, cursor:"pointer", fontSize:16 }}>✕</button>
              </div>
            ))}
            <button onClick={()=>setConfirm(true)} style={{ width:"100%", padding:"12px", borderRadius:14, border:"none", background:C.green, color:"#0a0618", fontWeight:800, cursor:"pointer", fontSize:14, marginTop:8 }}>まとめて送信（{cart.length}件）→</button>
          </div>
        )}
        <div style={{ fontSize:12, color:C.pink, fontWeight:700, marginBottom:8 }}>💗 キャスト選択</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:12 }}>
          {casts.map(name=>{
            const cnt = cart.filter(i=>i.castName===name).length;
            return (
              <button key={name} onClick={()=>goToDrink(name,false)} style={{ padding:"14px 6px", borderRadius:14, cursor:"pointer", border:`1px solid ${cnt>0?C.pink:C.border}`, background:cnt>0?C.pinkDim:C.bgCard, display:"flex", flexDirection:"column", alignItems:"center", gap:4, position:"relative" }}>
                <span style={{ fontSize:20 }}>💗</span>
                <span style={{ fontSize:13, fontWeight:700, color:cnt>0?C.pink:C.text }}>{name}</span>
                {cnt>0 && <span style={{ position:"absolute", top:4, right:6, fontSize:11, color:C.pink, fontWeight:800 }}>{cnt}</span>}
              </button>
            );
          })}
        </div>
        {(()=>{const cnt=cart.filter(i=>i.isGuest).length; return (
          <button onClick={()=>goToDrink(null,true)} style={{ width:"100%", padding:"14px 20px", borderRadius:14, cursor:"pointer", border:`1px solid ${cnt>0?C.purple:C.border}`, background:cnt>0?C.purpleDim:C.bgCard, display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:24 }}>🥂</span>
            <span style={{ fontSize:15, fontWeight:700, color:cnt>0?C.purple:C.text }}>ゲスト注文</span>
            {cnt>0 && <span style={{ marginLeft:"auto", fontSize:13, color:C.purple, fontWeight:800 }}>{cnt}件</span>}
          </button>
        );})()}
      </div>
      {confirm && (
        <div onClick={()=>setConfirm(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:480, background:"#130b28", borderRadius:"24px 24px 0 0", padding:24 }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.gold, marginBottom:16 }}>注文確認 - {tInfo?.label}</div>
            <div style={{ maxHeight:"40vh", overflowY:"auto", marginBottom:16 }}>
              {cart.map(item=>(
                <div key={item.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:C.goldDim, borderRadius:10, marginBottom:6 }}>
                  <span>{item.emoji}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:item.isGuest?C.purple:C.pink, width:50 }}>{item.isGuest?"ゲスト":item.castName}</span>
                  <span style={{ flex:1, fontSize:13 }}>{item.drinkName}</span>
                  <span style={{ fontSize:12, color:C.textDim }}>×{item.qty}</span>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setConfirm(false)} style={{ flex:1, padding:"14px", borderRadius:14, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer", fontSize:15 }}>戻る</button>
              <button onClick={submit} style={{ flex:2, padding:"14px", borderRadius:14, border:"none", background:C.green, color:"#0a0618", fontWeight:800, cursor:"pointer", fontSize:15 }}>送信する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const acol = isGuest ? C.purple : C.pink;
  const bl2  = isGuest ? GUEST_BASE : bases;
  return (
    <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", padding:"14px 16px", borderBottom:`1px solid ${C.border}`, background:"rgba(8,5,15,0.95)", gap:10 }}>
        <button onClick={()=>setPhase("castSelect")} style={{ padding:"6px 12px", borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer", fontSize:13 }}>← 戻る</button>
        <div style={{ flex:1, fontWeight:800, color:acol, fontSize:15 }}>{isGuest?"🥂 ゲストドリンク":`💗 ${activeCast}`}</div>
      </div>
      <div style={{ flex:1, padding:"16px", overflowY:"auto" }}>
        {isGuest && (
          <div style={{ display:"flex", gap:8, marginBottom:16 }}>
            {["base","single","pitcher"].map(t=>(
              <button key={t} onClick={()=>setGuestTab(t)} style={{ flex:1, padding:"8px", borderRadius:10, border:`1px solid ${guestTab===t?C.purple:C.border}`, background:guestTab===t?C.purpleDim:"transparent", color:guestTab===t?C.purple:C.textDim, cursor:"pointer", fontSize:13, fontWeight:700 }}>
                {t==="base"?"ベース酒":t==="single"?"ドリンク":"ピッチャー"}
              </button>
            ))}
          </div>
        )}
        {(!isGuest || guestTab==="base") && (
          <>
            {!isGuest && <div style={{ fontSize:12, color:C.textDim, marginBottom:8 }}>🍶 ベース酒</div>}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
              {bl2.map(b=>{
                const a = selBase===b.id;
                return (
                  <button key={b.id} onClick={()=>tapBase(b.id)} style={{ padding:"14px 6px", borderRadius:14, cursor:"pointer", border:`2px solid ${a?C.gold:C.border}`, background:a?C.goldDim:C.bgCard, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span style={{ fontSize:26 }}>{b.emoji}</span>
                    <span style={{ fontSize:12, fontWeight:a?700:400, color:a?C.gold:C.text, textAlign:"center" }}>{b.name}</span>
                    {a && selSplit && <span style={{ fontSize:10, color:C.gold }}>{SPLIT_TYPES.find(s=>s.id===selSplit)?.name}</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
        {(!isGuest || guestTab==="single") && (
          <>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:8 }}>🍹 {isGuest?"ドリンク":"その他ドリンク"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
              {(isGuest?GUEST_SINGLE:drinks).map(d=>{
                const a = selDrink===d.id;
                const sp = !isGuest && d.special;
                return (
                  <button key={d.id} onClick={()=>tapDrink(d.id)} style={{ padding:"12px 6px", borderRadius:14, cursor:"pointer", border:`2px solid ${a?(sp?C.red:C.gold):(sp?"rgba(240,80,80,0.35)":C.border)}`, background:a?(sp?C.redDim:C.goldDim):(sp?"rgba(240,80,80,0.06)":C.bgCard), display:"flex", flexDirection:"column", alignItems:"center", gap:4, position:"relative" }}>
                    {sp && <span style={{ position:"absolute", top:3, right:3, fontSize:9, fontWeight:800, color:C.red }}>¥{d.price?.toLocaleString()}</span>}
                    <span style={{ fontSize:22 }}>{d.emoji}</span>
                    <span style={{ fontSize:11, fontWeight:a?700:400, color:a?(sp?C.red:C.gold):(sp?C.red:C.text), textAlign:"center", lineHeight:1.3 }}>{d.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
        {isGuest && guestTab==="pitcher" && (
          <>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:8 }}>🍵 ピッチャー</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
              {GUEST_PITCHER.map(d=>{
                const a = selDrink===d.id;
                return (
                  <button key={d.id} onClick={()=>tapDrink(d.id)} style={{ padding:"14px 8px", borderRadius:14, cursor:"pointer", border:`2px solid ${a?C.purple:C.border}`, background:a?C.purpleDim:C.bgCard, display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:22 }}>{d.emoji}</span>
                    <span style={{ fontSize:13, fontWeight:a?700:400, color:a?C.purple:C.text }}>{d.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, background:"rgba(8,5,15,0.95)" }}>
        <div style={{ textAlign:"center", color:C.textDim, fontSize:14 }}>👆 ドリンクをタップして数量を選択</div>
      </div>
      {/* 数量モーダル */}
      {qtyModal && resolved && (
        <div onClick={()=>setQtyModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:480, background:"#130b28", borderRadius:"24px 24px 0 0", padding:24 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:36, marginBottom:6 }}>{resolved.emoji}</div>
              <div style={{ fontSize:18, fontWeight:800, color:C.gold, marginBottom:4 }}>{resolved.name}</div>
              {!isGuest && <div style={{ fontSize:14, color:C.textDim }}>¥{(resolved.price||0).toLocaleString()} × {qty} = ¥{((resolved.price||0)*qty).toLocaleString()}</div>}
            </div>
            <button onClick={()=>setNonAlco(n=>!n)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderRadius:14, border:`1px solid ${nonAlco?C.pink:C.border}`, background:nonAlco?C.pinkDim:"transparent", cursor:"pointer", marginBottom:16 }}>
              <span style={{ fontSize:15, color:nonAlco?C.pink:C.textDim, fontWeight:700 }}>❤️ ノンアル</span>
              <div style={{ width:44, height:26, borderRadius:13, background:nonAlco?C.pink:"rgba(255,255,255,0.15)", position:"relative", transition:"background 0.2s" }}>
                <div style={{ position:"absolute", top:3, left:nonAlco?20:3, width:20, height:20, borderRadius:"50%", background:"#fff", transition:"left 0.2s" }} />
              </div>
            </button>
            <div style={{ fontSize:13, color:C.textDim, fontWeight:700, marginBottom:12, textAlign:"center" }}>数量を選択</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8, marginBottom:16 }}>
              {[1,2,3,4,5].map(n=>(
                <button key={n} onClick={()=>setQty(n)} style={{ padding:"16px 0", borderRadius:14, border:`2px solid ${qty===n?C.gold:C.border}`, background:qty===n?C.goldDim:C.bgCard, color:qty===n?C.gold:C.text, fontWeight:qty===n?900:400, fontSize:20, cursor:"pointer" }}>{n}</button>
              ))}
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20, justifyContent:"center" }}>
              <button onClick={()=>setQty(q=>Math.max(1,q-1))} style={{ width:44, height:44, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.bgCard, color:C.text, cursor:"pointer", fontSize:22 }}>-</button>
              <span style={{ color:C.gold, fontWeight:900, fontSize:28, minWidth:40, textAlign:"center" }}>{qty}</span>
              <button onClick={()=>setQty(q=>q+1)} style={{ width:44, height:44, borderRadius:"50%", border:`1px solid ${C.border}`, background:C.bgCard, color:C.text, cursor:"pointer", fontSize:22 }}>+</button>
            </div>
            <button onClick={addCart} style={{ width:"100%", padding:"16px", borderRadius:16, border:"none", background:`linear-gradient(135deg,${isGuest?C.purple:C.pink},${isGuest?C.purple:C.pink}bb)`, color:"#0a0618", fontSize:16, fontWeight:900, cursor:"pointer" }}>
              カートに追加 ×{qty} →
            </button>
          </div>
        </div>
      )}
      {/* 割り方モーダル */}
      {splitModal && selBase && (
        <div onClick={()=>setSplitModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:480, background:"#130b28", borderRadius:"24px 24px 0 0", padding:24 }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ fontSize:13, color:C.textDim, marginBottom:4 }}>選択中のベース酒</div>
              <div style={{ fontSize:20, fontWeight:900, color:C.gold }}>
                {bl2.find(b=>b.id===selBase)?.emoji} {bl2.find(b=>b.id===selBase)?.name}
              </div>
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:C.text, marginBottom:14, textAlign:"center" }}>割り方を選択</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
              {SPLIT_TYPES.map(s=>(
                <button key={s.id} onClick={()=>{setSelSplit(s.id);setSplitModal(false);setQty(1);setQtyModal(true);}} style={{ padding:"18px 10px", borderRadius:16, cursor:"pointer", border:`2px solid ${selSplit===s.id?C.gold:"rgba(255,255,255,0.12)"}`, background:selSplit===s.id?C.goldDim:"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:30 }}>{s.emoji}</span>
                  <span style={{ fontSize:17, fontWeight:700, color:selSplit===s.id?C.gold:C.text }}>{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPanel({ onExit, onSettings, onReport, settings, shopId }) {
  const [data, setData]             = useState({ batches:[], services:[] });
  const [tab, setTab]               = useState("kitchen");
  const [detailCast, setDetailCast] = useState(null);
  const [statsTab, setStatsTab]     = useState("cast");

  useEffect(()=>DB.subscribe(shopId, setData), [shopId]);
  const { batches, services } = data;
  const pending  = batches.filter(b=>b.status==="pending");
  const done     = batches.filter(b=>b.status==="done");
  const pendSvc  = services.filter(s=>s.status==="pending");

  const castMap = {};
  let totalSales=0, totalCups=0;
  batches.forEach(b=>b.items.forEach(item=>{
    if(item.noCount||item.isGuest||!item.castName) return;
    if(!castMap[item.castName]) castMap[item.castName]={name:item.castName,revenue:0,cups:0,drinks:{}};
    const rev=(item.price||0)*(item.qty||1);
    castMap[item.castName].revenue+=rev; castMap[item.castName].cups+=(item.qty||1);
    totalSales+=rev; totalCups+=(item.qty||1);
    const dk=item.drinkName+(item.nonAlco?" ❤️":"");
    if(!castMap[item.castName].drinks[dk]) castMap[item.castName].drinks[dk]={name:dk,emoji:item.emoji||"🍹",qty:0,total:0,price:item.price||0};
    castMap[item.castName].drinks[dk].qty+=(item.qty||1);
    castMap[item.castName].drinks[dk].total+=rev;
  }));
  const casts  = Object.values(castMap).sort((a,b)=>b.revenue-a.revenue);
  const maxRev = casts.length>0?casts[0].revenue:1;
  const detail = detailCast?casts.find(c=>c.name===detailCast):null;

  // リアルタイム自動保存
  useEffect(() => {
    if (batches.length === 0) return;
    const today = new Date().toISOString().slice(0,10);
    const tMap = {};
    batches.forEach(b => {
      const k = String(b.tableId);
      if (!tMap[k]) tMap[k] = { tableLabel:b.tableLabel, total:0, cups:0 };
      b.items.forEach(item => { if(!item.noCount){ tMap[k].total+=(item.price||0)*(item.qty||1); tMap[k].cups+=(item.qty||1); } });
    });
    const cMap2 = {};
    batches.forEach(b => b.items.forEach(item => {
      if (item.noCount || !item.castName) return;
      if (!cMap2[item.castName]) cMap2[item.castName] = { castName:item.castName, revenue:0, cups:0, items:[] };
      cMap2[item.castName].revenue += (item.price||0)*(item.qty||1);
      cMap2[item.castName].cups    += (item.qty||1);
      cMap2[item.castName].items.push({ drinkName:item.drinkName, emoji:item.emoji||"🍹", price:item.price||0, qty:item.qty||1, nonAlco:item.nonAlco||false });
    }));
    DB.saveDailyReport(shopId, { date:today, tableReports:Object.values(tMap), castReports:Object.values(cMap2), totalCups });
  }, [batches]);

  return (
    <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", padding:"12px 16px", borderBottom:`1px solid ${C.border}`, background:"rgba(8,5,15,0.95)", gap:8, flexWrap:"wrap" }}>
        <span style={{ fontSize:16, color:C.gold }}>♛</span>
        <span style={{ fontSize:13, fontWeight:900, color:C.gold }}>ADMIN</span>
        {[{k:"kitchen",l:"🍹 ドリンク場"},{k:"stats",l:"📊 集計"}].map(t=>(
          <button key={t.k} onClick={()=>{setTab(t.k);setDetailCast(null);}} style={{ padding:"5px 12px", borderRadius:16, fontSize:13, fontWeight:700, border:`1px solid ${tab===t.k?C.gold:C.border}`, background:tab===t.k?C.goldDim:"transparent", color:tab===t.k?C.gold:C.textDim, cursor:"pointer" }}>{t.l}</button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", gap:6 }}>
          {onReport && <button onClick={onReport} style={{ padding:"5px 10px", borderRadius:14, fontSize:12, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer" }}>📈 履歴</button>}
          {onSettings && <button onClick={onSettings} style={{ padding:"5px 10px", borderRadius:14, fontSize:12, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer" }}>⚙️</button>}
          <button onClick={onExit} style={{ padding:"5px 10px", borderRadius:14, fontSize:12, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer" }}>終了</button>
        </div>
      </div>
      <div style={{ flex:1, padding:"16px", overflowY:"auto" }}>
        {tab==="kitchen" && (
          <div>
            {pendSvc.length>0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, color:C.teal, fontWeight:700, marginBottom:8 }}>✨ サービス待ち（{pendSvc.length}件）</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                  {pendSvc.map(s=>(
                    <div key={s.id} style={{ padding:"12px", background:C.tealDim, border:`1px solid ${C.tealBorder}`, borderRadius:14 }}>
                      <div style={{ fontSize:12, color:C.textDim, marginBottom:2 }}>{s.tableLabel}</div>
                      <div style={{ fontSize:14, fontWeight:700, color:C.teal, marginBottom:8 }}>{s.emoji} {s.name}</div>
                      <button onClick={()=>DB.updateServiceStatus(shopId,s.id,"done")} style={{ width:"100%", padding:"8px", borderRadius:10, border:"none", background:C.teal, color:"#0a0618", fontWeight:700, cursor:"pointer", fontSize:13 }}>✓ 対応済み</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ fontSize:12, color:C.gold, fontWeight:700, marginBottom:8 }}>🍹 ドリンク待ち（{pending.length}件）</div>
            {pending.length===0 ? <div style={{ textAlign:"center", padding:"40px", color:C.textDim, fontSize:14 }}>待機中のオーダーはありません</div> : (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {pending.map(batch=>(
                  <div key={batch.batchId} style={{ background:C.bgCard, border:`1px solid ${C.goldBorder}`, borderRadius:16, overflow:"hidden" }}>
                    <div style={{ display:"flex", alignItems:"center", padding:"10px 14px", background:C.goldDim, gap:8 }}>
                      <span style={{ fontWeight:800, color:C.gold }}>{batch.tableLabel}</span>
                      <span style={{ fontSize:12, color:C.textDim }}>{batch.time}</span>
                      <button onClick={()=>DB.updateBatchStatus(shopId,batch.batchId,"done")} style={{ marginLeft:"auto", padding:"6px 14px", borderRadius:10, border:"none", background:C.green, color:"#0a0618", fontWeight:700, cursor:"pointer", fontSize:13 }}>✓ 提供済み</button>
                    </div>
                    {batch.items.map((item,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderTop:i>0?`1px solid ${C.border}`:"none" }}>
                        <span style={{ fontSize:16 }}>{item.emoji}</span>
                        <span style={{ fontSize:13, fontWeight:700, color:item.isGuest?C.purple:C.pink, width:50, flexShrink:0 }}>{item.isGuest?"ゲスト":item.castName}</span>
                        <span style={{ flex:1, fontSize:13 }}>{item.drinkName}{item.nonAlco?" ❤️":""}</span>
                        <span style={{ fontSize:12, color:C.textDim }}>×{item.qty}</span>
                        {!item.noCount && <span style={{ fontSize:12, color:C.gold }}>¥{((item.price||0)*(item.qty||1)).toLocaleString()}</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {done.length>0 && (
              <div style={{ marginTop:20 }}>
                <div style={{ fontSize:12, color:C.textDim, fontWeight:700, marginBottom:8 }}>✓ 提供済み</div>
                {done.slice(0,5).map(b=>(
                  <div key={b.batchId} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:C.bgCard, borderRadius:10, marginBottom:6, opacity:0.6 }}>
                    <span style={{ fontSize:13, color:C.textDim }}>{b.tableLabel}</span>
                    <span style={{ fontSize:12, color:C.textDim, flex:1 }}>{b.items.map(i=>i.drinkName).join("・")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {tab==="stats" && !detailCast && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              <div style={{ padding:"16px", background:C.goldDim, border:`1px solid ${C.goldBorder}`, borderRadius:16, textAlign:"center" }}>
                <div style={{ fontSize:11, color:C.textDim, marginBottom:4 }}>本日の売上</div>
                <div style={{ fontSize:24, fontWeight:900, color:C.gold }}>¥{totalSales.toLocaleString()}</div>
              </div>
              <div style={{ padding:"16px", background:C.pinkDim, border:`1px solid ${C.pinkBorder}`, borderRadius:16, textAlign:"center" }}>
                <div style={{ fontSize:11, color:C.textDim, marginBottom:4 }}>本日の杯数</div>
                <div style={{ fontSize:24, fontWeight:900, color:C.pink }}>{totalCups}杯</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {[["cast","💗 キャスト別"],["table","🍽️ 卓別"]].map(([k,l])=>(
                <button key={k} onClick={()=>setStatsTab(k)} style={{ flex:1, padding:"10px", borderRadius:14, border:`1px solid ${statsTab===k?C.gold:C.border}`, background:statsTab===k?C.goldDim:"transparent", color:statsTab===k?C.gold:C.textDim, fontWeight:700, fontSize:14, cursor:"pointer" }}>{l}</button>
              ))}
            </div>
            {statsTab==="cast" && (
              <div>
                {casts.length===0 ? <div style={{ textAlign:"center", padding:"40px", color:C.textDim }}>まだデータがありません</div> : casts.map((c,i)=>(
                  <button key={i} onClick={()=>setDetailCast(c.name)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"14px", background:C.bgCard, borderRadius:14, marginBottom:8, border:`1px solid ${C.border}`, cursor:"pointer", textAlign:"left" }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0, background:i===0?C.gold:i===1?"#aaa":i===2?"#cd7f32":C.bgCard, border:i>2?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:i<=2?"#0a0618":C.textDim }}>{i+1}</div>
                    <div style={{ width:60, fontSize:14, fontWeight:700, color:C.pink, flexShrink:0 }}>{c.name}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden", marginBottom:4 }}>
                        <div style={{ height:"100%", width:`${(c.revenue/maxRev)*100}%`, background:`linear-gradient(90deg,${C.gold},${C.pink})`, borderRadius:3 }} />
                      </div>
                      <div style={{ fontSize:11, color:C.textDim }}>{c.cups}杯</div>
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontSize:15, fontWeight:900, color:C.gold }}>¥{c.revenue.toLocaleString()}</div>
                      <div style={{ fontSize:10, color:C.textDim }}>→ 詳細</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {statsTab==="table" && (
              <div>
                {(()=>{
                  const tMap2={};
                  batches.forEach(b=>{
                    const k=String(b.tableId);
                    if(!tMap2[k]) tMap2[k]={label:b.tableLabel,total:0,cups:0};
                    b.items.forEach(item=>{ if(!item.noCount){tMap2[k].total+=(item.price||0)*(item.qty||1);tMap2[k].cups+=(item.qty||1);} });
                  });
                  const tables2=Object.values(tMap2).sort((a,b)=>b.total-a.total);
                  const maxT=tables2.length>0?tables2[0].total:1;
                  return tables2.length===0?<div style={{ textAlign:"center", padding:"40px", color:C.textDim }}>まだデータがありません</div>:tables2.map((t,i)=>(
                    <div key={i} style={{ padding:"14px", background:C.bgCard, borderRadius:14, marginBottom:8, border:`1px solid ${C.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                        <span style={{ fontSize:16, fontWeight:800, color:C.gold }}>{t.label}</span>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:16, fontWeight:900, color:C.gold }}>¥{t.total.toLocaleString()}</div>
                          <div style={{ fontSize:11, color:C.textDim }}>{t.cups}杯</div>
                        </div>
                      </div>
                      <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${(t.total/maxT)*100}%`, background:`linear-gradient(90deg,${C.gold},${C.pink})`, borderRadius:3 }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}
        {tab==="stats" && detailCast && detail && (
          <div>
            <button onClick={()=>setDetailCast(null)} style={{ marginBottom:16, padding:"8px 16px", borderRadius:12, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer", fontSize:13 }}>← 戻る</button>
            <div style={{ padding:"20px", background:C.pinkDim, border:`1px solid ${C.pinkBorder}`, borderRadius:18, marginBottom:20, textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:900, color:C.pink, marginBottom:8 }}>{detailCast}</div>
              <div style={{ display:"flex", justifyContent:"center", gap:32 }}>
                <div><div style={{ fontSize:11, color:C.textDim }}>売上</div><div style={{ fontSize:26, fontWeight:900, color:C.gold }}>¥{detail.revenue.toLocaleString()}</div></div>
                <div><div style={{ fontSize:11, color:C.textDim }}>杯数</div><div style={{ fontSize:26, fontWeight:900, color:C.pink }}>{detail.cups}杯</div></div>
              </div>
            </div>
            <div style={{ fontSize:12, color:C.textDim, fontWeight:700, marginBottom:10 }}>🍹 ドリンク別内訳</div>
            {Object.values(detail.drinks).sort((a,b)=>b.total-a.total).map((d,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:C.bgCard, borderRadius:12, marginBottom:8, border:`1px solid ${C.border}` }}>
                <span style={{ fontSize:20 }}>{d.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:C.text }}>{d.name}</div>
                  <div style={{ fontSize:12, color:C.textDim }}>¥{d.price.toLocaleString()} × {d.qty}杯</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:15, fontWeight:900, color:C.gold }}>¥{d.total.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:C.textDim }}>{d.qty}杯</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ settings, shopId, onSave, onExit }) {
  const [tab, setTab] = useState("cast");
  const [s, setS]     = useState(()=>JSON.parse(JSON.stringify(settings)));

  // 変更時にDBへ自動保存（画面遷移なし）
  useEffect(() => { DB.saveShopSettings(shopId, s); onSave(s); }, [JSON.stringify(s)]);

  return (
    <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px", borderBottom:`1px solid ${C.border}`, background:"rgba(8,5,15,0.95)" }}>
        <button onClick={onExit} style={{ padding:"6px 12px", borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer", fontSize:13 }}>← 戻る</button>
        <div style={{ flex:1, fontSize:16, fontWeight:800, color:C.gold }}>⚙️ 店舗設定</div>
        <div style={{ fontSize:11, color:C.green, display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:C.green, display:"inline-block" }} />
          自動保存
        </div>
      </div>
      <div style={{ display:"flex", gap:6, padding:"10px 14px", overflowX:"auto" }}>
        {[["cast","👗 キャスト"],["table","🍽️ テーブル"],["menu","🍹 メニュー"],["pin","🔐 PIN"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ padding:"8px 12px", borderRadius:16, fontSize:13, fontWeight:700, flexShrink:0, border:`1px solid ${tab===k?C.gold:C.border}`, background:tab===k?C.goldDim:"transparent", color:tab===k?C.gold:C.textDim, cursor:"pointer" }}>{l}</button>
        ))}
      </div>
      <div style={{ flex:1, padding:"16px", overflowY:"auto" }}>
        {tab==="cast" && (
          <div>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:12 }}>{s.castList.length}名登録中</div>
            {s.castList.map((name,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"center" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:C.pinkDim, border:`1px solid ${C.pinkBorder}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:C.pink, flexShrink:0 }}>{i+1}</div>
                <input value={name} onChange={e=>{const cl=[...s.castList];cl[i]=e.target.value;setS({...s,castList:cl});}}
                  style={{ flex:1, padding:"10px 14px", borderRadius:12, fontSize:15, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"#ede8f8", outline:"none" }} />
                <button onClick={()=>setS({...s,castList:s.castList.filter((_,j)=>j!==i)})}
                  style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${C.red}`, background:C.redDim, color:C.red, cursor:"pointer", flexShrink:0 }}>✕</button>
              </div>
            ))}
            <button onClick={()=>setS({...s,castList:[...s.castList,""]})}
              style={{ width:"100%", padding:"12px", borderRadius:12, border:`1px dashed ${C.pink}`, background:"transparent", color:C.pink, cursor:"pointer", fontSize:14, marginTop:4 }}>＋ キャスト追加</button>
          </div>
        )}
        {tab==="table" && (
          <div>
            <div style={{ fontSize:12, color:C.textDim, marginBottom:8 }}>テーブル設定</div>
            {s.tables.map((t,i)=>(
              <div key={i} style={{ display:"flex", gap:8, marginBottom:8 }}>
                <input value={t.label} onChange={e=>{const ts=[...s.tables];ts[i]={...t,label:e.target.value};setS({...s,tables:ts});}} style={{ flex:1, padding:"10px 14px", borderRadius:12, fontSize:14, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"#ede8f8", outline:"none" }} />
                <button onClick={()=>setS({...s,tables:s.tables.filter((_,j)=>j!==i)})} style={{ padding:"10px 14px", borderRadius:10, border:`1px solid ${C.red}`, background:C.redDim, color:C.red, cursor:"pointer" }}>✕</button>
              </div>
            ))}
            <button onClick={()=>setS({...s,tables:[...s.tables,{id:`t${uid()}`,label:`${s.tables.length+1}番`}]})} style={{ width:"100%", padding:"12px", borderRadius:12, border:`1px dashed ${C.gold}`, background:"transparent", color:C.gold, cursor:"pointer", fontSize:14 }}>＋ テーブル追加</button>
          </div>
        )}
        {tab==="menu" && (
          <div>
            <div style={{ fontSize:13, color:C.gold, fontWeight:700, marginBottom:8 }}>🍹 キャストドリンク</div>
            {s.castDrinks.map((d,i)=>(
              <div key={i} style={{ display:"flex", gap:6, marginBottom:8, alignItems:"center" }}>
                <input value={d.emoji} onChange={e=>{const m=[...s.castDrinks];m[i]={...d,emoji:e.target.value};setS({...s,castDrinks:m});}} style={{ width:46, padding:"8px", borderRadius:10, fontSize:18, textAlign:"center", border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"#ede8f8", outline:"none" }} />
                <input value={d.name} onChange={e=>{const m=[...s.castDrinks];m[i]={...d,name:e.target.value};setS({...s,castDrinks:m});}} style={{ flex:1, padding:"8px 12px", borderRadius:10, fontSize:13, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"#ede8f8", outline:"none" }} />
                <input value={d.price} type="number" onChange={e=>{const m=[...s.castDrinks];m[i]={...d,price:Number(e.target.value)};setS({...s,castDrinks:m});}} style={{ width:80, padding:"8px", borderRadius:10, fontSize:13, border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"#ede8f8", outline:"none" }} />
                <button onClick={()=>setS({...s,castDrinks:s.castDrinks.filter((_,j)=>j!==i)})} style={{ padding:"8px 12px", borderRadius:10, border:`1px solid ${C.red}`, background:C.redDim, color:C.red, cursor:"pointer" }}>✕</button>
              </div>
            ))}
            <button onClick={()=>setS({...s,castDrinks:[...s.castDrinks,{id:`d${uid()}`,name:"新しいドリンク",price:1000,emoji:"🍹"}]})} style={{ width:"100%", padding:"10px", borderRadius:12, border:`1px dashed ${C.gold}`, background:"transparent", color:C.gold, cursor:"pointer", fontSize:13 }}>＋ 追加</button>
          </div>
        )}
        {tab==="pin" && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ padding:"16px", background:C.bgCard, borderRadius:14, border:`1px solid ${C.border}` }}>
              <div style={{ fontSize:12, color:C.textDim, marginBottom:4 }}>店舗コード</div>
              <div style={{ fontSize:18, fontWeight:900, color:C.gold }}>{shopId}</div>
            </div>
            {/* URL案内 */}
            <div style={{ padding:"16px", background:"rgba(62,207,142,0.08)", borderRadius:14, border:`1px solid ${C.green}` }}>
              <div style={{ fontSize:12, color:C.green, fontWeight:700, marginBottom:8 }}>📱 ログイン不要URL</div>
              <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>以下のURLをホーム画面に追加するとログイン不要になります</div>
              <div style={{ padding:"8px 12px", background:"rgba(0,0,0,0.3)", borderRadius:8, fontSize:11, color:C.green, wordBreak:"break-all", marginBottom:4 }}>
                ?shop={shopId}&role=cast
              </div>
              <div style={{ fontSize:11, color:C.textDim, marginBottom:8 }}>↑ キャスト用（スタッフに共有）</div>
              <div style={{ padding:"8px 12px", background:"rgba(0,0,0,0.3)", borderRadius:8, fontSize:11, color:C.gold, wordBreak:"break-all", marginBottom:4 }}>
                ?shop={shopId}&role=admin
              </div>
              <div style={{ fontSize:11, color:C.textDim }}>↑ 管理者用（オーナー・店長のみ）</div>
            </div>
            <div style={{ padding:"14px", background:"rgba(232,184,75,0.08)", borderRadius:14, border:`1px solid ${C.goldBorder}`, marginBottom:8 }}>
              <div style={{ fontSize:12, color:C.gold, fontWeight:700, marginBottom:4 }}>🔐 管理者PIN（初期値: 0000）</div>
              <div style={{ fontSize:12, color:C.textDim }}>ランディング画面で管理者ページに入るときに使います</div>
            </div>
            {[["adminPin","管理者PIN（ランディング画面の認証）"],["pin","スタッフPIN（将来用）"],["shopName","店舗名"]].map(([key,label])=>(
              <div key={key}>
                <div style={{ fontSize:12, color:C.textDim, marginBottom:6 }}>{label}</div>
                <input value={s[key]} onChange={e=>setS({...s,[key]:e.target.value})}
                  style={{ width:"100%", padding:"14px 16px", borderRadius:14, fontSize:15, boxSizing:"border-box", border:"1px solid rgba(255,255,255,0.15)", background:"rgba(255,255,255,0.07)", color:"#ede8f8", outline:"none" }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DailyReportPanel({ shopId, onExit }) {
  const today = new Date().toISOString().slice(0,10);
  const [dates, setDates]     = useState([]);
  const [selDate, setSelDate] = useState(today);
  const [report, setReport]   = useState(null);
  const [detail, setDetail]   = useState(null);

  useEffect(()=>{
    DB.getReportIndex(shopId).then(idx=>{ setDates(idx); if(idx.length>0){setSelDate(idx[0]);DB.loadDailyReport(shopId,idx[0]).then(setReport);} });
  },[shopId]);

  function selDay(d) { setSelDate(d); setDetail(null); DB.loadDailyReport(shopId,d).then(setReport); }

  const total = report?report.tableReports.reduce((s,t)=>s+t.total,0):0;
  const cups  = report?(report.castReports||[]).reduce((s,c)=>s+c.cups,0):0;
  const maxR  = report?Math.max(...(report.castReports||[]).map(c=>c.revenue),1):1;
  const dData = detail&&report?(report.castReports||[]).find(c=>c.castName===detail):null;

  return (
    <div style={{ position:"relative", zIndex:1, minHeight:"100vh", display:"flex", flexDirection:"column" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px", borderBottom:`1px solid ${C.border}`, background:"rgba(8,5,15,0.95)" }}>
        <button onClick={detail?()=>setDetail(null):onExit} style={{ padding:"6px 12px", borderRadius:10, border:`1px solid ${C.border}`, background:"transparent", color:C.textDim, cursor:"pointer", fontSize:13 }}>← 戻る</button>
        <div style={{ fontSize:16, fontWeight:800, color:C.gold }}>📊 {detail?`${detail} の詳細`:"日次レポート"}</div>
      </div>
      <div style={{ flex:1, padding:"16px", overflowY:"auto" }}>
        {dates.length>0 ? (
          <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:20, paddingBottom:4 }}>
            {dates.map(d=>(
              <button key={d} onClick={()=>selDay(d)} style={{ padding:"8px 14px", borderRadius:16, fontSize:13, fontWeight:700, whiteSpace:"nowrap", flexShrink:0, border:`1px solid ${selDate===d?C.gold:C.border}`, background:selDate===d?C.goldDim:"transparent", color:selDate===d?C.gold:C.textDim, cursor:"pointer" }}>{d}</button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"60px 20px", color:C.textDim }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📭</div>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>レポートはまだありません</div>
            <div style={{ fontSize:13 }}>注文が送信されると自動で記録されます</div>
          </div>
        )}
        {report && !detail && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
              <div style={{ padding:"16px", background:C.goldDim, border:`1px solid ${C.goldBorder}`, borderRadius:16, textAlign:"center" }}>
                <div style={{ fontSize:11, color:C.textDim, marginBottom:4 }}>総売上</div>
                <div style={{ fontSize:24, fontWeight:900, color:C.gold }}>¥{total.toLocaleString()}</div>
              </div>
              <div style={{ padding:"16px", background:C.pinkDim, border:`1px solid ${C.pinkBorder}`, borderRadius:16, textAlign:"center" }}>
                <div style={{ fontSize:11, color:C.textDim, marginBottom:4 }}>総杯数</div>
                <div style={{ fontSize:24, fontWeight:900, color:C.pink }}>{cups}杯</div>
              </div>
            </div>
            <div style={{ fontSize:12, color:C.textDim, fontWeight:700, marginBottom:10 }}>💗 キャスト別（タップで詳細）</div>
            {(report.castReports||[]).sort((a,b)=>b.revenue-a.revenue).map((c,i)=>(
              <button key={i} onClick={()=>setDetail(c.castName)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"14px", background:C.bgCard, borderRadius:14, marginBottom:8, border:`1px solid ${C.border}`, cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:26, height:26, borderRadius:"50%", flexShrink:0, background:i===0?C.gold:i===1?"#aaa":i===2?"#cd7f32":C.bgCard, border:i>2?`1px solid ${C.border}`:"none", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:i<=2?"#0a0618":C.textDim }}>{i+1}</div>
                <div style={{ width:60, fontSize:14, fontWeight:700, color:C.pink, flexShrink:0 }}>{c.castName}</div>
                <div style={{ flex:1 }}>
                  <div style={{ height:6, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden", marginBottom:4 }}>
                    <div style={{ height:"100%", width:`${(c.revenue/maxR)*100}%`, background:`linear-gradient(90deg,${C.gold},${C.pink})`, borderRadius:3 }} />
                  </div>
                  <div style={{ fontSize:11, color:C.textDim }}>{c.cups}杯</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:900, color:C.gold }}>¥{c.revenue.toLocaleString()}</div>
                  <div style={{ fontSize:10, color:C.textDim }}>→ 詳細</div>
                </div>
              </button>
            ))}
            <div style={{ fontSize:12, color:C.textDim, fontWeight:700, margin:"16px 0 10px" }}>🍽️ 卓別売上</div>
            {report.tableReports.map((t,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:C.bgCard, borderRadius:12, marginBottom:8, border:`1px solid ${C.border}` }}>
                <div style={{ fontWeight:800, color:C.gold, width:70, fontSize:13 }}>{t.tableLabel}</div>
                <div style={{ flex:1, height:6, background:"rgba(255,255,255,0.07)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${total>0?(t.total/total)*100:0}%`, background:`linear-gradient(90deg,${C.gold},${C.pink})`, borderRadius:3 }} />
                </div>
                <div style={{ fontWeight:800, color:C.gold, width:90, textAlign:"right", fontSize:14 }}>¥{t.total.toLocaleString()}</div>
              </div>
            ))}
          </>
        )}
        {report && detail && dData && (
          <>
            <div style={{ padding:"20px", background:C.pinkDim, border:`1px solid ${C.pinkBorder}`, borderRadius:18, marginBottom:20, textAlign:"center" }}>
              <div style={{ fontSize:20, fontWeight:900, color:C.pink, marginBottom:8 }}>{detail}</div>
              <div style={{ display:"flex", justifyContent:"center", gap:32 }}>
                <div><div style={{ fontSize:11, color:C.textDim }}>売上</div><div style={{ fontSize:26, fontWeight:900, color:C.gold }}>¥{dData.revenue.toLocaleString()}</div></div>
                <div><div style={{ fontSize:11, color:C.textDim }}>杯数</div><div style={{ fontSize:26, fontWeight:900, color:C.pink }}>{dData.cups}杯</div></div>
              </div>
            </div>
            <div style={{ fontSize:12, color:C.textDim, fontWeight:700, marginBottom:10 }}>🍹 ドリンク明細</div>
            {(()=>{
              const dm={};
              (dData.items||[]).forEach(item=>{ const k=item.drinkName+(item.nonAlco?" ❤️":""); if(!dm[k]) dm[k]={name:k,emoji:item.emoji,qty:0,total:0,price:item.price||0}; dm[k].qty+=(item.qty||1); dm[k].total+=(item.price||0)*(item.qty||1); });
              return Object.values(dm).sort((a,b)=>b.total-a.total).map((d,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:C.bgCard, borderRadius:12, marginBottom:8, border:`1px solid ${C.border}` }}>
                  <span style={{ fontSize:20 }}>{d.emoji}</span>
                  <div style={{ flex:1 }}><div style={{ fontSize:14, fontWeight:700, color:C.text }}>{d.name}</div><div style={{ fontSize:12, color:C.textDim }}>¥{d.price.toLocaleString()} × {d.qty}杯</div></div>
                  <div style={{ textAlign:"right" }}><div style={{ fontSize:15, fontWeight:900, color:C.gold }}>¥{d.total.toLocaleString()}</div><div style={{ fontSize:11, color:C.textDim }}>{d.qty}杯</div></div>
                </div>
              ));
            })()}
          </>
        )}
      </div>
    </div>
  );
}
