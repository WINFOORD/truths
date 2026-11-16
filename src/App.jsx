import {useEffect,useMemo,useState} from 'react'
import {sb} from './supabase'

const HOST_PIN=import.meta.env.VITE_PIN_ALI
const BOT=import.meta.env.VITE_BOT_USERNAME
const L=['الف','ب','ج']
const rnd=a=>a[Math.floor(Math.random()*a.length)]
const buzz=n=>{try{navigator.vibrate&&navigator.vibrate(n||12)}catch(e){}}
const digits=s=>(s||'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim()
const pad=n=>String(n).padStart(2,'0')
const MONTHS=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند']
const normDate=s=>{
  const p=digits(s).split(/\D+/).filter(Boolean)
  if(p.length!==3) return ''
  let [y,m,d]=p
  if(y.length<=2)[y,d]=[d,y]
  return `${y}-${pad(m)}-${pad(d)}`
}
const fmtDate=s=>{const [y,m,d]=(s||'').split('-');return y?`${+d} ${MONTHS[+m-1]||''} ${y}`:''}
const norm=s=>(s||'').trim().toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/[\u200c\s]+/g,'')
const notify=(type,id)=>fetch('/api/notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,id})}).catch(()=>{})

const P={
  play:'M7 4.8v14.4a1 1 0 001.5.86l11.6-7.2a1 1 0 000-1.72L8.5 3.94A1 1 0 007 4.8z',
  pen:'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z',
  user:'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  spark:'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z',
  trash:'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
  check:'M5 12.5l4.5 4.5L19 7',
  x:'M6 6l12 12M18 6L6 18',
  refresh:'M20 12a8 8 0 11-2.4-5.7M20 4v5h-5',
  out:'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h9',
  copy:'M9 9h11v11H9zM5 15V5h10',
  gear:'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z',
  help:'M9.5 9a2.5 2.5 0 114 2c-.9.7-1.5 1.2-1.5 2.3M12 17h.01'
}
const Ic=({n,s=22})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={P[n]}/></svg>

const IDEAS=[
  {e:'🧸',c:'گذشته',p:'یک خاطره‌ی بچگی',h:'یک جزئیات دقیق مثل اسم یا مکان بگو؛ همین باورپذیرش می‌کند.',ex:'هفت‌ساله بودم که وسط بازار گم شدم.',lies:['بچه بودم با دوچرخه تا شهر بغلی رفتم.','در بچگی یک لاک‌پشت داشتم به اسم ناصرالدین.','کلاس اول سر کلاس خوابم برد و معلم نفهمید.','یک بار توی پارک یک سنجاب دنبالم کرد.']},
  {e:'🎻',c:'استعداد',p:'یک مهارت یا ساز',h:'مهارتی که کسی انتظارش را ندارد، هم بهترین حقیقت است هم بهترین دروغ.',ex:'می‌توانم سه‌تار بزنم.',lies:['می‌توانم با پا نقاشی بکشم.','سه سال پیانو یاد گرفتم و ولش کردم.','یک بار در یک مسابقه‌ی استعدادیابی شرکت کردم.','می‌توانم سه توپ را هم‌زمان در هوا نگه دارم.']},
  {e:'🧳',c:'سفر',p:'جایی که رفته‌ای',h:'جایی را انتخاب کن که یک داستان کوتاه ازش داری.',ex:'یک شب را توی ایستگاه قطار خوابیدم.',lies:['یک بار تنهایی رفتم کوه و راه را گم کردم.','دو هفته در روستایی بدون اینترنت زندگی کردم.','یک بار با اتوبوس اشتباهی رفتم شهر دیگر.','تنهایی رفته‌ام سفر خارجی.']},
  {e:'🙈',c:'قرار',p:'یک لحظه‌ی خجالت‌آور سر قرار',h:'کمی خودمانی بودن حس صمیمیت می‌دهد.',ex:'یک بار اسم طرف مقابل را اشتباه صدا زدم.',lies:['یک بار قهوه‌ام را روی خودم ریختم.','یک بار قرار را فراموش کردم و دیر رسیدم.','یک بار رستوران را اشتباه رفتم.','یک بار سر قرار شارژ گوشی‌ام تمام شد و گم شدم.']},
  {e:'🍕',c:'غذا',p:'یک سلیقه‌ی غذایی',h:'سلیقه‌های عجیب خیلی راحت بحث باز می‌کنند.',ex:'پیتزای آناناسی را دوست دارم.',lies:['هیچ‌وقت سوشی نخورده‌ام.','قهوه را بی‌شکر می‌خورم.','صبحانه را بیشتر از شام دوست دارم.','از شکلات متنفرم.']},
  {e:'🕷️',c:'ترس',p:'یک ترس کوچک',h:'ترس‌های بامزه بهتر از ترس‌های جدی‌اند.',ex:'از سوسک بیشتر از ارتفاع می‌ترسم.',lies:['از تاریکی می‌ترسم.','از آسانسور می‌ترسم.','از عروسک‌ها می‌ترسم.','از صحبت جلوی جمع می‌ترسم.']},
  {e:'🌙',c:'رؤیا',p:'یک رؤیای نیمه‌تمام',h:'اینجا می‌توانی کمی عمیق‌تر شوی.',ex:'می‌خواهم یک روز کافه‌کتاب باز کنم.',lies:['می‌خواهم یک روز دور دنیا سفر کنم.','می‌خواهم یک کتاب بنویسم.','می‌خواهم یک روز در یک جزیره زندگی کنم.','می‌خواهم یک خانه‌ی چوبی در جنگل بسازم.']},
  {e:'🌀',c:'عادت',p:'یک عادت عجیب',h:'عادت‌های کوچک شخصیت را نشان می‌دهند.',ex:'قبل خواب یک آهنگ را چند بار گوش می‌دهم.',lies:['با خودم بلند حرف می‌زنم.','هر صبح اول یک لیوان آب می‌خورم.','وقتی استرس دارم ناخنم را می‌جوم.','هر شب قبل خواب گوشی‌ام را چند بار چک می‌کنم.']}
]
const TIPS=[
  'دروغ‌ها را هم‌سبک جمله‌ی حقیقت بنویس تا حدس زدن بازی باشد، نه معما.',
  'حقیقتی را انتخاب کن که یک داستان جذاب پشتش داری.',
  'از «همیشه» و «هیچ‌وقت» کمتر استفاده کن؛ لو می‌دهند.',
  'یک دروغ نزدیک به واقعیت از یک دروغ عجیب بهتر کار می‌کند.'
]
const CHIPS=[
  '🫡 چالش پذیرفته شد',
  '🕵️‍♀️ این سؤال‌ها رو کی نوشته؟ بازجویی لازمه',
  '😏 دارم تو ذهنت نفوذ می‌کنم',
  '🥶 سؤال آخرت منو لو داد',
  '🔥 سؤال بعدی رو زودتر بنویس',
  '☕ بعد از این بازی یه قهوه بهم بدهکاری',
  '💀 دروغ سومت رو چطور باور کردم',
  '👀 یه چیزی هست که هنوز بهت نگفتم',
  '🫶 ممنون که اینو ساختی'
]
const HELP={
  play:['دو تا از این سه جمله دروغه 🕵️','روی دو جمله‌ای که فکر می‌کنی دروغه بزن؛ با انتخاب دومی جواب خودکار ثبت می‌شه.','جمله‌ی سوم حقیقته و بعدش داستانش رو می‌بینی 📖'],
  w0:['اینجا موضوع سؤال رو انتخاب می‌کنی 🎯','«آماده بساز» یه سؤال کامل می‌سازه؛ بعدش هر چی خواستی عوضش کن ⚡','«ایده‌ی دیگر» یه موضوع جدید می‌ده.'],
  w1:['سه جمله بنویس: یکی حقیقت، دو تا دروغ 🎭','روی دکمه‌ی کنار هر جمله بزن تا حقیقت رو مشخص کنی.','حوصله نداری؟ «دو دروغ آماده» رو بزن 🎲'],
  w2:['داستان حقیقت رو اینجا بنویس 📖','بعد از اینکه طرف جواب داد، همین نشون داده می‌شه.','دستیار پایین می‌گه سؤالت چقدر خوبه ✨'],
  me:['اینجا سؤال‌ها و جواب‌هاشون رو می‌بینی 👀','روی هر سؤال بزن تا ویرایش یا حذفش کنی.','برای حرف زدن مستقیم، دکمه‌ی «پیام» رو بزن 💌']
}
function advise(f){
  const s=f.s.map(x=>x.trim())
  if(s.some(x=>!x)) return [{ok:false,t:'هر سه جمله را بنویس تا بررسی کنم.'}]
  const out=[],len=s.map(x=>x.length),mx=Math.max(...len),mn=Math.min(...len)
  if(IDEAS.some(i=>i.ex===s[f.truth])) out.push('این جمله‌ی نمونه است؛ اگه برای تو درست نیست، عوضش کن.')
  if(len[f.truth]===mx&&mx>mn*1.4) out.push('حقیقتت از بقیه طولانی‌تر است و راحت لو می‌رود.')
  else if(mx>mn*2.2) out.push('طول جمله‌ها خیلی فرق دارد؛ کمی نزدیکشان کن.')
  if(new Set(s).size<3) out.push('دو جمله خیلی شبیه هم هستند.')
  if(!f.story.trim()) out.push('یک داستان کوتاه برای حقیقت بنویس تا بعد از جواب تعریفش کنی.')
  return out.length?out.map(t=>({ok:false,t})):[{ok:true,t:'عالی است. جمله‌ها هم‌وزن و باورپذیرند. ✨'}]
}
const WIN=['دقیقاً همین بود 🎯','چه حدس خوبی 😏','ذهنت تیز است ⚡','داری منو می‌خونی 👀']
const LOSE=['گول خوردی 😈','نزدیک بودی 🙈','سخت بود، قبول 😅']
const BAD=['نه، دوباره فکر کن 😏','هنوز نه! تو که یادته 😄','اینقدرها هم سخت نیست 🙃']
const FORGOT=['مگه می‌شه سال تولدت یادت بره؟ ما که یادمونه 😏','باشه، یه راهنمایی: یه عدد چهار رقمیه. بیشتر از این نمی‌گم 🤐','اگه واقعاً یادت نیست، به علی پیام بده. اون یادشه 😌']

function useType(text,speed=16){
  const [o,setO]=useState('')
  useEffect(()=>{setO('');let i=0;const t=setInterval(()=>{i++;setO(text.slice(0,i));if(i>=text.length)clearInterval(t)},speed);return()=>clearInterval(t)},[text])
  return o
}
function Confetti({n=46}){
  const ps=useMemo(()=>Array.from({length:n},(_,i)=>({x:(Math.random()-.5)*360,y:-(140+Math.random()*260),r:Math.random()*720-360,d:Math.random()*.3,c:['#f0d9a5','#d4b476','#fff7e6','#a3394a','#9b7be0'][i%5],w:6+Math.random()*6})),[])
  return <div className="confetti">{ps.map((p,i)=><i key={i} style={{'--x':p.x+'px','--y':p.y+'px','--r':p.r+'deg',animationDelay:p.d+'s',background:p.c,width:p.w,height:p.w*1.6}}/>)}</div>
}
const Bg=()=><div className="bg"><i/><i/></div>
function Tip({k}){
  const [on,setOn]=useState(!localStorage.getItem('tip_'+k))
  if(!on) return null
  return <div className="tip rise"><div>{HELP[k].map((t,i)=><div key={i} className={i?'':'t1'}>{t}</div>)}</div><button onClick={()=>{localStorage.setItem('tip_'+k,'1');setOn(false)}}>فهمیدم</button></div>
}

export default function App(){
  const [sess,setSess]=useState(()=>{try{return JSON.parse(localStorage.getItem('sess'))}catch(e){return null}})
  const [tab,setTab]=useState('play'),[edit,setEdit]=useState(null),[nonce,setNonce]=useState(0),[toast,setToast]=useState('')
  const say=m=>{setToast(m);setTimeout(()=>setToast(''),2600)}
  const login=s=>{localStorage.setItem('sess',JSON.stringify(s));setSess(s)}
  const logout=()=>{localStorage.removeItem('sess');setSess(null);setTab('play');setEdit(null)}
  const go=t=>{if(t!=='write')setEdit(null);setTab(t)}
  const help=()=>{Object.keys(localStorage).filter(k=>k.startsWith('tip_')).forEach(k=>localStorage.removeItem(k));setNonce(n=>n+1);say('راهنما دوباره نشون داده شد 💡')}
  if(!sess) return <><Bg/><Login onOk={login}/></>
  const host=sess.role==='host'
  const tabs=[['play','play','بازی'],['write','pen','بنویس'],['me','user','من']]
  return(
    <>
      <Bg/>
      <div className="app">
        <header className="top">
          <div><div className="hi">سلام</div><div className={host?'who':'name sm'}>{sess.name}</div></div>
          <div className="hr"><button className="hbtn" onClick={help} aria-label="راهنما"><Ic n="help" s={18}/></button><div className="av">{sess.name[0]}</div></div>
        </header>
        <main key={tab+(edit?.id||'')+nonce} className="page">
          {tab==='play'&&<Play sess={sess}/>}
          {tab==='write'&&<Write sess={sess} edit={edit} say={say} onSaved={w=>{setEdit(null);setNonce(n=>n+1);setTab(w?'me':'write')}}/>}
          {tab==='me'&&<Mine sess={sess} say={say} onEdit={q=>{setEdit(q);setTab('write')}} onLogout={logout}/>}
        </main>
      </div>
      <nav className="tabbar">{tabs.map(([k,ic,lb])=><button key={k} className={tab===k?'on':''} onClick={()=>go(k)}><Ic n={ic}/><span>{lb}</span></button>)}</nav>
      <div className={'toast'+(toast?' show':'')}>{toast}</div>
    </>
  )
}

function Login({onOk}){
  const [host,setHost]=useState(false),[pin,setPin]=useState('')
  const [d,setD]=useState(''),[m,setM]=useState(''),[y,setY]=useState('')
  const [bad,setBad]=useState(''),[bk,setBk]=useState(0),[busy,setBusy]=useState(false),[hi,setHi]=useState(null)
  const fail=t=>{setBad(t);setBk(b=>b+1);buzz(40);setBusy(false)}
  const enter=async()=>{
    if(busy) return
    if(host){
      if(!HOST_PIN||pin===HOST_PIN) return onOk({role:'host',name:'علی'})
      return fail(rnd(BAD))
    }
    const dd=+digits(d),yy=digits(y)
    if(!dd||dd>31||!m||yy.length!==4) return fail('تاریخ تولدت رو کامل وارد کن 🎂')
    setBusy(true);setBad('')
    const {data,error}=await sb.rpc('guest_login',{p:`${yy}-${pad(m)}-${pad(dd)}`})
    const g=data&&data[0]
    if(error||!g) return fail(rnd(BAD))
    buzz([20,40,20]);setHi(g)
    setTimeout(()=>onOk({role:'guest',id:g.id,name:g.name,slug:g.slug}),3200)
  }
  if(hi) return(
    <div className="app login welcome">
      <Confetti n={70}/><div className="glow"/>
      <h1 className="name rise">{hi.name}</h1>
      <p className="lead rise" style={{'--d':2}}>خوش اومدی ✨</p>
    </div>
  )
  return(
    <div className="app login">
      <div className="eyebrow rise">{host?'میزبان':'دو حقیقت و یک دروغ'}</div>
      {!host&&<>
        <h1 className="who big rise" style={{'--d':1}}>این بازی فقط برای یک نفر ساخته شده 🤫</h1>
        <p className="lead small rise" style={{'--d':2}}>اگه خودشی، تاریخ تولدت رو بگو.</p>
        <div key={bk} className={'dob rise'+(bad?' bad':'')} style={{'--d':3}}>
          <input className="pin" type="tel" inputMode="numeric" maxLength={2} placeholder="روز" value={d} onChange={e=>setD(e.target.value)}/>
          <select className="pin" value={m} onChange={e=>setM(e.target.value)}>
            <option value="">ماه</option>
            {MONTHS.map((x,i)=><option key={i} value={i+1}>{x}</option>)}
          </select>
          <input className="pin" type="tel" inputMode="numeric" maxLength={4} placeholder="سال" value={y} onChange={e=>setY(e.target.value)} onKeyDown={e=>e.key==='Enter'&&enter()}/>
        </div>
      </>}
      {host&&<>
        <h1 className="who big">سلام علی 👋</h1>
        <input key={bk} className={'pin'+(bad?' bad':'')} type="password" placeholder="رمز" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&enter()}/>
      </>}
      {bad&&<p className="red mt">{bad}</p>}
      <button className="btn big" disabled={busy} onClick={enter}>{host?'ورود':'منم 😏'}</button>
      <button className="link faint" onClick={()=>{setHost(!host);setBad('');setPin('')}}>{host?'بازگشت':'میزبان'}</button>
    </div>
  )
}

function Write({sess,edit,onSaved,say}){
  const host=sess.role==='host'
  const init=edit?{prompt:edit.prompt||'',s:[...edit.statements],truth:edit.truth_index,story:edit.story||''}:{prompt:'',s:['','',''],truth:0,story:''}
  const [f,setF]=useState(init),[step,setStep]=useState(edit?1:0),[busy,setBusy]=useState(false)
  const [idea,setIdea]=useState(()=>rnd(IDEAS)),[tip,setTip]=useState(()=>rnd(TIPS))
  const typed=useType(idea.h)
  const notes=useMemo(()=>advise(f),[f])
  const setS=(i,v)=>setF({...f,s:f.s.map((x,j)=>j===i?v:x)})
  const next=()=>{let n=rnd(IDEAS);while(n===idea)n=rnd(IDEAS);setIdea(n);setTip(rnd(TIPS))}
  const pickLies=()=>[...idea.lies].sort(()=>Math.random()-.5)
  const quick=()=>{const l=pickLies();let k=0;setF({...f,prompt:idea.p,s:f.s.map((x,i)=>i===f.truth?idea.ex:l[k++])});setStep(1);buzz(8);say('سؤال آماده شد ✨ جمله‌ها رو با خودت تطبیق بده')}
  const liesOnly=()=>{const l=pickLies();let k=0;setF({...f,s:f.s.map((x,i)=>i===f.truth?x:l[k++])});buzz(8)}
  const ok1=f.s.every(x=>x.trim())
  const save=async()=>{
    setBusy(true)
    const row={prompt:f.prompt.trim(),statements:f.s.map(x=>x.trim()),truth_index:f.truth,story:f.story.trim()}
    let error
    if(edit){
      const r=await sb.from('questions').update(row).eq('id',edit.id);error=r.error
      if(!error) await sb.from('answers').delete().eq('question_id',edit.id)
    }else{
      const r=await sb.from('questions').insert({...row,owner:host?'host':'guest',guest_id:host?null:sess.id,notified:false}).select('id').single()
      error=r.error;if(!error) notify('question',r.data.id)
    }
    setBusy(false)
    if(error) return say(error.message)
    say(edit?'ویرایش شد ✅':'ذخیره شد 🎉');onSaved(!!edit)
  }
  const titles=['موضوع رو انتخاب کن 🎯','سه جمله؛ یکی حقیقت، دو تا دروغ 🎭','داستانش رو بگو 📖']
  return(
    <>
      <div className="steps">{[0,1,2].map(i=><i key={i} className={i<=step?'on':''}/>)}</div>
      <h2 className="h">{titles[step]}</h2>
      <Tip key={step} k={'w'+step}/>
      <div className="grow">
        {step===0&&<>
          <div className="ai rise">
            <div className="ai-top"><span className="ai-ic"><Ic n="spark" s={16}/></span><b>دستیار ایده</b><span className="chip">{idea.e} {idea.c}</span></div>
            <div className="ai-p">{idea.p}</div>
            <div className="ai-h">{typed}<i className="caret"/></div>
            <div className="ai-ex">مثلاً: {idea.ex}</div>
            <div className="ai-tip">💡 {tip}</div>
            <div className="ai-btns">
              <button className="mini gold" onClick={quick}>⚡ آماده بساز</button>
              <button className="mini" onClick={next}><Ic n="refresh" s={14}/> ایده‌ی دیگر</button>
            </div>
          </div>
          <input className="field" placeholder="عنوان سؤال (اختیاری)" value={f.prompt} onChange={e=>setF({...f,prompt:e.target.value})}/>
        </>}
        {step===1&&<>
          {f.s.map((v,i)=>(
            <div key={i} className={'sline rise'+(f.truth===i?' t':'')} style={{'--d':i}}>
              <span className="badge">{L[i]}</span>
              <input placeholder={'جمله '+L[i]} value={v} onChange={e=>setS(i,e.target.value)}/>
              <button className="pill" onClick={()=>{setF({...f,truth:i});buzz(8)}}>{f.truth===i?'حقیقت':'دروغ'}</button>
            </div>
          ))}
          <button className="mini gold" onClick={liesOnly}>🎲 دو دروغ آماده</button>
        </>}
        {step===2&&<>
          <textarea className="field" placeholder="داستان پشت حقیقت (بعد از جواب نشان داده می‌شود)" value={f.story} onChange={e=>setF({...f,story:e.target.value})}/>
          <div className="notes">{notes.map((n,i)=><div key={i} className={'note'+(n.ok?' ok':'')}><Ic n={n.ok?'check':'spark'} s={14}/>{n.t}</div>)}</div>
        </>}
      </div>
      <div className="foot">
        {step<2
          ?<button className="btn big" disabled={step===1&&!ok1} onClick={()=>setStep(step+1)}>بعدی</button>
          :<button className="btn big" disabled={busy} onClick={save}>{busy?'…':edit?'ذخیره‌ی تغییرات':'ذخیره‌ی سؤال'}</button>}
        {(step>0||edit)&&<button className="ghost sq" onClick={()=>step>0&&!(edit&&step===1)?setStep(step-1):onSaved(true)}>{step>0&&!(edit&&step===1)?'قبلی':'انصراف'}</button>}
      </div>
    </>
  )
}

function Mine({sess,say,onEdit,onLogout}){
  const host=sess.role==='host'
  const [list,setList]=useState(null),[gmap,setGmap]=useState({}),[open,setOpen]=useState(null),[sure,setSure]=useState(false),[sheet,setSheet]=useState(null)
  const load=async()=>{
    let q=sb.from('questions').select('*, answers(*)').order('created_at',{ascending:false})
    q=host?q.eq('owner','host'):q.eq('owner','guest').eq('guest_id',sess.id)
    const {data}=await q;setList(data||[])
    if(host){const g=await sb.from('guests').select('id,name');setGmap(Object.fromEntries((g.data||[]).map(x=>[x.id,x.name])))}
  }
  useEffect(()=>{load()},[])
  const remove=async()=>{await sb.from('questions').delete().eq('id',open.id);setOpen(null);setSure(false);say('حذف شد');load()}
  if(!list) return <div className="skel"/>
  const nA=list.reduce((s,q)=>s+q.answers.length,0),nF=list.reduce((s,q)=>s+q.answers.filter(a=>!a.correct).length,0)
  const label=q=>{
    const n=q.answers.length,f=q.answers.filter(a=>!a.correct).length
    if(!n) return ['منتظر جواب','']
    return host?[n+' جواب'+(f?' · '+f+' گول‌خورده':''),f?'no':'ok']:q.answers[0].correct?['درست جواب داد','ok']:['گول خورد 😈','no']
  }
  return(
    <>
      <div className="between"><h2 className="h">سؤال‌های من</h2>
        <div className="hr">
          <button className="mini" onClick={()=>setSheet('msg')}>💌 پیام</button>
          {host?<button className="mini" onClick={()=>setSheet('set')}><Ic n="gear" s={15}/></button>
            :BOT&&<a className="mini" href={`https://t.me/${BOT}?start=${sess.slug}`} target="_blank" rel="noreferrer">🔔 تلگرام</a>}
        </div>
      </div>
      <Tip k="me"/>
      <div className="stats">
        <div><b>{list.length}</b><span>سؤال</span></div><div><b>{nA}</b><span>جواب</span></div><div><b>{nF}</b><span>گول‌خورده</span></div>
      </div>
      <div className="grow">
        {!list.length&&<p className="sub">هنوز سؤالی ننوشته‌ای. از تب «بنویس» شروع کن ✍️</p>}
        {list.map((q,n)=>{const [t,c]=label(q);return(
          <button key={q.id} className="row rise" style={{'--d':Math.min(n,6)}} onClick={()=>setOpen(q)}>
            <div><b>{q.prompt||q.statements[q.truth_index]}</b></div><span className={'status '+c}>{t}</span>
          </button>)})}
        <button className="ghost" onClick={onLogout}><Ic n="out" s={16}/> خروج</button>
      </div>
      {open&&(
        <div className="scrim" onClick={()=>{setOpen(null);setSure(false)}}>
          <div className="sheet" onClick={e=>e.stopPropagation()}>
            <i className="grab"/><h3>{open.prompt||'سؤال'}</h3>
            {open.statements.map((t,i)=><div key={i} className={'ln '+(i===open.truth_index?'t':'')}>{L[i]}. {t}{i===open.truth_index?' ✓':''}</div>)}
            {open.story&&<div className="story"><span>داستان</span>{open.story}</div>}
            {host&&open.answers.map(a=><div key={a.id} className="ln">{a.correct?'✅':'❌'} {gmap[a.responder]||'؟'}</div>)}
            {!sure
              ?<div className="acts"><button className="btn big" onClick={()=>{const q=open;setOpen(null);onEdit(q)}}>ویرایش</button><button className="ghost sq red" onClick={()=>setSure(true)}><Ic n="trash" s={16}/></button></div>
              :<div className="acts"><button className="btn big danger" onClick={remove}>مطمئنم، حذف کن</button><button className="ghost sq" onClick={()=>setSure(false)}>نه</button></div>}
          </div>
        </div>
      )}
      {sheet==='msg'&&(host?<Inbox onClose={()=>setSheet(null)}/>:<MsgSheet sess={sess} say={say} onClose={()=>setSheet(null)}/>)}
      {sheet==='set'&&<Guests say={say} onClose={()=>setSheet(null)}/>}
    </>
  )
}

function MsgSheet({sess,say,onClose}){
  const [t,setT]=useState(''),[busy,setBusy]=useState(false)
  const send=async()=>{
    if(!t.trim()) return say('یه چیزی بنویس 😅')
    setBusy(true)
    const {data,error}=await sb.from('messages').insert({guest_id:sess.id,body:t.trim()}).select('id').single()
    setBusy(false)
    if(error) return say(error.message)
    notify('message',data.id);say('پیامت رسید 💌');onClose()
  }
  return(
    <div className="scrim" onClick={onClose}><div className="sheet" onClick={e=>e.stopPropagation()}>
      <i className="grab"/><h3>پیام برای علی 💌</h3>
      <p className="sub">یه چیز بنویس یا از آماده‌ها بزن:</p>
      <div className="chips">{CHIPS.map(c=><button key={c} className="chip2" onClick={()=>{setT(t?t+' '+c:c);buzz(8)}}>{c}</button>)}</div>
      <textarea className="field" placeholder="پیامت…" value={t} onChange={e=>setT(e.target.value)}/>
      <button className="btn big" disabled={busy} onClick={send}>{busy?'…':'بفرست 🚀'}</button>
    </div></div>
  )
}

function Inbox({onClose}){
  const [m,setM]=useState(null)
  useEffect(()=>{sb.from('messages').select('*, guests(name)').order('created_at',{ascending:false}).then(({data})=>setM(data||[]))},[])
  return(
    <div className="scrim" onClick={onClose}><div className="sheet tall" onClick={e=>e.stopPropagation()}>
      <i className="grab"/><h3>پیام‌ها 💌</h3>
      {!m&&<div className="skel"/>}
      {m&&!m.length&&<p className="sub">هنوز پیامی نیومده.</p>}
      {m?.map(x=><div key={x.id} className="gbox"><b className="gold">{x.guests?.name||'؟'}</b><div>{x.body}</div></div>)}
    </div></div>
  )
}

function Guests({say,onClose}){
  const [gs,setGs]=useState(null),[nm,setNm]=useState(''),[yr,setYr]=useState(''),[sure,setSure]=useState(null)
  const load=async()=>{const {data}=await sb.from('guests').select('*').order('created_at');setGs(data||[])}
  useEffect(()=>{load()},[])
  const add=async()=>{
  const sec=normDate(yr)
if(!sec) return say('مهم ترین تاریخ تقویم ')
const {error}=await sb.from('guests').insert({name:nm.trim(),secret:sec,slug:Math.random().toString(36).slice(2,8)})
  
    if(error) return say(error.message)
    setNm('');setYr('');load();say('اضافه شد ✅')
  
  }
  const upd=async(id,p)=>{await sb.from('guests').update(p).eq('id',id);load()}
  const copy=async(txt,m)=>{try{await navigator.clipboard.writeText(txt);say(m)}catch(e){say(txt)}}
  const del=async id=>{await sb.from('guests').delete().eq('id',id);setSure(null);load()}
  return(
    <div className="scrim" onClick={onClose}><div className="sheet tall" onClick={e=>e.stopPropagation()}>
      <i className="grab"/><h3>مخاطب‌ها</h3>
      <p className="sub">هر مخاطب لینک اختصاصی دارد و فقط سؤال‌های خودش را می‌بیند. لینک ساده‌ی سایت از آدم‌ها اسم می‌پرسد، پس هیچ اسمی لو نمی‌رود.</p>
      {gs?.map(g=>(
        <div key={g.id} className="gbox">
          <div className="grow2">
            <input className="field s" defaultValue={g.name} onBlur={e=>e.target.value.trim()&&e.target.value!==g.name&&upd(g.id,{name:e.target.value.trim()})}/>
            <input className="field s yr" placeholder="سال تولد" maxLength={4} inputMode="numeric" defaultValue={g.secret} onBlur={e=>digits(e.target.value)!==g.secret&&upd(g.id,{secret:digits(e.target.value)})}/>
          </div>
          <div className="tgs">{g.chat_id?'🔔 تلگرام متصل'+(g.tg_username?' · @'+g.tg_username:''):'🔕 تلگرام متصل نیست'}</div>
          <div className="acts wrapx">
            <button className="mini" onClick={()=>copy(location.origin+'/?for='+g.slug,'لینک بازی کپی شد 🔗')}><Ic n="copy" s={14}/> لینک بازی</button>
            {BOT&&<button className="mini" onClick={()=>copy(`https://t.me/${BOT}?start=${g.slug}`,'لینک تلگرام کپی شد 🔔')}><Ic n="copy" s={14}/> لینک ربات</button>}
            {sure===g.id?<button className="mini red" onClick={()=>del(g.id)}>مطمئنی؟</button>:<button className="mini red" onClick={()=>setSure(g.id)}><Ic n="trash" s={14}/></button>}
          </div>
        </div>
      ))}
      <div className="gbox">
        <div className="grow2">
          <input className="field s" placeholder="اسم مخاطب جدید" value={nm} onChange={e=>setNm(e.target.value)}/>
          <input className="field s yr" placeholder="سال تولد" maxLength={4} inputMode="numeric" value={yr} onChange={e=>setYr(e.target.value)}/>
        </div>
        <button className="btn big" onClick={add}>افزودن</button>
      </div>
    </div></div>
  )
}

function Pick({q,onDone}){
  const [sel,setSel]=useState([]),[lock,setLock]=useState(false)
  const tap=i=>{
    if(lock) return
    if(sel.includes(i)) return setSel(sel.filter(x=>x!==i))
    const n=[...sel,i];setSel(n);buzz(10)
    if(n.length===2){setLock(true);setTimeout(()=>onDone(n),480)}
  }
  return(
    <>
      <div className="meter">{[0,1].map(k=><i key={k} className={sel.length>k?'on':''}/>)}<span>{sel.length} از ۲ دروغ پیدا شد</span></div>
      <div className="grow">
        {q.statements.map((t,i)=>(
          <button key={i} className={'opt pick'+(sel.includes(i)?' sel':'')} style={{'--d':i}} onClick={()=>tap(i)}>
            <span className="badge">{sel.includes(i)?'✗':L[i]}</span><span className="tx">{t}</span>{sel.includes(i)&&<span className="tag">دروغ</span>}
          </button>
        ))}
      </div>
    </>
  )
}

function Play({sess}){
  const host=sess.role==='host',me=host?'host':sess.id
  const [guests,setGuests]=useState([]),[gid,setGid]=useState(null)
  const [qs,setQs]=useState(null),[i,setI]=useState(0),[res,setRes]=useState(null),[score,setScore]=useState(0),[streak,setStreak]=useState(0)
  useEffect(()=>{
    if(!host) return
    sb.from('guests').select('id,name').order('created_at').then(({data})=>{
      const d=data||[];setGuests(d)
      if(d.length) setGid(d[0].id); else setQs([])
    })
  },[])
  useEffect(()=>{
    if(host&&!gid) return
    let alive=true
    setQs(null);setI(0);setRes(null);setScore(0);setStreak(0)
    ;(async()=>{
      let q=sb.from('questions').select('*, answers(responder)').order('created_at')
      q=host?q.eq('owner','guest').eq('guest_id',gid):q.eq('owner','host')
      const {data}=await q
      if(alive) setQs((data||[]).filter(x=>!x.answers.some(a=>a.responder===me)))
    })()
    return()=>{alive=false}
  },[gid])
  const chips=host&&guests.length>1&&<div className="gchips">{guests.map(g=><button key={g.id} className={'gc'+(g.id===gid?' on':'')} onClick={()=>setGid(g.id)}>{g.name}</button>)}</div>
  if(!qs) return <>{chips}<div className="skel"/></>
  if(!qs.length) return <>{chips}<div className="empty rise"><div className="ring soft">🫧</div><h2 className="h">فعلاً سؤال جدیدی نیست</h2><p className="sub">{host?'وقتی مخاطب سؤال تازه‌ای بنویسد، اینجا می‌آید.':'وقتی علی سؤال تازه‌ای بنویسد، اینجا می‌آید.'}</p></div></>
  if(i>=qs.length){
    const good=score>=Math.ceil(qs.length/2)
    return <>{good&&<Confetti n={60}/>}<div className="empty rise"><div className="big-score">{score}<small>/{qs.length}</small></div><h2 className="h">{score===qs.length?'کامل خوندی‌ش 😳':good?'خوب می‌شناسی‌ش 😏':'باید بیشتر حرف بزنید ☕'}</h2><p className="sub">بعد از دیت، یه دور دیگه بازی کنید.</p></div></>
  }
  const q=qs[i]
  const done=lies=>{
    const correct=[0,1,2].filter(x=>x!==q.truth_index).every(x=>lies.includes(x))
    sb.from('answers').insert({question_id:q.id,responder:me,picked_lies:lies,correct}).then(()=>{})
    if(correct){setScore(s=>s+1);setStreak(s=>s+1);buzz([20,40,20])}else{setStreak(0);buzz(60)}
    setRes({correct,word:rnd(correct?WIN:LOSE),lies})
  }
  return(
    <div key={q.id} className="fillcol">
      {chips}
      {res?.correct&&<><div className="glow"/><Confetti/></>}
      <div className="prog">{qs.map((_,k)=><i key={k} className={k<i?'done':k===i?'cur':''}/>)}</div>
      <div className="between"><div className="eyebrow">{i+1} از {qs.length}</div>{streak>=2&&<span className="streak">🔥 ×{streak}</span>}</div>
      <h2 className="h">{q.prompt||'دو دروغ رو پیدا کن'}</h2>
      {!res&&<><Tip k="play"/><Pick q={q} onDone={done}/></>}
      {res&&(
        <div className="res rise">
          <div className="grow">
            {q.statements.map((t,k)=><div key={k} className={'opt '+(k===q.truth_index?'truth':'lie')}><span className="badge">{k===q.truth_index?<Ic n="check" s={16}/>:<Ic n="x" s={14}/>}</span><span className="tx">{t}</span>{res.lies.includes(k)&&<span className="tag">انتخاب تو</span>}</div>)}
            <div className={'verdict '+(res.correct?'ok':'no')}>{res.word}</div>
            {q.story&&<div className="story"><span>داستانش</span>{q.story}</div>}
          </div>
          <div className="foot"><button className="btn big" onClick={()=>{setI(i+1);setRes(null)}}>{i+1<qs.length?'بعدی':'پایان'}</button></div>
        </div>
      )}
    </div>
  )
}
