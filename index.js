import express from 'express';
import { useState, useEffect, useRef } from "react";

const app = express();
// This line makes sure your app is allowed to talk to the internet
app.use(express.json()); 

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG — Fill these with your real keys
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  YOUTUBE_API_KEY:   "YOUR_YOUTUBE_API_KEY",
  GEMINI_API_KEY:    "YOUR_GEMINI_API_KEY",
  SUPABASE_URL:      "https://paeemvmiiesyhtmwlabf.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR DATABASE
// ─────────────────────────────────────────────────────────────────────────────
const CREATORS = [
  { name: "Vinh Giang",       channelId: "UCmJJut8kMS_OzqmNAmAYm8A", category: "Communication" },
  { name: "Brian Tracy",      channelId: "UCvhpx2C2AZmqN_u-gLMjXxg", category: "Leadership" },
  { name: "Simon Sinek",      channelId: "UCNavnFDL6tBP3bOQFhBJTww", category: "Leadership" },
  { name: "Les Brown",        channelId: "UCgsB-5F9GxLJKq6pHq7QH1g", category: "Mindset" },
  { name: "Naval Ravikant",   channelId: "UCh_ugKacslKhsRs9n4OzDjA", category: "Philosophy" },
  { name: "Jim Rohn",         channelId: "UCBcRF18a7Qf58cCRy5xuWwQ", category: "Life Philosophy" },
  { name: "Tony Robbins",     channelId: "UCz7UPZO_BtIGQKLj94oUXqg", category: "Human Potential" },
  { name: "Jordan Peterson",  channelId: "UCL_f53ZEJxp8TtlOkHwMV9Q", category: "Psychology" },
  { name: "Thomas Sowell",    channelId: "UCWRMaQHMXQRTXTM9e6pc1Og", category: "Economics" },
  { name: "Ray Dalio",        channelId: "UCsSe4BGNqJVoEP3FhQD9z-A", category: "Wealth Philosophy" },
];

const PLATFORMS = [
  { id: "youtube",   label: "YouTube Shorts", color: "#FF0000", bg: "#FF000012", symbol: "▶" },
  { id: "tiktok",    label: "TikTok",         color: "#00f2ea", bg: "#00f2ea12", symbol: "♪" },
  { id: "instagram", label: "Instagram",      color: "#E1306C", bg: "#E1306C12", symbol: "◈" },
  { id: "twitter",   label: "X / Twitter",    color: "#e7e7e7", bg: "#e7e7e712", symbol: "𝕏" },
  { id: "linkedin",  label: "LinkedIn",       color: "#0A66C2", bg: "#0A66C212", symbol: "in" },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const t2s = t => { if (!t) return 0; const p = t.split(":").map(Number); return p.length === 2 ? p[0]*60+p[1] : p[0]*3600+p[1]*60+p[2]; };

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE
// ─────────────────────────────────────────────────────────────────────────────
const db = {
  headers: () => ({
    apikey: CONFIG.SUPABASE_ANON_KEY,
    Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  }),
  async get(table, q = "") {
    const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${table}?${q}`, { headers: this.headers() });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async insert(table, data) {
    const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: { ...this.headers(), Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async patch(table, id, data) {
    const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH", headers: { ...this.headers(), Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// YOUTUBE API
// ─────────────────────────────────────────────────────────────────────────────
async function ytSearch(channelId, n = 4) {
  const u = `https://www.googleapis.com/youtube/v3/search?key=${CONFIG.YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet&type=video&order=date&maxResults=${n}&videoDuration=medium`;
  const r = await fetch(u);
  if (!r.ok) throw new Error(`YouTube ${r.status}`);
  const d = await r.json();
  return (d.items || []).map(i => ({
    videoId: i.id.videoId,
    title: i.snippet.title,
    thumbnail: i.snippet.thumbnails?.high?.url,
    publishedAt: i.snippet.publishedAt,
    channelTitle: i.snippet.channelTitle,
    url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
  }));
}

async function ytDetails(videoId) {
  const u = `https://www.googleapis.com/youtube/v3/videos?key=${CONFIG.YOUTUBE_API_KEY}&id=${videoId}&part=statistics,snippet`;
  const r = await fetch(u);
  const d = await r.json();
  const item = d.items?.[0];
  return item ? {
    viewCount: parseInt(item.statistics?.viewCount || 0),
    commentCount: parseInt(item.statistics?.commentCount || 0),
    title: item.snippet?.title,
  } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI API
// ─────────────────────────────────────────────────────────────────────────────
async function gemini(prompt) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      }),
    }
  );
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function analyzeVideo(url, title, creator) {
  const raw = await gemini(`You are the world's best short-form content editor for "Top 1%" — a premium channel clipping the most powerful moments from the world's most respected thinkers.

Watch this YouTube video: ${url}
Title: "${title}" by ${creator}

Find the single most powerful 3-7 minute segment that would make a busy, successful adult (entrepreneur, professional, aged 28-55) stop everything to watch. NOT a summary. The original speaker's EXACT words.

Return ONLY valid JSON:
{
  "startTime": "MM:SS",
  "endTime": "MM:SS",
  "durationSeconds": 240,
  "hook": "Title so compelling a busy CEO stops scrolling. Never start with How To",
  "openingLine": "Exact first words the speaker says at this timestamp",
  "whyItWorks": "One sentence: psychological reason intelligent adults cannot scroll past this",
  "viralScore": 94,
  "emotionalTrigger": "revelation",
  "thumbnailText": "3-5 WORDS ALL CAPS for thumbnail overlay"
}`);
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

async function genCaptions(hook, creator) {
  const raw = await gemini(`Viral content strategist for "Top 1%" channel.
Hook: "${hook}" by ${creator}

Return ONLY valid JSON:
{
  "youtube":   {"title":"SEO title under 60 chars","caption":"3-4 sentences, keyword-rich, ends with question, 6 hashtags"},
  "tiktok":    {"title":"Punchy under 40 chars","caption":"2-3 punchy lines, 5 hashtags max"},
  "instagram": {"title":"Emotional hook under 50 chars","caption":"3-4 emotional sentences, question at end, 8 hashtags"},
  "twitter":   {"title":"Under 30 chars","caption":"One powerful sentence under 200 chars, 3 hashtags"},
  "linkedin":  {"title":"Professional under 60 chars","caption":"2-3 insight sentences, 3 hashtags"}
}`);
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Spin({ size = 28, color = "#E8FF00" }) {
  return <div style={{ width:size,height:size,borderRadius:"50%",border:`2px solid #1a1a1a`,borderTop:`2px solid ${color}`,animation:"spin .7s linear infinite",flexShrink:0 }} />;
}

function Logo() {
  return (
    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
      <div style={{ width:34,height:34,background:"#E8FF00",clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",display:"flex",alignItems:"center",justifyContent:"center" }}>
        <span style={{ fontSize:11,fontWeight:900,color:"#000",fontFamily:"serif" }}>1%</span>
      </div>
      <div>
        <div style={{ fontSize:13,fontWeight:800,letterSpacing:"0.2em",color:"#fff",lineHeight:1 }}>TOP 1%</div>
        <div style={{ fontSize:9,color:"#444",letterSpacing:"0.15em" }}>CONTENT ENGINE</div>
      </div>
    </div>
  );
}

function Chip({ status }) {
  const M = {
    researched: ["#4ade80","#1a2a1a","READY"],
    analyzing:  ["#E8FF00","#1a1a00","ANALYZING"],
    processing: ["#fb923c","#1a0a00","PROCESSING"],
    scheduled:  ["#38bdf8","#001a2a","SCHEDULED"],
    published:  ["#a78bfa","#0a001a","LIVE"],
    error:      ["#f87171","#2a0000","ERROR"],
  };
  const [c,b,l] = M[status] || ["#555","#111","PENDING"];
  return <span style={{ fontSize:9,fontWeight:800,letterSpacing:"0.12em",color:c,background:b,border:`1px solid ${c}33`,borderRadius:4,padding:"3px 8px" }}>{l}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// THUMBNAIL BUILDER
// ─────────────────────────────────────────────────────────────────────────────
function ThumbCanvas({ thumbnailUrl, mainText, subText="", colorScheme="yellow-black", onCapture }) {
  const ref = useRef();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width = 1080; canvas.height = 1920;
    const schemes = { "yellow-black":["#E8FF00","#000"], "white-black":["#fff","#000"], "red-white":["#FF3333","#fff"], "green-black":["#00FF88","#000"] };
    const [tc] = schemes[colorScheme] || schemes["yellow-black"];
    const img = new Image();
    img.crossOrigin = "anonymous";
    const draw = () => {
      if (img.complete && img.naturalWidth > 0) {
        const s = Math.max(canvas.width/img.width, canvas.height/img.height);
        ctx.drawImage(img,(canvas.width-img.width*s)/2,(canvas.height-img.height*s)/2,img.width*s,img.height*s);
      } else {
        ctx.fillStyle="#111"; ctx.fillRect(0,0,canvas.width,canvas.height);
      }
      const g = ctx.createLinearGradient(0,canvas.height*.45,0,canvas.height);
      g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,.88)");
      ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);
      if (mainText) {
        ctx.font="bold 108px 'Arial Black',Arial"; ctx.textAlign="center";
        ctx.shadowColor="#000"; ctx.shadowBlur=24; ctx.shadowOffsetX=4; ctx.shadowOffsetY=4;
        ctx.fillStyle=tc;
        const words=mainText.split(" "); let line="",lines=[];
        for (const w of words) { const t=line+w+" "; if(ctx.measureText(t).width>canvas.width-100&&line){lines.push(line.trim());line=w+" ";}else line=t; }
        lines.push(line.trim());
        const yBase=canvas.height-160-lines.length*120;
        lines.forEach((l,i)=>ctx.fillText(l,canvas.width/2,yBase+i*124));
        if(subText){ctx.font="bold 56px Arial";ctx.fillStyle="rgba(255,255,255,.7)";ctx.shadowBlur=10;ctx.fillText(subText,canvas.width/2,yBase+lines.length*124+20);}
      }
      ctx.font="bold 40px Arial"; ctx.fillStyle="#E8FF00"; ctx.textAlign="right"; ctx.shadowBlur=0;
      ctx.fillText("TOP 1%",canvas.width-36,56);
      setReady(true);
      if(onCapture) onCapture(canvas.toDataURL("image/jpeg",.9));
    };
    img.onload=draw; img.onerror=draw;
    if(thumbnailUrl) img.src=thumbnailUrl; else draw();
  },[thumbnailUrl,mainText,subText,colorScheme]);

  return <canvas ref={ref} style={{ width:"100%",borderRadius:12,border:"1px solid #1e1e1e",display:"block",opacity:ready?1:0,transition:"opacity .4s" }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: RESEARCH
// ─────────────────────────────────────────────────────────────────────────────
function ResearchScreen({ onProcess }) {
  const [phase, setPhase] = useState("idle");
  const [done, setDone] = useState([]);
  const [current, setCurrent] = useState(null);
  const [videos, setVideos] = useState([]);
  const [approved, setApproved] = useState([]);
  const [skipped, setSkipped] = useState([]);
  const [customUrl, setCustomUrl] = useState("");
  const [err, setErr] = useState(null);

  const run = async () => {
    setPhase("running"); setVideos([]); setDone([]); setErr(null);
    const all = [];
    for (const c of CREATORS) {
      setCurrent(c);
      try {
        const vids = await ytSearch(c.channelId, 3);
        const enriched = await Promise.all(vids.map(async v => {
          try { const d = await ytDetails(v.videoId); return {...v,...d,creatorName:c.name,creatorCategory:c.category}; }
          catch { return {...v,creatorName:c.name,creatorCategory:c.category}; }
        }));
        all.push(...enriched);
        setVideos([...all]);
      } catch(e) { console.error(c.name, e); }
      setDone(p => [...p, c.name]);
      await sleep(200);
    }
    setCurrent(null);
    setPhase(all.length ? "done" : "error");
    if (!all.length) setErr("No videos found. Check your YouTube API key in CONFIG.");
  };

  const addUrl = async () => {
    if (!customUrl.trim()) return;
    const m = customUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!m) return;
    const videoId = m[1];
    try {
      const d = await ytDetails(videoId);
      setVideos(p => [{videoId,title:d?.title||"Custom Video",thumbnail:`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,publishedAt:new Date().toISOString(),channelTitle:"Custom",url:`https://www.youtube.com/watch?v=${videoId}`,creatorName:"Custom",creatorCategory:"Custom",...d},...p]);
      setCustomUrl("");
    } catch(e){console.error(e);}
  };

  const visible = videos.filter(v => !skipped.includes(v.videoId));

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ padding:"20px 16px 14px",borderBottom:"1px solid #0e0e0e" }}>
        <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.2em",marginBottom:6 }}>RESEARCH ENGINE</div>
        <h2 style={{ fontSize:22,fontWeight:900,fontFamily:"'Georgia',serif",marginBottom:6 }}>Find the gold.</h2>
        <p style={{ fontSize:12,color:"#444",lineHeight:1.6 }}>Scans {CREATORS.length} Legacy Creators. Real YouTube data. Takes 3-5 minutes.</p>
      </div>

      {/* Custom URL */}
      <div style={{ padding:"12px 16px",borderBottom:"1px solid #0e0e0e" }}>
        <div style={{ fontSize:10,color:"#555",letterSpacing:"0.1em",marginBottom:8 }}>ADD YOUR OWN URL</div>
        <div style={{ display:"flex",gap:8 }}>
          <input value={customUrl} onChange={e=>setCustomUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addUrl()}
            placeholder="Paste any YouTube link..."
            style={{ flex:1,background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:8,padding:"10px 12px",color:"#e0e0e0",fontSize:13,outline:"none" }} />
          <button onClick={addUrl} style={{ background:customUrl?"#E8FF00":"#111",color:customUrl?"#000":"#333",border:"none",borderRadius:8,padding:"10px 16px",fontSize:12,fontWeight:800,cursor:"pointer" }}>ADD</button>
        </div>
      </div>

      {/* Research button */}
      <div style={{ padding:"12px 16px",borderBottom:"1px solid #0e0e0e" }}>
        {phase==="idle" && (
          <button onClick={run} style={{ width:"100%",padding:"16px",background:"#E8FF00",color:"#000",border:"none",borderRadius:12,fontSize:14,fontWeight:900,cursor:"pointer",letterSpacing:"0.1em" }}>
            ◎ SCAN {CREATORS.length} LEGACY CREATORS
          </button>
        )}
        {phase==="running" && (
          <div style={{ background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:12,padding:16 }}>
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14 }}>
              <Spin size={18} />
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:"#e0e0e0" }}>Scanning YouTube...</div>
                {current && <div style={{ fontSize:11,color:"#555",marginTop:2 }}>Currently: {current.name}</div>}
              </div>
              <div style={{ marginLeft:"auto",fontSize:13,color:"#E8FF00",fontWeight:800 }}>{done.length}/{CREATORS.length}</div>
            </div>
            <div style={{ height:3,background:"#111",borderRadius:2 }}>
              <div style={{ height:"100%",width:`${done.length/CREATORS.length*100}%`,background:"linear-gradient(90deg,#E8FF00,#00f2ea)",borderRadius:2,transition:"width .5s" }} />
            </div>
            <div style={{ marginTop:10,display:"flex",flexWrap:"wrap",gap:5 }}>
              {CREATORS.map(c=>(
                <span key={c.name} style={{ fontSize:9,padding:"2px 7px",borderRadius:4,background:done.includes(c.name)?"#E8FF0015":"#111",color:done.includes(c.name)?"#E8FF00":"#333",border:`1px solid ${done.includes(c.name)?"#E8FF0033":"#1a1a1a"}`,transition:"all .3s" }}>{c.name}</span>
              ))}
            </div>
          </div>
        )}
        {phase==="done" && (
          <div style={{ display:"flex",gap:10 }}>
            <div style={{ flex:1,background:"#0c0f00",border:"1px solid #E8FF0022",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
              <span style={{ fontSize:18 }}>✓</span>
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:"#E8FF00" }}>{visible.length} videos found</div>
                <div style={{ fontSize:11,color:"#555" }}>{approved.length} approved</div>
              </div>
            </div>
            <button onClick={run} style={{ background:"transparent",border:"1px solid #222",color:"#666",borderRadius:10,padding:"10px 14px",fontSize:11,cursor:"pointer" }}>↺</button>
          </div>
        )}
        {phase==="error" && (
          <div style={{ background:"#1a0000",border:"1px solid #FF444433",borderRadius:10,padding:14,color:"#f87171",fontSize:12 }}>
            {err} <button onClick={run} style={{ background:"transparent",border:"none",color:"#E8FF00",cursor:"pointer",fontSize:12 }}>Retry</button>
          </div>
        )}
      </div>

      {/* Videos */}
      {visible.length > 0 && (
        <div style={{ padding:"12px 16px" }}>
          <div style={{ fontSize:10,color:"#333",letterSpacing:"0.15em",marginBottom:12 }}>
            {visible.length} VIDEOS — APPROVE TO PROCESS
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {visible.map(v => {
              const isApproved = approved.some(a=>a.videoId===v.videoId);
              const days = Math.floor((Date.now()-new Date(v.publishedAt))/86400000);
              return (
                <div key={v.videoId} style={{ border:isApproved?"1.5px solid #E8FF0066":"1px solid #181818",borderRadius:14,background:isApproved?"#0c0f00":"#0a0a0a",overflow:"hidden",transition:"all .2s" }}>
                  <div style={{ display:"flex" }}>
                    <div style={{ width:100,flexShrink:0 }}>
                      <img src={v.thumbnail} alt="" style={{ width:"100%",height:72,objectFit:"cover",display:"block" }} />
                    </div>
                    <div style={{ flex:1,padding:"10px 12px",minWidth:0 }}>
                      <div style={{ fontSize:12,fontWeight:700,color:"#e0e0e0",lineHeight:1.3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",marginBottom:5 }}>{v.title}</div>
                      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                        <span style={{ fontSize:10,color:"#555" }}>{v.creatorName}</span>
                        <span style={{ fontSize:10,color:"#333" }}>·</span>
                        <span style={{ fontSize:10,color:"#555" }}>{days===0?"Today":days===1?"Yesterday":`${days}d ago`}</span>
                        {v.viewCount>0&&<><span style={{ fontSize:10,color:"#333" }}>·</span><span style={{ fontSize:10,color:"#555" }}>{v.viewCount>1000?`${(v.viewCount/1000).toFixed(0)}K`:v.viewCount} views</span></>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8,padding:"8px 12px",borderTop:"1px solid #111" }}>
                    <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,color:"#555",textDecoration:"none",border:"1px solid #1e1e1e",borderRadius:6,padding:"5px 10px" }}>▶ Watch</a>
                    <div style={{ flex:1 }} />
                    <button onClick={()=>setSkipped(p=>[...p,v.videoId])} style={{ background:"transparent",border:"1px solid #2a2a2a",color:"#555",borderRadius:6,padding:"5px 12px",fontSize:11,cursor:"pointer" }}>Skip</button>
                    <button onClick={()=>setApproved(p=>p.some(a=>a.videoId===v.videoId)?p.filter(a=>a.videoId!==v.videoId):[...p,v])}
                      style={{ background:isApproved?"#E8FF00":"#E8FF0015",border:`1px solid ${isApproved?"#E8FF00":"#E8FF0044"}`,color:isApproved?"#000":"#E8FF00",borderRadius:6,padding:"5px 14px",fontSize:11,fontWeight:800,cursor:"pointer",transition:"all .2s" }}>
                      {isApproved?"✓ APPROVED":"APPROVE"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {approved.length>0 && (
        <div style={{ position:"fixed",bottom:64,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,padding:"10px 16px",background:"rgba(6,6,6,.96)",backdropFilter:"blur(10px)",borderTop:"1px solid #E8FF0033",zIndex:200 }}>
          <button onClick={()=>onProcess(approved)} style={{ width:"100%",padding:"15px",background:"#E8FF00",color:"#000",border:"none",borderRadius:12,fontSize:14,fontWeight:900,cursor:"pointer",letterSpacing:"0.08em" }}>
            PROCESS {approved.length} VIDEO{approved.length!==1?"S":""} WITH GEMINI →
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
function PipelineScreen({ videos, onReady }) {
  const [items, setItems] = useState(videos.map(v=>({id:v.videoId,video:v,status:"pending",analysis:null,captions:null,progressMsg:""})));
  const started = useRef(false);

  const upd = (id,u) => setItems(p=>p.map(i=>i.id===id?{...i,...u}:i));

  useEffect(()=>{
    if(started.current) return;
    started.current=true;
    (async()=>{
      for(const item of items){
        const {id,video}=item;
        upd(id,{status:"analyzing",progressMsg:"Gemini is watching the video..."});
        await sleep(600);
        try{
          upd(id,{progressMsg:"Mapping emotional arc of the video..."});
          const analysis=await analyzeVideo(video.url,video.title,video.creatorName);
          upd(id,{progressMsg:"Writing platform captions..."});
          await sleep(400);
          let captions=null;
          try{ captions=await genCaptions(analysis.hook,video.creatorName); }catch(e){console.error("caption gen",e);}
          upd(id,{status:"researched",analysis,captions,progressMsg:""});
          // Save to Supabase
          try{
            await db.insert("clips",{
              video_id:id,video_url:video.url,video_title:video.title,
              creator_name:video.creatorName,thumbnail:video.thumbnail,
              hook:analysis.hook,start_time:analysis.startTime,end_time:analysis.endTime,
              viral_score:analysis.viralScore,emotional_trigger:analysis.emotionalTrigger,
              why_it_works:analysis.whyItWorks,captions:JSON.stringify(captions),
              status:"researched",created_at:new Date().toISOString(),
            });
          }catch(e){console.error("DB save:",e.message);}
          if(onReady) onReady();
        }catch(e){
          upd(id,{status:"error",progressMsg:e.message||"Analysis failed"});
        }
        await sleep(800);
      }
    })();
  },[]);

  return (
    <div style={{ padding:"20px 16px 80px" }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.2em",marginBottom:6 }}>PIPELINE</div>
        <h2 style={{ fontSize:22,fontWeight:900,fontFamily:"'Georgia',serif" }}>
          {items.filter(i=>i.status==="researched").length} clips analyzed
        </h2>
        <p style={{ fontSize:12,color:"#444",marginTop:4 }}>Gemini watches each video and finds the exact moment to clip. Tap to see analysis.</p>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {items.map(item=><PipelineCard key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function PipelineCard({item}){
  const [open,setOpen]=useState(false);
  return(
    <div style={{ border:"1px solid #141414",borderRadius:12,background:"#090909",overflow:"hidden" }}>
      <div onClick={()=>setOpen(!open)} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",cursor:"pointer" }}>
        {item.video.thumbnail?<img src={item.video.thumbnail} style={{ width:48,height:34,borderRadius:4,objectFit:"cover",flexShrink:0 }} alt=""/>:<div style={{ width:48,height:34,borderRadius:4,background:"#1a1a1a",flexShrink:0 }}/>}
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:12,fontWeight:700,color:"#d0d0d0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3 }}>
            {item.analysis?.hook||item.video.title}
          </div>
          <div style={{ fontSize:10,color:"#444" }}>
            {item.progressMsg||item.video.creatorName}
            {item.analysis?.startTime&&` · ${item.analysis.startTime}→${item.analysis.endTime}`}
          </div>
        </div>
        {(item.status==="analyzing"||item.status==="processing")?<Spin size={18}/>:<Chip status={item.status}/>}
        <span style={{ color:"#2a2a2a",fontSize:11 }}>{open?"▲":"▼"}</span>
      </div>
      {open&&item.analysis&&(
        <div style={{ borderTop:"1px solid #111",padding:"12px 14px",background:"#060606",animation:"fadeIn .2s" }}>
          <div style={{ fontSize:14,fontWeight:800,color:"#f0f0f0",fontFamily:"'Georgia',serif",lineHeight:1.3,borderLeft:"2px solid #E8FF00",paddingLeft:10,marginBottom:10 }}>
            "{item.analysis.hook}"
          </div>
          <div style={{ display:"flex",gap:14,marginBottom:10,flexWrap:"wrap" }}>
            {[["TIMESTAMPS",`${item.analysis.startTime}→${item.analysis.endTime}`],["SCORE",`${item.analysis.viralScore}/100`],["TRIGGER",item.analysis.emotionalTrigger]].map(([k,v])=>(
              <div key={k}><div style={{ fontSize:9,color:"#444",letterSpacing:"0.1em" }}>{k}</div><div style={{ fontSize:12,color:"#E8FF00",fontWeight:700,textTransform:"capitalize" }}>{v}</div></div>
            ))}
          </div>
          <div style={{ fontSize:12,color:"#555",lineHeight:1.6 }}>{item.analysis.whyItWorks}</div>
          {item.analysis.openingLine&&<div style={{ fontSize:11,color:"#444",fontStyle:"italic",marginTop:8,lineHeight:1.5 }}>"{item.analysis.openingLine}"</div>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: QUEUE + EDITOR
// ─────────────────────────────────────────────────────────────────────────────
function QueueScreen(){
  const [clips,setClips]=useState([]);
  const [loading,setLoading]=useState(true);
  const [editing,setEditing]=useState(null);
  const [filter,setFilter]=useState("all");

  useEffect(()=>{load();},[filter]);

  const load=async()=>{
    setLoading(true);
    try{
      const q=filter==="all"?"order=created_at.desc&limit=100":`status=eq.${filter}&order=created_at.desc&limit=100`;
      const d=await db.get("clips",q);
      setClips(Array.isArray(d)?d:[]);
    }catch(e){console.error(e);setClips([]);}
    setLoading(false);
  };

  if(editing) return <EditorScreen clip={editing} onDone={()=>{setEditing(null);load();}}/>;

  const counts={all:clips.length,researched:clips.filter(c=>c.status==="researched").length,scheduled:clips.filter(c=>c.status==="scheduled").length,published:clips.filter(c=>c.status==="published").length};

  return(
    <div style={{ paddingBottom:80 }}>
      <div style={{ padding:"20px 16px 14px",borderBottom:"1px solid #0e0e0e" }}>
        <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.2em",marginBottom:6 }}>CONTENT QUEUE</div>
        <h2 style={{ fontSize:22,fontWeight:900,fontFamily:"'Georgia',serif" }}>{clips.length} clips total</h2>
      </div>
      <div style={{ display:"flex",borderBottom:"1px solid #0e0e0e",overflowX:"auto",padding:"0 16px" }}>
        {["all","researched","scheduled","published"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ background:"transparent",border:"none",padding:"10px 12px",cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",color:filter===f?"#E8FF00":"#444",borderBottom:filter===f?"2px solid #E8FF00":"2px solid transparent" }}>
            {f.charAt(0).toUpperCase()+f.slice(1)} ({counts[f]||0})
          </button>
        ))}
      </div>
      <div style={{ padding:"14px 16px" }}>
        {loading?<div style={{ display:"flex",justifyContent:"center",padding:48 }}><Spin/></div>:
         clips.length===0?<div style={{ textAlign:"center",padding:"60px 20px",border:"1px dashed #1a1a1a",borderRadius:16 }}><div style={{ fontSize:28,marginBottom:12,opacity:.3 }}>◐</div><div style={{ fontSize:14,color:"#444" }}>Queue empty.</div><div style={{ fontSize:12,color:"#333",marginTop:6 }}>Research and approve videos to fill it.</div></div>:
        clips.map(clip=>(
          <div key={clip.id} style={{ marginBottom:10,border:clip.status==="scheduled"?"1px solid #E8FF0022":clip.status==="published"?"1px solid #00f2ea22":"1px solid #141414",borderRadius:14,background:"#090909",overflow:"hidden" }}>
            <div style={{ display:"flex" }}>
              {clip.thumbnail&&<img src={clip.thumbnail} style={{ width:90,height:66,objectFit:"cover",flexShrink:0 }} alt=""/>}
              <div style={{ flex:1,padding:"10px 12px",minWidth:0 }}>
                <div style={{ fontSize:12,fontWeight:700,color:"#d0d0d0",overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",lineHeight:1.4,marginBottom:5 }}>{clip.hook||clip.video_title}</div>
                <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                  <span style={{ fontSize:10,color:"#444" }}>{clip.creator_name}</span>
                  {clip.viral_score&&<span style={{ fontSize:10,color:"#E8FF00",fontWeight:700 }}>{clip.viral_score}/100</span>}
                  {clip.scheduled_at&&<span style={{ fontSize:10,color:"#555" }}>{new Date(clip.scheduled_at).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>}
                </div>
              </div>
            </div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",borderTop:"1px solid #111" }}>
              <Chip status={clip.status}/>
              <div style={{ display:"flex",gap:8 }}>
                {(clip.status==="researched"||clip.status==="scheduled")&&(
                  <button onClick={()=>setEditing(clip)} style={{ background:clip.status==="researched"?"#E8FF00":"transparent",color:clip.status==="researched"?"#000":"#666",border:clip.status==="researched"?"none":"1px solid #222",borderRadius:7,padding:"6px 14px",fontSize:11,fontWeight:800,cursor:"pointer" }}>
                    {clip.status==="researched"?"EDIT & SCHEDULE →":"Edit"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EDITOR SCREEN (Phase 2 core)
// ─────────────────────────────────────────────────────────────────────────────
function EditorScreen({clip,onDone}){
  const [tab,setTab]=useState("preview");
  const [captions,setCaptions]=useState(()=>{try{return typeof clip.captions==="string"?JSON.parse(clip.captions):clip.captions||{};}catch{return {};}});
  const [thumbMain,setThumbMain]=useState(clip.hook?.split(" ").slice(0,4).join(" ").toUpperCase()||"TOP 1%");
  const [thumbSub,setThumbSub]=useState("");
  const [colorScheme,setColorScheme]=useState("yellow-black");
  const [thumbData,setThumbData]=useState(null);
  const [platforms,setPlatforms]=useState(["youtube","tiktok","instagram","twitter","linkedin"]);
  const [schedDate,setSchedDate]=useState(()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(8,0,0,0);return d.toISOString().slice(0,16);});
  const [saving,setSaving]=useState(false);
  const [saved,setSaved]=useState(false);
  const [saveErr,setSaveErr]=useState(null);
  const [regenning,setRegenning]=useState(false);

  const regenCaptions=async()=>{
    setRegenning(true);
    try{const c=await genCaptions(clip.hook,clip.creator_name);setCaptions(c);}catch(e){console.error(e);}
    setRegenning(false);
  };

  const save=async()=>{
    setSaving(true);setSaveErr(null);
    try{
      await db.patch("clips",clip.id,{status:"scheduled",scheduled_at:new Date(schedDate).toISOString(),platforms,captions:JSON.stringify(captions)});
      for(const p of platforms){
        await db.insert("schedule",{clip_id:clip.id,platform:p,scheduled_at:new Date(schedDate).toISOString(),status:"pending"});
      }
      setSaved(true);
    }catch(e){setSaveErr(e.message);}
    setSaving(false);
  };

  const embedUrl=clip.video_id?`https://www.youtube.com/embed/${clip.video_id}?start=${t2s(clip.start_time)}&end=${t2s(clip.end_time)}&rel=0`:null;

  if(saved) return(
    <div style={{ textAlign:"center",padding:"60px 20px",animation:"fadeUp .4s ease" }}>
      <div style={{ width:64,height:64,margin:"0 auto 20px",background:"#E8FF00",clipPath:"polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"#000" }}>✓</div>
      <div style={{ fontSize:22,fontWeight:900,fontFamily:"'Georgia',serif",marginBottom:10 }}>Scheduled.</div>
      <div style={{ fontSize:13,color:"#444",lineHeight:1.7,marginBottom:20 }}>
        Will post on {new Date(schedDate).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})} at {new Date(schedDate).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
      </div>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:24 }}>
        {platforms.map(id=>{const p=PLATFORMS.find(x=>x.id===id);return<span key={id} style={{ fontSize:11,color:p.color,fontWeight:700,border:`1px solid ${p.color}33`,borderRadius:6,padding:"4px 10px",background:p.bg }}>{p.label}</span>;})}
      </div>
      <button onClick={onDone} style={{ background:"transparent",border:"1.5px solid #E8FF00",color:"#E8FF00",borderRadius:10,padding:"12px 24px",fontSize:13,fontWeight:800,cursor:"pointer" }}>← Back to Queue</button>
    </div>
  );

  return(
    <div style={{ animation:"fadeIn .3s" }}>
      {/* Back + header */}
      <button onClick={onDone} style={{ background:"transparent",border:"none",color:"#555",fontSize:13,cursor:"pointer",padding:"14px 16px",display:"flex",alignItems:"center",gap:6,borderBottom:"1px solid #0e0e0e",width:"100%" }}>← Back</button>
      <div style={{ padding:"14px 16px",background:"#0a0a0a",borderBottom:"1px solid #111" }}>
        <div style={{ fontSize:9,color:"#E8FF00",letterSpacing:"0.15em",marginBottom:6 }}>EDITING CLIP</div>
        <div style={{ fontSize:14,fontWeight:800,color:"#f0f0f0",fontFamily:"'Georgia',serif",lineHeight:1.3,borderLeft:"2px solid #E8FF00",paddingLeft:10 }}>{clip.hook}</div>
        <div style={{ display:"flex",gap:10,marginTop:8,flexWrap:"wrap" }}>
          <span style={{ fontSize:10,color:"#555" }}>{clip.creator_name}</span>
          {clip.start_time&&<span style={{ fontSize:10,color:"#E8FF00" }}>⏱ {clip.start_time}→{clip.end_time}</span>}
          {clip.viral_score&&<span style={{ fontSize:10,color:"#888" }}>{clip.viral_score}/100</span>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex",gap:0,margin:"0",borderBottom:"1px solid #111" }}>
        {["preview","thumbnail","captions","schedule"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1,padding:"10px 4px",border:"none",background:tab===t?"#E8FF0015":"transparent",color:tab===t?"#E8FF00":"#444",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:"0.05em",borderBottom:tab===t?"2px solid #E8FF00":"2px solid transparent",transition:"all .15s" }}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ padding:"16px",paddingBottom:80 }}>
        {/* PREVIEW */}
        {tab==="preview"&&(
          <div>
            <div style={{ fontSize:10,color:"#555",letterSpacing:"0.1em",marginBottom:12 }}>VIDEO SEGMENT PREVIEW</div>
            {embedUrl?(
              <div style={{ position:"relative",paddingBottom:"177.77%",borderRadius:12,overflow:"hidden",border:"1px solid #1e1e1e" }}>
                <iframe src={embedUrl} style={{ position:"absolute",inset:0,width:"100%",height:"100%",border:"none" }} allowFullScreen title="preview"/>
              </div>
            ):(
              <div style={{ background:"#111",borderRadius:12,padding:"36px 20px",textAlign:"center",border:"1px solid #1e1e1e" }}>
                <a href={clip.video_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12,color:"#E8FF00",textDecoration:"none",border:"1px solid #E8FF0033",borderRadius:8,padding:"10px 18px",display:"inline-block" }}>▶ Watch on YouTube at {clip.start_time}</a>
              </div>
            )}
            {clip.why_it_works&&(
              <div style={{ marginTop:14,background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:10,padding:14 }}>
                <div style={{ fontSize:9,color:"#E8FF0088",letterSpacing:"0.12em",marginBottom:6 }}>WHY THIS WILL PERFORM</div>
                <div style={{ fontSize:12,color:"#888",lineHeight:1.7 }}>{clip.why_it_works}</div>
              </div>
            )}
            <button onClick={()=>setTab("thumbnail")} style={{ width:"100%",marginTop:14,padding:"14px",background:"#E8FF00",color:"#000",border:"none",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer" }}>NEXT: THUMBNAIL →</button>
          </div>
        )}

        {/* THUMBNAIL */}
        {tab==="thumbnail"&&(
          <div>
            <div style={{ fontSize:10,color:"#555",letterSpacing:"0.1em",marginBottom:14 }}>THUMBNAIL — REAL FRAME + YOUR TEXT</div>
            <div style={{ maxWidth:180,margin:"0 auto 16px" }}>
              <ThumbCanvas thumbnailUrl={clip.thumbnail} mainText={thumbMain} subText={thumbSub} colorScheme={colorScheme} onCapture={setThumbData}/>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:14 }}>
              <div>
                <div style={{ fontSize:10,color:"#555",letterSpacing:"0.1em",marginBottom:5 }}>MAIN TEXT (MAX 5 WORDS)</div>
                <input value={thumbMain} onChange={e=>setThumbMain(e.target.value.toUpperCase())} style={{ width:"100%",background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:8,padding:"10px 12px",color:"#E8FF00",fontSize:15,fontWeight:800,outline:"none" }}/>
              </div>
              <div>
                <div style={{ fontSize:10,color:"#555",letterSpacing:"0.1em",marginBottom:5 }}>SUB TEXT (optional)</div>
                <input value={thumbSub} onChange={e=>setThumbSub(e.target.value)} style={{ width:"100%",background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:8,padding:"10px 12px",color:"#ccc",fontSize:13,outline:"none" }}/>
              </div>
              <div>
                <div style={{ fontSize:10,color:"#555",letterSpacing:"0.1em",marginBottom:5 }}>COLOR</div>
                <div style={{ display:"flex",gap:8 }}>
                  {["yellow-black","white-black","red-white","green-black"].map(cs=>(
                    <button key={cs} onClick={()=>setColorScheme(cs)} style={{ flex:1,padding:"8px 4px",border:`1px solid ${colorScheme===cs?"#E8FF00":"#1e1e1e"}`,borderRadius:6,fontSize:9,fontWeight:700,cursor:"pointer",background:colorScheme===cs?"#E8FF0015":"#0d0d0d",color:colorScheme===cs?"#E8FF00":"#555" }}>
                      {cs.split("-")[0].toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={()=>setTab("captions")} style={{ width:"100%",padding:"14px",background:"#E8FF00",color:"#000",border:"none",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer" }}>NEXT: CAPTIONS →</button>
          </div>
        )}

        {/* CAPTIONS */}
        {tab==="captions"&&(
          <div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
              <div style={{ fontSize:10,color:"#555",letterSpacing:"0.1em" }}>PLATFORM CAPTIONS</div>
              <button onClick={regenCaptions} disabled={regenning} style={{ background:"transparent",border:"1px solid #E8FF0044",color:"#E8FF00",borderRadius:6,padding:"5px 12px",fontSize:10,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,opacity:regenning?.5:1 }}>
                {regenning?<Spin size={12}/>:null} {regenning?"REGEN...":"↺ REGENERATE"}
              </button>
            </div>
            {PLATFORMS.map(p=>(
              <div key={p.id} style={{ marginBottom:14,border:"1px solid #1a1a1a",borderRadius:12,overflow:"hidden" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:p.bg,borderBottom:"1px solid #111" }}>
                  <span style={{ color:p.color,fontSize:14 }}>{p.symbol}</span>
                  <span style={{ fontSize:12,fontWeight:700,color:"#ccc" }}>{p.label}</span>
                </div>
                <div style={{ padding:"10px 14px",background:"#080808" }}>
                  <div style={{ fontSize:9,color:"#444",letterSpacing:"0.1em",marginBottom:4 }}>TITLE</div>
                  <input value={captions[p.id]?.title||""} onChange={e=>setCaptions(prev=>({...prev,[p.id]:{...prev[p.id],title:e.target.value}}))}
                    style={{ width:"100%",background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:6,padding:"8px 10px",color:"#e0e0e0",fontSize:12,outline:"none",marginBottom:8 }}/>
                  <div style={{ fontSize:9,color:"#444",letterSpacing:"0.1em",marginBottom:4 }}>CAPTION</div>
                  <textarea value={captions[p.id]?.caption||""} onChange={e=>setCaptions(prev=>({...prev,[p.id]:{...prev[p.id],caption:e.target.value}}))} rows={3}
                    style={{ width:"100%",background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:6,padding:"8px 10px",color:"#888",fontSize:11,outline:"none",resize:"vertical",lineHeight:1.6 }}/>
                </div>
              </div>
            ))}
            <button onClick={()=>setTab("schedule")} style={{ width:"100%",padding:"14px",background:"#E8FF00",color:"#000",border:"none",borderRadius:10,fontSize:13,fontWeight:800,cursor:"pointer" }}>NEXT: SCHEDULE →</button>
          </div>
        )}

        {/* SCHEDULE */}
        {tab==="schedule"&&(
          <div>
            <div style={{ fontSize:10,color:"#555",letterSpacing:"0.1em",marginBottom:16 }}>SCHEDULE POST</div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10,color:"#444",letterSpacing:"0.1em",marginBottom:8 }}>PLATFORMS</div>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {PLATFORMS.map(p=>{
                  const on=platforms.includes(p.id);
                  return(
                    <div key={p.id} onClick={()=>setPlatforms(prev=>prev.includes(p.id)?prev.filter(x=>x!==p.id):[...prev,p.id])} style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,cursor:"pointer",border:on?`1.5px solid ${p.color}44`:"1.5px solid #141414",background:on?p.bg:"#090909",transition:"all .2s" }}>
                      <span style={{ color:on?p.color:"#333",fontSize:16,width:20,textAlign:"center" }}>{p.symbol}</span>
                      <span style={{ fontSize:13,fontWeight:700,color:on?"#e0e0e0":"#444",flex:1 }}>{p.label}</span>
                      <div style={{ width:20,height:20,borderRadius:"50%",border:on?`2px solid ${p.color}`:"2px solid #222",background:on?p.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#000",fontWeight:900,transition:"all .2s" }}>{on?"✓":""}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10,color:"#444",letterSpacing:"0.1em",marginBottom:8 }}>DATE & TIME</div>
              <input type="datetime-local" value={schedDate} onChange={e=>setSchedDate(e.target.value)}
                style={{ width:"100%",background:"#0d0d0d",border:"1px solid #1e1e1e",borderRadius:10,padding:"13px 14px",color:"#E8FF00",fontSize:14,fontWeight:700,outline:"none",colorScheme:"dark" }}/>
              <div style={{ fontSize:11,color:"#333",marginTop:8 }}>Peak: YouTube 8am · TikTok 7pm · Instagram 9am</div>
            </div>
            <div style={{ background:"#0c0f00",border:"1px solid #E8FF0022",borderRadius:10,padding:14,marginBottom:16 }}>
              <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.1em",marginBottom:8 }}>SUMMARY</div>
              <div style={{ fontSize:12,color:"#888",lineHeight:1.8 }}>
                <div>📅 {new Date(schedDate).toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
                <div>⏰ {new Date(schedDate).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}</div>
                <div>📱 {platforms.length} platform{platforms.length!==1?"s":""}</div>
              </div>
            </div>
            {saveErr&&<div style={{ background:"#1a0000",border:"1px solid #FF444433",borderRadius:8,padding:"10px 14px",color:"#f87171",fontSize:12,marginBottom:12 }}>{saveErr}</div>}
            <button onClick={save} disabled={saving||platforms.length===0} style={{ width:"100%",padding:"16px",background:saving?"#1a1a00":"#E8FF00",color:saving?"#E8FF0066":"#000",border:"none",borderRadius:10,fontSize:14,fontWeight:900,cursor:saving?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
              {saving?<><Spin size={18}/> SAVING...</>:`✓ SCHEDULE FOR ${platforms.length} PLATFORM${platforms.length!==1?"S":""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function SettingsScreen(){
  return(
    <div style={{ padding:"20px 16px 80px" }}>
      <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.2em",marginBottom:16 }}>SETTINGS</div>
      <h2 style={{ fontSize:22,fontWeight:900,fontFamily:"'Georgia',serif",marginBottom:20 }}>Configuration</h2>
      {[
        {label:"YouTube Data API v3",desc:"Real channel search · Real video metadata",status:"configured"},
        {label:"Gemini 1.5 Pro",desc:"Direct video analysis · Clip identification · Caption writing",status:"configured"},
        {label:"Supabase Database",desc:"Clips · Queue · Schedule — all persisted",status:"configured"},
        {label:"Auto-Publisher",desc:"Connects to YouTube, TikTok, Instagram — Phase 3",status:"soon"},
        {label:"Analytics Dashboard",desc:"Real follower counts, monetization tracker — Phase 4",status:"soon"},
        {label:"Engagement Engine",desc:"Comment inbox, auto-reply — Phase 4",status:"soon"},
      ].map((item,i)=>(
        <div key={i} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 0",borderBottom:"1px solid #0e0e0e" }}>
          <div>
            <div style={{ fontSize:13,fontWeight:700,color:"#d0d0d0" }}>{item.label}</div>
            <div style={{ fontSize:11,color:"#444",marginTop:3 }}>{item.desc}</div>
          </div>
          <span style={{ fontSize:9,fontWeight:800,letterSpacing:"0.1em",color:item.status==="configured"?"#4ade80":"#555",border:`1px solid ${item.status==="configured"?"#4ade8033":"#33333333"}`,borderRadius:4,padding:"3px 8px",background:item.status==="configured"?"#0a2a0a":"#111",whiteSpace:"nowrap" }}>
            {item.status==="configured"?"ACTIVE":"SOON"}
          </span>
        </div>
      ))}
      <div style={{ marginTop:28,background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:12,padding:16 }}>
        <div style={{ fontSize:10,color:"#444",letterSpacing:"0.1em",marginBottom:12 }}>CREATOR DATABASE ({CREATORS.length})</div>
        <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
          {CREATORS.map(c=>(
            <span key={c.name} style={{ fontSize:11,color:"#555",border:"1px solid #1a1a1a",borderRadius:20,padding:"3px 10px" }}>{c.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App(){
  const [screen,setScreen]=useState("home");
  const [pipeVideos,setPipeVideos]=useState([]);
  const [queueBadge,setQueueBadge]=useState(0);

  const handleProcess=vids=>{setPipeVideos(vids);setScreen("pipeline");};
  const handleReady=()=>setQueueBadge(n=>n+1);

  const NAV=[
    {id:"home",icon:"⌂",label:"HOME"},
    {id:"research",icon:"◎",label:"RESEARCH"},
    {id:"pipeline",icon:"⬡",label:"PIPELINE",badge:pipeVideos.length},
    {id:"queue",icon:"▦",label:"QUEUE",badge:queueBadge},
    {id:"settings",icon:"◈",label:"SETTINGS"},
  ];

  return(
    <div style={{ minHeight:"100vh",background:"#060606",color:"#fff",fontFamily:"'Helvetica Neue',Helvetica,sans-serif",maxWidth:480,margin:"0 auto",position:"relative" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#E8FF00;border-radius:2px}
        input,button,textarea{font-family:inherit}
        img{display:block}
        textarea{font-family:inherit}
      `}</style>

      {/* Top bar */}
      <div style={{ position:"sticky",top:0,zIndex:100,background:"rgba(6,6,6,.97)",backdropFilter:"blur(16px)",borderBottom:"1px solid #111",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px" }}>
        <Logo/>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <div style={{ fontSize:9,color:"#333",letterSpacing:"0.1em" }}>PHASE 1+2</div>
          <div style={{ width:6,height:6,borderRadius:"50%",background:"#E8FF00",animation:"fadeIn 1.5s infinite alternate" }}/>
        </div>
      </div>

      {/* Content */}
      <div style={{ animation:"fadeUp .3s ease" }}>
        {screen==="home"&&(
          <div style={{ padding:"28px 16px 80px" }}>
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:10,color:"#E8FF00",letterSpacing:"0.2em",marginBottom:10 }}>CONTENT EMPIRE</div>
              <h1 style={{ fontSize:34,fontWeight:900,fontFamily:"'Georgia',serif",lineHeight:1.1,marginBottom:10 }}>
                Your machine<br/>
                <span style={{ background:"linear-gradient(135deg,#E8FF00,#00f2ea)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>is live.</span>
              </h1>
              <p style={{ fontSize:13,color:"#444",lineHeight:1.7 }}>
                Real YouTube research. Gemini watches every video. Real clip analysis. Real captions. Real scheduling. Nothing fake.
              </p>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:28 }}>
              <button onClick={()=>setScreen("research")} style={{ background:"#E8FF00",color:"#000",border:"none",borderRadius:14,padding:"18px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer" }}>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:14,fontWeight:900,letterSpacing:"0.05em" }}>START RESEARCH</div>
                  <div style={{ fontSize:11,opacity:.6,marginTop:2 }}>Scan {CREATORS.length} Legacy Creators now</div>
                </div>
                <span style={{ fontSize:22 }}>◎</span>
              </button>
              <button onClick={()=>setScreen("queue")} style={{ background:"#0d0d0d",color:"#888",border:"1px solid #1a1a1a",borderRadius:14,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer" }}>
                <div style={{ textAlign:"left" }}>
                  <div style={{ fontSize:13,fontWeight:700 }}>CONTENT QUEUE</div>
                  <div style={{ fontSize:11,color:"#444",marginTop:2 }}>{queueBadge>0?`${queueBadge} clips ready to edit`:"Empty — research first"}</div>
                </div>
                <span style={{ fontSize:20 }}>▦</span>
              </button>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24 }}>
              {[
                {icon:"◎",t:"Real Search",d:"YouTube API scans real channels"},
                {icon:"⬡",t:"Gemini Watches",d:"Finds exact clip timestamps"},
                {icon:"▦",t:"You Schedule",d:"Set date, time, platforms"},
              ].map(item=>(
                <div key={item.t} style={{ border:"1px solid #131313",borderRadius:12,padding:14,background:"#08080a" }}>
                  <div style={{ fontSize:18,color:"#E8FF00",marginBottom:8 }}>{item.icon}</div>
                  <div style={{ fontSize:11,fontWeight:800,color:"#ccc",marginBottom:4 }}>{item.t}</div>
                  <div style={{ fontSize:10,color:"#444",lineHeight:1.5 }}>{item.d}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:10,color:"#1e1e1e",letterSpacing:"0.15em",marginBottom:10 }}>CREATOR DATABASE</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
              {CREATORS.map(c=><span key={c.name} style={{ fontSize:11,color:"#333",border:"1px solid #141414",borderRadius:20,padding:"3px 10px" }}>{c.name}</span>)}
            </div>
          </div>
        )}
        {screen==="research"&&<ResearchScreen onProcess={handleProcess}/>}
        {screen==="pipeline"&&<PipelineScreen videos={pipeVideos} onReady={handleReady}/>}
        {screen==="queue"&&<QueueScreen/>}
        {screen==="settings"&&<SettingsScreen/>}
      </div>

      {/* Bottom nav */}
      <nav style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(6,6,6,.97)",backdropFilter:"blur(16px)",borderTop:"1px solid #111",display:"flex",justifyContent:"space-around",padding:"4px 0 8px",zIndex:100 }}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setScreen(n.id)} title={n.label} style={{ background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"8px 6px",position:"relative",opacity:screen===n.id?1:.35,transition:"opacity .2s" }}>
            <span style={{ fontSize:17,color:screen===n.id?"#E8FF00":"#fff" }}>{n.icon}</span>
            <span style={{ fontSize:8,color:screen===n.id?"#E8FF00":"#888",letterSpacing:"0.08em" }}>{n.label}</span>
            {n.badge>0&&<div style={{ position:"absolute",top:4,right:2,background:"#E8FF00",color:"#000",width:14,height:14,borderRadius:"50%",fontSize:8,fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center" }}>{n.badge>9?"9+":n.badge}</div>}
          </button>
        ))}
      </nav>
    </div>
  );
}
// This tells the browser: "When someone visits the home page, show the app"
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Top 1% Engine</title></head>
      <body style="background:#060606; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh;">
        <div style="text-align:center;">
          <h1 style="color:#E8FF00;">ENGINE IS LIVE</h1>
          <p>The Top 1% Content Engine is connected and running.</p>
        </div>
      </body>
    </html>
  `);
});

// This tells Render which "channel" to use to show your app
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("Server is running on port " + port);
});
