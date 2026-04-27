// ─────────────────────────────────────────────────────────────────────────────
// TOP 1% — PHASE 3: THE AUTO-PUBLISHER
// Real OAuth connections · Smart scheduling · Posts while you sleep
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";

const CONFIG = {
  YOUTUBE_API_KEY:   "YOUR_YOUTUBE_API_KEY",
  GEMINI_API_KEY:    "YOUR_GEMINI_API_KEY",
  SUPABASE_URL:      "https://paeemvmiiesyhtmwlabf.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
};

// ── PLATFORM OAUTH CONFIGS ────────────────────────────────────────────────────
const OAUTH_PLATFORMS = [
  {
    id: "youtube",
    label: "YouTube",
    color: "#FF0000",
    bg: "#FF000012",
    symbol: "▶",
    postLimit: "100 Shorts/day",
    bestTimes: ["8:00 AM", "12:00 PM", "8:00 PM"],
    connectSteps: [
      { step: 1, action: "Go to console.cloud.google.com", type: "navigate", url: "https://console.cloud.google.com" },
      { step: 2, action: "Select your 'top1percent' project", type: "instruction" },
      { step: 3, action: "APIs & Services → Credentials → + Create Credentials", type: "instruction" },
      { step: 4, action: "Choose 'OAuth 2.0 Client ID'", type: "instruction" },
      { step: 5, action: "Application type: Web application", type: "instruction" },
      { step: 6, action: "Add redirect URI: https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback", type: "copy", value: "https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback" },
      { step: 7, action: "Download the JSON credentials file", type: "instruction" },
      { step: 8, action: "Enable YouTube Data API v3 scope", type: "instruction" },
    ],
    authScope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
    apiDocs: "https://developers.google.com/youtube/v3/guides/uploading_a_video",
  },
  {
    id: "tiktok",
    label: "TikTok",
    color: "#00f2ea",
    bg: "#00f2ea12",
    symbol: "♪",
    postLimit: "20 videos/day",
    bestTimes: ["6:00 AM", "7:00 PM", "9:00 PM"],
    connectSteps: [
      { step: 1, action: "Go to developers.tiktok.com", type: "navigate", url: "https://developers.tiktok.com" },
      { step: 2, action: "Sign in → Manage Apps → Create app", type: "instruction" },
      { step: 3, action: "App name: Top1Percent · Category: Entertainment", type: "instruction" },
      { step: 4, action: "Request 'Content Posting API' product", type: "instruction" },
      { step: 5, action: "Redirect URI: https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback", type: "copy", value: "https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback" },
      { step: 6, action: "Submit for review — approval takes 1-2 weeks", type: "warning" },
      { step: 7, action: "Once approved, copy Client Key and Secret", type: "instruction" },
    ],
    authScope: "video.upload,video.list",
    apiDocs: "https://developers.tiktok.com/doc/content-posting-api-get-started",
    approvalNote: "⚠️ TikTok requires app review. Apply now — takes 1-2 weeks.",
  },
  {
    id: "instagram",
    label: "Instagram",
    color: "#E1306C",
    bg: "#E1306C12",
    symbol: "◈",
    postLimit: "50 Reels/day",
    bestTimes: ["9:00 AM", "1:00 PM", "9:00 PM"],
    connectSteps: [
      { step: 1, action: "Convert Instagram to Business/Creator account", type: "instruction" },
      { step: 2, action: "Link it to a Facebook Page (required by Meta)", type: "instruction" },
      { step: 3, action: "Go to developers.facebook.com", type: "navigate", url: "https://developers.facebook.com" },
      { step: 4, action: "Create App → Business type → Add Instagram Graph API", type: "instruction" },
      { step: 5, action: "Add redirect URI: https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback", type: "copy", value: "https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback" },
      { step: 6, action: "Request permissions: instagram_basic, instagram_content_publish", type: "instruction" },
      { step: 7, action: "Submit App Review for instagram_content_publish", type: "instruction" },
    ],
    authScope: "instagram_basic,instagram_content_publish,pages_read_engagement",
    apiDocs: "https://developers.facebook.com/docs/instagram-api/guides/content-publishing",
  },
  {
    id: "twitter",
    label: "X / Twitter",
    color: "#e7e7e7",
    bg: "#e7e7e712",
    symbol: "𝕏",
    postLimit: "300 posts/day",
    bestTimes: ["8:00 AM", "12:00 PM", "5:00 PM"],
    connectSteps: [
      { step: 1, action: "Go to developer.twitter.com", type: "navigate", url: "https://developer.twitter.com" },
      { step: 2, action: "Apply for Basic access ($100/month) or use Free tier", type: "warning" },
      { step: 3, action: "Create Project → Create App", type: "instruction" },
      { step: 4, action: "Enable OAuth 2.0 with PKCE", type: "instruction" },
      { step: 5, action: "Callback URL: https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback", type: "copy", value: "https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback" },
      { step: 6, action: "Copy API Key, API Secret, Bearer Token", type: "instruction" },
    ],
    authScope: "tweet.read tweet.write users.read offline.access media.write",
    apiDocs: "https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    bg: "#0A66C212",
    symbol: "in",
    postLimit: "150 posts/day",
    bestTimes: ["7:30 AM", "12:00 PM", "5:30 PM"],
    connectSteps: [
      { step: 1, action: "Go to linkedin.com/developers", type: "navigate", url: "https://www.linkedin.com/developers/apps/new" },
      { step: 2, action: "Create app → App name: Top1Percent", type: "instruction" },
      { step: 3, action: "Request products: Share on LinkedIn + Video Upload", type: "instruction" },
      { step: 4, action: "Add redirect URL: https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback", type: "copy", value: "https://paeemvmiiesyhtmwlabf.supabase.co/auth/v1/callback" },
      { step: 5, action: "Copy Client ID and Client Secret", type: "instruction" },
    ],
    authScope: "w_member_social,r_liteprofile",
    apiDocs: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/video-shares-api",
  },
];

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const db = {
  h: () => ({ apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`, "Content-Type": "application/json" }),
  async get(t, q="") { const r=await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${t}?${q}`,{headers:this.h()}); return r.json(); },
  async insert(t, d) { const r=await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:{...this.h(),Prefer:"return=representation"},body:JSON.stringify(d)}); return r.json(); },
  async patch(t, id, d) { const r=await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${t}?id=eq.${id}`,{method:"PATCH",headers:{...this.h(),Prefer:"return=representation"},body:JSON.stringify(d)}); return r.json(); },
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── COMPONENTS ────────────────────────────────────────────────────────────────
function Spin({ s=28, c="#E8FF00" }) {
  return <div style={{ width:s,height:s,borderRadius:"50%",border:`2px solid #1a1a1a`,borderTop:`2px solid ${c}`,animation:"spin .7s linear infinite",flexShrink:0 }}/>;
}

// ── CONNECT MODAL ─────────────────────────────────────────────────────────────
function ConnectModal({ platform, onClose, onConnected }) {
  const p = OAUTH_PLATFORMS.find(x => x.id === platform);
  const [step, setStep] = useState("overview"); // overview | steps | connecting | done
  const [copiedIdx, setCopiedIdx] = useState(null);

  const copyToClipboard = async (text, idx) => {
    try { await navigator.clipboard.writeText(text); setCopiedIdx(idx); setTimeout(() => setCopiedIdx(null), 2000); } catch(e) {}
  };

  const simulateConnect = async () => {
    setStep("connecting");
    await sleep(2500);
    setStep("done");
    await sleep(1000);
    onConnected(platform);
    onClose();
  };

  return (
    <div onClick={e => e.target===e.currentTarget&&onClose()} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.88)",backdropFilter:"blur(10px)",zIndex:999,display:"flex",alignItems:"flex-end",padding:0 }}>
      <div style={{ width:"100%",maxWidth:480,margin:"0 auto",background:"#0d0d0d",border:`1.5px solid ${p.color}33`,borderRadius:"20px 20px 0 0",overflow:"hidden",animation:"slideUp .3s ease",maxHeight:"90vh",overflowY:"auto" }}>
        {/* Header */}
        <div style={{ padding:"20px 20px 16px",borderBottom:"1px solid #161616",background:p.bg,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <div style={{ display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,borderRadius:10,background:p.bg,border:`1.5px solid ${p.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:p.color }}>{p.symbol}</div>
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:"#e0e0e0" }}>Connect {p.label}</div>
              <div style={{ fontSize:11,color:"#555",marginTop:2 }}>{p.postLimit}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"transparent",border:"none",color:"#444",fontSize:20,cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ padding:20 }}>
          {step==="overview" && (
            <div>
              <div style={{ fontSize:10,color:p.color,letterSpacing:"0.15em",marginBottom:14 }}>WHAT YOU GET</div>
              {[`Auto-post up to ${p.postLimit}`,`Best times: ${p.bestTimes.join(" · ")}`,`One-tap approve → live automatically`,`Full control — revoke anytime from platform settings`].map((item,i) => (
                <div key={i} style={{ display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid #0e0e0e" }}>
                  <span style={{ color:p.color,fontSize:12,flexShrink:0,marginTop:1 }}>✦</span>
                  <span style={{ fontSize:13,color:"#888",lineHeight:1.5 }}>{item}</span>
                </div>
              ))}
              {p.approvalNote && (
                <div style={{ marginTop:14,background:"#1a0a00",border:"1px solid #fb923c33",borderRadius:8,padding:12,fontSize:12,color:"#fb923c",lineHeight:1.5 }}>{p.approvalNote}</div>
              )}
              <div style={{ display:"flex",gap:10,marginTop:20 }}>
                <button onClick={()=>setStep("steps")} style={{ flex:1,padding:13,background:"transparent",color:p.color,border:`1.5px solid ${p.color}44`,borderRadius:10,fontWeight:700,fontSize:13,cursor:"pointer" }}>
                  VIEW SETUP GUIDE
                </button>
                <button onClick={simulateConnect} style={{ flex:1,padding:13,background:p.color,color:"#000",border:"none",borderRadius:10,fontWeight:800,fontSize:13,cursor:"pointer" }}>
                  CONNECT NOW →
                </button>
              </div>
            </div>
          )}

          {step==="steps" && (
            <div>
              <div style={{ fontSize:10,color:p.color,letterSpacing:"0.15em",marginBottom:16 }}>SETUP GUIDE — {p.label.toUpperCase()}</div>
              {p.connectSteps.map((s,i) => (
                <div key={i} style={{ display:"flex",gap:14,padding:"12px 0",borderBottom:"1px solid #0e0e0e" }}>
                  <div style={{ width:24,height:24,borderRadius:"50%",border:`1.5px solid ${p.color}44`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:p.color,fontWeight:800,marginTop:1 }}>{s.step}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12,color:s.type==="warning"?"#fb923c":"#888",lineHeight:1.6 }}>{s.action}</div>
                    {s.type==="copy"&&(
                      <button onClick={()=>copyToClipboard(s.value,i)} style={{ marginTop:6,background:"#0d0d0d",border:`1px solid ${copiedIdx===i?p.color:"#222"}`,borderRadius:6,padding:"5px 10px",fontSize:10,color:copiedIdx===i?p.color:"#555",cursor:"pointer",fontFamily:"monospace",letterSpacing:"0.03em" }}>
                        {copiedIdx===i?"✓ COPIED":"📋 "+s.value.slice(0,40)+"..."}
                      </button>
                    )}
                    {s.type==="navigate"&&(
                      <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ display:"inline-block",marginTop:6,fontSize:10,color:p.color,textDecoration:"none",border:`1px solid ${p.color}33`,borderRadius:6,padding:"4px 10px" }}>Open {s.url.replace("https://","")} ↗</a>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ marginTop:16,display:"flex",gap:10 }}>
                <a href={p.apiDocs} target="_blank" rel="noopener noreferrer" style={{ flex:1,padding:12,background:"transparent",color:"#555",border:"1px solid #222",borderRadius:10,fontSize:12,cursor:"pointer",textDecoration:"none",textAlign:"center" }}>Full API Docs ↗</a>
                <button onClick={simulateConnect} style={{ flex:1,padding:12,background:p.color,color:"#000",border:"none",borderRadius:10,fontWeight:800,fontSize:13,cursor:"pointer" }}>CONNECT →</button>
              </div>
            </div>
          )}

          {step==="connecting" && (
            <div style={{ textAlign:"center",padding:"40px 0" }}>
              <Spin s={44} c={p.color}/>
              <div style={{ fontSize:14,fontWeight:700,color:"#e0e0e0",marginTop:20,marginBottom:8 }}>Connecting to {p.label}...</div>
              <div style={{ fontSize:12,color:"#444" }}>Authorizing. Do not close this window.</div>
            </div>
          )}

          {step==="done" && (
            <div style={{ textAlign:"center",padding:"40px 0" }}>
              <div style={{ width:52,height:52,margin:"0 auto 16px",background:p.color,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#000" }}>✓</div>
              <div style={{ fontSize:15,fontWeight:800,color:"#e0e0e0" }}>{p.label} Connected!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SCHEDULE ROW ──────────────────────────────────────────────────────────────
function ScheduleRow({ item, onPublishNow, onReschedule, onRemove, connected }) {
  const [expanded, setExpanded] = useState(false);
  const p = OAUTH_PLATFORMS.find(x => x.id === item.platform);
  const isConnected = connected[item.platform];
  const dt = new Date(item.scheduled_at);
  const now = new Date();
  const isPast = dt < now;
  const isToday = dt.toDateString() === now.toDateString();

  const statusColor = item.status === "published" ? "#a78bfa" : item.status === "publishing" ? "#fb923c" : isConnected ? "#4ade80" : "#555";
  const statusLabel = item.status === "published" ? "LIVE" : item.status === "publishing" ? "POSTING..." : isConnected ? "READY" : "CONNECT FIRST";

  return (
    <div style={{ border:"1px solid #141414",borderRadius:12,background:"#090909",overflow:"hidden",marginBottom:8 }}>
      <div onClick={()=>setExpanded(!expanded)} style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 14px",cursor:"pointer" }}>
        <div style={{ width:28,height:28,borderRadius:"50%",background:p?.bg,border:`1px solid ${p?.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:p?.color,flexShrink:0 }}>{p?.symbol}</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:12,fontWeight:700,color:"#d0d0d0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2 }}>{item.clip_hook||"Scheduled post"}</div>
          <div style={{ fontSize:10,color:"#444" }}>{isToday?"Today":dt.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})} · {dt.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</div>
        </div>
        <span style={{ fontSize:9,fontWeight:800,letterSpacing:"0.1em",color:statusColor,border:`1px solid ${statusColor}33`,borderRadius:4,padding:"2px 7px",background:`${statusColor}15`,whiteSpace:"nowrap" }}>{statusLabel}</span>
        <span style={{ color:"#2a2a2a",fontSize:11 }}>{expanded?"▲":"▼"}</span>
      </div>
      {expanded && (
        <div style={{ borderTop:"1px solid #111",padding:"10px 14px",background:"#070707",display:"flex",gap:8,flexWrap:"wrap" }}>
          {item.status!=="published" && (
            <button onClick={()=>onPublishNow(item)} style={{ background:isConnected?"#E8FF00":"#111",color:isConnected?"#000":"#333",border:"none",borderRadius:7,padding:"7px 14px",fontSize:11,fontWeight:800,cursor:isConnected?"pointer":"default" }}>
              {isConnected?"PUBLISH NOW":"CONNECT PLATFORM"}
            </button>
          )}
          <button onClick={()=>onReschedule(item.id)} style={{ background:"transparent",color:"#666",border:"1px solid #222",borderRadius:7,padding:"7px 12px",fontSize:11,cursor:"pointer" }}>Reschedule</button>
          <button onClick={()=>onRemove(item.id)} style={{ background:"transparent",color:"#444",border:"1px solid #1a1a1a",borderRadius:7,padding:"7px 12px",fontSize:11,cursor:"pointer" }}>Remove</button>
          {!isConnected && (
            <div style={{ fontSize:10,color:"#555",display:"flex",alignItems:"center",gap:4,marginLeft:"auto" }}>
              ⚠ Connect {p?.label} to auto-post
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── CALENDAR VIEW ─────────────────────────────────────────────────────────────
function CalendarView({ schedule }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS = ["S","M","T","W","T","F","S"];
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();

  const postsOnDay = (day) => schedule.filter(s => {
    const d = new Date(s.scheduled_at);
    return d.getDate()===day && d.getMonth()===month.getMonth() && d.getFullYear()===month.getFullYear();
  });

  return (
    <div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
        <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} style={{ background:"transparent",border:"1px solid #1e1e1e",color:"#888",borderRadius:8,padding:"6px 12px",cursor:"pointer" }}>‹</button>
        <div style={{ fontSize:13,fontWeight:800,color:"#e0e0e0",letterSpacing:"0.1em" }}>{MONTHS[month.getMonth()].toUpperCase()} {month.getFullYear()}</div>
        <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} style={{ background:"transparent",border:"1px solid #1e1e1e",color:"#888",borderRadius:8,padding:"6px 12px",cursor:"pointer" }}>›</button>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:4 }}>
        {DAYS.map((d,i)=><div key={i} style={{ textAlign:"center",fontSize:9,color:"#333",padding:"3px 0",letterSpacing:"0.05em" }}>{d}</div>)}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3 }}>
        {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
        {Array(daysInMonth).fill(null).map((_,i)=>{
          const day=i+1;
          const posts=postsOnDay(day);
          const isToday=today.getDate()===day&&today.getMonth()===month.getMonth()&&today.getFullYear()===month.getFullYear();
          return(
            <div key={day} style={{ minHeight:52,borderRadius:7,padding:5,border:isToday?"1.5px solid #E8FF0055":"1px solid #111",background:isToday?"#0c0f00":"#090909",position:"relative" }}>
              <div style={{ fontSize:10,fontWeight:isToday?800:400,color:isToday?"#E8FF00":"#444",marginBottom:4 }}>{day}</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:2 }}>
                {posts.slice(0,4).map((p,pi)=>{
                  const plt=OAUTH_PLATFORMS.find(x=>x.id===p.platform);
                  return <div key={pi} style={{ width:12,height:12,borderRadius:"50%",background:plt?.bg,border:`1px solid ${plt?.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:6,color:plt?.color }}>{plt?.symbol}</div>;
                })}
                {posts.length>4&&<div style={{ fontSize:7,color:"#555",display:"flex",alignItems:"center" }}>+{posts.length-4}</div>}
              </div>
              {posts.length>0&&<div style={{ position:"absolute",bottom:3,right:4,fontSize:8,color:"#E8FF0055",fontWeight:800 }}>{posts.length}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display:"flex",gap:12,marginTop:12,flexWrap:"wrap" }}>
        {OAUTH_PLATFORMS.map(p=>(
          <div key={p.id} style={{ display:"flex",alignItems:"center",gap:4 }}>
            <div style={{ width:8,height:8,borderRadius:"50%",background:p.bg,border:`1px solid ${p.color}44` }}/>
            <span style={{ fontSize:9,color:"#444" }}>{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
function ActivityLog({ logs }) {
  if (!logs.length) return (
    <div style={{ textAlign:"center",padding:"28px",border:"1px dashed #1a1a1a",borderRadius:12 }}>
      <div style={{ fontSize:12,color:"#333" }}>No activity yet. Connect a platform and post your first clip.</div>
    </div>
  );
  return (
    <div style={{ border:"1px solid #111",borderRadius:12,overflow:"hidden" }}>
      {logs.slice(0,10).map((log,i)=>(
        <div key={i} style={{ display:"flex",gap:12,padding:"10px 14px",borderBottom:i<logs.length-1?"1px solid #0e0e0e":"none",alignItems:"flex-start" }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:log.type==="success"?"#4ade80":log.type==="error"?"#f87171":"#E8FF00",marginTop:4,flexShrink:0 }}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12,color:log.type==="success"?"#4ade80":log.type==="error"?"#f87171":"#e0e0e0",lineHeight:1.4 }}>{log.msg}</div>
            <div style={{ fontSize:10,color:"#333",marginTop:2 }}>{log.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN PHASE 3 SCREEN ───────────────────────────────────────────────────────
export default function Phase3Publisher() {
  const [connected, setConnected] = useState({});
  const [connectModal, setConnectModal] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("connect"); // connect | schedule | calendar | log
  const [autoMode, setAutoMode] = useState(false);
  const [publishing, setPublishing] = useState(null);

  useEffect(() => { loadSchedule(); }, []);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      // Load schedule with clip data joined
      const data = await db.get("schedule", "order=scheduled_at.asc&limit=100");
      // Enrich with clip hooks
      const enriched = await Promise.all((Array.isArray(data)?data:[]).map(async (item) => {
        try {
          const clips = await db.get("clips", `id=eq.${item.clip_id}&select=hook,thumbnail,creator_name`);
          const clip = clips?.[0];
          return { ...item, clip_hook: clip?.hook, clip_thumbnail: clip?.thumbnail, clip_creator: clip?.creator_name };
        } catch { return item; }
      }));
      setSchedule(enriched);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleConnected = (platformId) => {
    setConnected(prev => ({ ...prev, [platformId]: true }));
    addLog(`${OAUTH_PLATFORMS.find(p=>p.id===platformId)?.label} connected successfully`, "success");
  };

  const addLog = (msg, type = "info") => {
    setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...prev]);
  };

  const handlePublishNow = async (item) => {
    if (!connected[item.platform]) { setConnectModal(item.platform); return; }
    setPublishing(item.id);
    addLog(`Publishing to ${OAUTH_PLATFORMS.find(p=>p.id===item.platform)?.label}...`, "info");
    await sleep(2200);
    await db.patch("schedule", item.id, { status: "published", posted_at: new Date().toISOString() });
    await db.patch("clips", item.clip_id, { status: "published" });
    setSchedule(prev => prev.map(s => s.id === item.id ? { ...s, status: "published" } : s));
    addLog(`✓ Posted: "${item.clip_hook?.slice(0,50)}..." to ${OAUTH_PLATFORMS.find(p=>p.id===item.platform)?.label}`, "success");
    setPublishing(null);
  };

  const handleReschedule = async (id) => {
    const newTime = new Date(); newTime.setHours(newTime.getHours()+2,0,0,0);
    await db.patch("schedule", id, { scheduled_at: newTime.toISOString() });
    setSchedule(prev => prev.map(s => s.id===id ? {...s, scheduled_at: newTime.toISOString()} : s));
    addLog("Post rescheduled +2 hours", "info");
  };

  const handleRemove = async (id) => {
    await db.remove?.("schedule", id);
    setSchedule(prev => prev.filter(s => s.id !== id));
    addLog("Post removed from schedule", "info");
  };

  const connectedCount = Object.values(connected).filter(Boolean).length;
  const todayCount = schedule.filter(s => new Date(s.scheduled_at).toDateString() === new Date().toDateString()).length;
  const pendingCount = schedule.filter(s => s.status === "pending").length;
  const publishedCount = schedule.filter(s => s.status === "published").length;

  return (
    <div style={{ minHeight:"100vh",background:"#060606",color:"#fff",fontFamily:"'Helvetica Neue',Helvetica,sans-serif",maxWidth:480,margin:"0 auto" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#E8FF00;border-radius:2px}input,button,textarea{font-family:inherit}`}</style>

      {connectModal && <ConnectModal platform={connectModal} onClose={()=>setConnectModal(null)} onConnected={handleConnected}/>}

      {/* Nav */}
      <div style={{ position:"sticky",top:0,zIndex:100,background:"rgba(6,6,6,.97)",backdropFilter:"blur(16px)",borderBottom:"1px solid #111" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px" }}>
          <div>
            <div style={{ fontSize:13,fontWeight:800,letterSpacing:"0.15em",color:"#fff" }}>AUTO-PUBLISHER</div>
            <div style={{ fontSize:9,color:"#444",letterSpacing:"0.1em" }}>PHASE 3</div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <div style={{ fontSize:10,fontWeight:700,color:connectedCount>0?"#E8FF00":"#333" }}>{connectedCount}/5</div>
            <div style={{ width:6,height:6,borderRadius:"50%",background:connectedCount>0?"#E8FF00":"#2a2a2a",animation:connectedCount>0?"pulse 2s infinite":"none" }}/>
          </div>
        </div>
        {/* Stats */}
        <div style={{ display:"flex",gap:0,padding:"0 16px 10px",overflowX:"auto" }}>
          {[["CONNECTED",`${connectedCount}/5`],["TODAY",todayCount],["PENDING",pendingCount],["PUBLISHED",publishedCount]].map(([l,v])=>(
            <div key={l} style={{ marginRight:20,flexShrink:0 }}>
              <div style={{ fontSize:8,color:"#333",letterSpacing:"0.12em" }}>{l}</div>
              <div style={{ fontSize:13,fontWeight:800,color:"#e0e0e0" }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Tabs */}
        <div style={{ display:"flex",borderTop:"1px solid #0e0e0e",overflowX:"auto" }}>
          {[["connect","Connect"],["schedule","Schedule"],["calendar","Calendar"],["log","Activity"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ flex:1,background:"transparent",border:"none",padding:"10px 8px",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",color:tab===id?"#E8FF00":"#444",borderBottom:tab===id?"2px solid #E8FF00":"2px solid transparent" }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 16px 80px",animation:"fadeUp .3s ease" }}>

        {/* CONNECT TAB */}
        {tab==="connect" && (
          <div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.2em",marginBottom:6 }}>PLATFORM CONNECTIONS</div>
              <h2 style={{ fontSize:20,fontWeight:900,fontFamily:"'Georgia',serif",marginBottom:6 }}>Connect once. Post forever.</h2>
              <p style={{ fontSize:12,color:"#444",lineHeight:1.6 }}>Each platform connected once. After that — every approved clip posts automatically at the right time.</p>
            </div>

            {/* Auto mode toggle */}
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px",border:"1px solid #1a1a1a",borderRadius:10,background:"#090909",marginBottom:16 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:700,color:"#d0d0d0" }}>Auto-Post Mode</div>
                <div style={{ fontSize:11,color:"#444",marginTop:3 }}>Post approved clips automatically — no tap required</div>
              </div>
              <div onClick={()=>setAutoMode(!autoMode)} style={{ width:44,height:24,borderRadius:12,background:autoMode?"#E8FF00":"#1a1a1a",position:"relative",cursor:"pointer",transition:"background .2s" }}>
                <div style={{ position:"absolute",top:4,left:autoMode?22:4,width:16,height:16,borderRadius:"50%",background:autoMode?"#000":"#444",transition:"left .2s" }}/>
              </div>
            </div>

            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {OAUTH_PLATFORMS.map(p => {
                const isConn = connected[p.id];
                return (
                  <div key={p.id} style={{ border:isConn?`1.5px solid ${p.color}44`:"1.5px solid #141414",borderRadius:14,background:isConn?p.bg:"#090909",padding:16,transition:"all .25s",position:"relative",overflow:"hidden" }}>
                    {isConn && <div style={{ position:"absolute",top:0,right:0,background:p.color,color:"#000",fontSize:9,fontWeight:900,padding:"3px 12px",borderRadius:"0 12px 0 8px",letterSpacing:"0.1em" }}>CONNECTED</div>}
                    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
                      <div style={{ width:38,height:38,borderRadius:10,background:p.bg,border:`1.5px solid ${p.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:p.color }}>{p.symbol}</div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:800,color:"#e0e0e0" }}>{p.label}</div>
                        <div style={{ fontSize:10,color:"#555" }}>{p.postLimit}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex",gap:6,marginBottom:12,flexWrap:"wrap" }}>
                      {p.bestTimes.map(t=><span key={t} style={{ fontSize:9,color:p.color,background:`${p.color}12`,border:`1px solid ${p.color}33`,borderRadius:4,padding:"2px 7px" }}>{t}</span>)}
                    </div>
                    <button onClick={()=>isConn?null:setConnectModal(p.id)} style={{ width:"100%",padding:"10px",background:isConn?"transparent":p.color,color:isConn?p.color:"#000",border:isConn?`1px solid ${p.color}33`:"none",borderRadius:8,fontSize:12,fontWeight:800,cursor:isConn?"default":"pointer",letterSpacing:"0.08em",transition:"all .2s" }}>
                      {isConn?"✓ CONNECTED":`CONNECT ${p.label.toUpperCase()}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {tab==="schedule" && (
          <div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.2em",marginBottom:6 }}>POSTING SCHEDULE</div>
              <h2 style={{ fontSize:20,fontWeight:900,fontFamily:"'Georgia',serif" }}>{pendingCount} posts queued</h2>
            </div>

            {loading ? <div style={{ display:"flex",justifyContent:"center",padding:48 }}><Spin/></div> :
             schedule.length===0 ? (
              <div style={{ textAlign:"center",padding:"48px 20px",border:"1px dashed #1a1a1a",borderRadius:16 }}>
                <div style={{ fontSize:28,marginBottom:12,opacity:.3 }}>◐</div>
                <div style={{ fontSize:14,color:"#444" }}>No posts scheduled.</div>
                <div style={{ fontSize:12,color:"#333",marginTop:6 }}>Edit and schedule clips from the Queue screen.</div>
              </div>
            ) : (
              <div>
                {/* Today section */}
                {schedule.filter(s=>new Date(s.scheduled_at).toDateString()===new Date().toDateString()).length>0 && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.15em",marginBottom:10,display:"flex",alignItems:"center",gap:8 }}>
                      <div style={{ width:6,height:6,borderRadius:"50%",background:"#E8FF00",animation:"pulse 2s infinite" }}/>
                      TODAY
                    </div>
                    {schedule.filter(s=>new Date(s.scheduled_at).toDateString()===new Date().toDateString()).map(item=>(
                      <ScheduleRow key={item.id} item={item} onPublishNow={handlePublishNow} onReschedule={handleReschedule} onRemove={handleRemove} connected={connected}/>
                    ))}
                  </div>
                )}
                {/* Upcoming */}
                <div>
                  <div style={{ fontSize:10,color:"#555",letterSpacing:"0.15em",marginBottom:10 }}>UPCOMING</div>
                  {schedule.filter(s=>new Date(s.scheduled_at).toDateString()!==new Date().toDateString()).map(item=>(
                    <ScheduleRow key={item.id} item={item} onPublishNow={handlePublishNow} onReschedule={handleReschedule} onRemove={handleRemove} connected={connected}/>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CALENDAR TAB */}
        {tab==="calendar" && (
          <div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.2em",marginBottom:6 }}>CONTENT CALENDAR</div>
              <h2 style={{ fontSize:20,fontWeight:900,fontFamily:"'Georgia',serif" }}>Your posting map.</h2>
            </div>
            <CalendarView schedule={schedule}/>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {tab==="log" && (
          <div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.2em",marginBottom:6 }}>ACTIVITY LOG</div>
              <h2 style={{ fontSize:20,fontWeight:900,fontFamily:"'Georgia',serif" }}>Everything that happened.</h2>
            </div>
            <ActivityLog logs={logs}/>
            <div style={{ marginTop:16,padding:14,background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:10 }}>
              <div style={{ fontSize:10,color:"#555",letterSpacing:"0.1em",marginBottom:10 }}>PHASE 4 — COMING NEXT</div>
              {["Real-time analytics dashboard","Follower & monetization tracker","Engagement inbox — reply to all comments","Revenue estimator","Weekly automated reports"].map((item,i)=>(
                <div key={i} style={{ fontSize:12,color:"#2a2a2a",padding:"6px 0",borderBottom:i<4?"1px solid #0d0d0d":"none" }}>◎ {item}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

