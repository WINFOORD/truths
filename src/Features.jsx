import {useEffect,useRef,useState} from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {sb} from './supabase'
import {hub} from './hub.js'
import {Ic,buzz,rnd} from './ui.jsx'

const HOST='علی'
const fa=n=>Number(n).toLocaleString('fa-IR')
const faDT=iso=>new Date(iso).toLocaleString('fa-IR',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})
const until=iso=>{
  const m=Math.max(0,Math.round((new Date(iso)-Date.now())/60000))
  if(m<60)return 'کمتر از یک ساعت دیگر'
  if(m<60*24)return fa(Math.round(m/60))+' ساعت دیگر'
  return fa(Math.round(m/1440))+' روز دیگر'
}
const FEATURES=[['page','خانه'],['game','بازی'],['tot','انتخاب'],['date','قرار']]
const STATUS={requested:'منتظر تایید',confirmed:'تایید شد ✅',done:'انجام شد',cancelled:'لغو شد'}

function useGuests(){
  const [gs,setGs]=useState(null)
  const load=async()=>{const {data}=await sb.from('guests').select('id,name,features').order('created_at');setGs(data||[])}
  useEffect(()=>{load()},[])
  return [gs,load]
}
const featOf=g=>({page:true,game:true,tot:true,date:false,...(g?.features||{})})

function GuestChips({gs,gid,set}){
  if(!gs||gs.length<2)return null
  return <div className="gchips">{gs.map(g=><button key={g.id} className={'gc'+(g.id===gid?' on':'')} onClick={()=>set(g.id)}>{g.name}</button>)}</div>
}

function Access({g,keys,say,reload}){
  const f=featOf(g)
  const list=FEATURES.filter(([k])=>!keys||keys.includes(k))
  const flip=async k=>{
    const next={...f,[k]:!f[k]}
    const {error}=await hub('guest.set',{guest_id:g.id,features:next})
    if(error)return say(error)
    reload();buzz(8)
  }
  return <div className="chips">{list.map(([k,n])=><button key={k} className={'chip2'+(f[k]?' on':'')} onClick={()=>flip(k)}>{f[k]?'✓ ':''}{n}</button>)}</div>
}

/* ───────────────────────── خانه ───────────────────────── */
export function Home({sess,say}){
  return sess.role==='host'?<HostHome say={say}/>:<GuestHome say={say}/>
}

function GuestHome({say}){
  const [d,setD]=useState(null)
  useEffect(()=>{hub('page.get').then(r=>{if(r.error)say(r.error);setD(r.data||{cards:[],timed:[]})})},[])
  if(!d)return <div className="skel"/>
  return(
    <div className="grow">
      {d.fal&&<div className="fal rise"><span>فال امروز</span><p>{d.fal}</p></div>}
      {d.cards?.length>0&&<>
        <h3 className="sec">درباره‌ی تو</h3>
        {d.cards.map((c,i)=><div key={i} className="card2 rise" style={{'--d':Math.min(i,6)}}>{c.title&&<b>{c.title}</b>}<p>{c.text}</p></div>)}
      </>}
      {d.timed?.length>0&&<>
        <h3 className="sec">پیام‌ها</h3>
        {d.timed.map((t,i)=>t.locked
          ?<div key={t.id} className="card2 locked rise" style={{'--d':Math.min(i,6)}}><span>🔒</span><div><b>یه پیام در راهه</b><p>{until(t.unlock_at)} · {faDT(t.unlock_at)}</p></div></div>
          :<div key={t.id} className="card2 msgcard rise" style={{'--d':Math.min(i,6)}}><p>{t.body}</p><small>{faDT(t.unlock_at)}</small></div>)}
      </>}
      {!d.cards?.length&&!d.timed?.length&&<p className="sub" style={{marginTop:14}}>هر وقت چیز تازه‌ای اضافه شود، همین‌جا می‌بینی.</p>}
    </div>
  )
}

function HostHome({say}){
  const [gs,reloadGs]=useGuests(),[gid,setGid]=useState(null)
  const [d,setD]=useState(null),[fal,setFal]=useState(''),[cards,setCards]=useState('')
  const [body,setBody]=useState(''),[at,setAt]=useState(''),[busy,setBusy]=useState(false),[sure,setSure]=useState(null)
  useEffect(()=>{if(gs?.length&&!gs.find(g=>g.id===gid))setGid(gs[0].id)},[gs])
  const load=async()=>{
    if(!gid)return
    const {data,error}=await hub('guest.get',{guest_id:gid})
    if(error)return say(error)
    setD(data);setFal(data.fal);setCards(data.page_cards)
  }
  useEffect(()=>{setD(null);load()},[gid])
  if(!gs)return <div className="skel"/>
  if(!gs.length)return <p className="sub">اول از «من ← تنظیمات» یک مخاطب اضافه کن.</p>
  const g=gs.find(x=>x.id===gid)
  const save=async()=>{
    setBusy(true)
    const {error}=await hub('guest.set',{guest_id:gid,fal,page_cards:cards})
    setBusy(false)
    say(error||'ذخیره شد ✅')
  }
  const add=async()=>{
    if(!body.trim()||!at)return say('پیام و زمان باز شدن را بنویس')
    const {error}=await hub('timed.add',{guest_id:gid,body,unlock_at:new Date(at).toISOString()})
    if(error)return say(error)
    setBody('');setAt('');say('پیام زمان‌دار ثبت شد ⏳');load()
  }
  const del=async id=>{const {error}=await hub('timed.del',{id});if(error)return say(error);setSure(null);load()}
  return(
    <div className="grow">
      <GuestChips gs={gs} gid={gid} set={setGid}/>
      <h3 className="sec">دسترسی {g?.name}</h3>
      <Access g={g} say={say} reload={reloadGs}/>
      {d&&<>
        <h3 className="sec">فال‌ها (هر خط یکی؛ هر روز یکی نشان داده می‌شود)</h3>
        <textarea className="field" placeholder="اگر خالی باشد، فال‌های آماده نشان داده می‌شود" value={fal} onChange={e=>setFal(e.target.value)}/>
        <h3 className="sec">کارت‌های صفحه‌ی شخصی (هر خط: عنوان | متن)</h3>
        <textarea className="field" placeholder={'گل مورد علاقه | لیلیوم و رز\nرنگ | آبی'} value={cards} onChange={e=>setCards(e.target.value)}/>
        <button className="btn" disabled={busy} onClick={save}>{busy?'…':'ذخیره‌ی صفحه'}</button>
        <h3 className="sec">پیام زمان‌دار</h3>
        <textarea className="field" placeholder="متن پیام" value={body} onChange={e=>setBody(e.target.value)}/>
        <input className="field" type="datetime-local" value={at} onChange={e=>setAt(e.target.value)}/>
        <button className="btn" onClick={add}>ثبت پیام</button>
        {d.timed.map(t=>(
          <div key={t.id} className="gbox">
            <div className="tgs">{new Date(t.unlock_at)>new Date()?'⏳ باز می‌شود ':'✓ باز شد '}{faDT(t.unlock_at)}</div>
            <div>{t.body}</div>
            <div className="acts">{sure===t.id?<button className="mini red" onClick={()=>del(t.id)}>مطمئنی؟</button>:<button className="mini red" onClick={()=>setSure(t.id)}><Ic n="trash" s={14}/></button>}</div>
          </div>
        ))}
      </>}
    </div>
  )
}

/* ───────────────────────── انتخاب روز ───────────────────────── */
const CATS=['مکان','غذا','زمان','نظرت درباره‌ی امروز','دیگه']
const PRESETS=[
  ['مکان','کافه','طبیعت'],['مکان','سینما','پیاده‌روی'],['مکان','شهر شلوغ','جای ساکت'],['مکان','دریا','کوه'],
  ['غذا','قهوه','چای'],['غذا','پیتزا','برگر'],['غذا','شیرین','شور'],['غذا','صبحانه‌ی طولانی','شام دیروقت'],
  ['زمان','صبح‌زود','آخر شب'],['زمان','آخر هفته','وسط هفته'],['زمان','برنامه‌ریزی‌شده','یهویی'],
  ['نظرت درباره‌ی امروز','امروز روز خوبی بود','امروز یه کم سنگین بود'],['نظرت درباره‌ی امروز','حس بیرون رفتن','حس خونه موندن'],['نظرت درباره‌ی امروز','دلم موسیقی می‌خواد','دلم سکوت می‌خواد'],
  ['دیگه','کتاب','فیلم'],['دیگه','تابستون','زمستون'],['دیگه','عکس','ویدیو']
]

export function Tot({sess,say,onComplete}){
  return sess.role==='host'?<HostTot say={say}/>:<GuestTot say={say} onComplete={onComplete}/>
}

function GuestTot({say,onComplete}){
  const [list,setList]=useState(null)
  useEffect(()=>{hub('tot.list').then(r=>{if(r.error)say(r.error);setList(r.data||[])})},[])
  if(!list)return <div className="skel"/>
  const answer=async(p,pick)=>{
    buzz(10)
    setList(l=>l.map(x=>x.id===p.id?{...x,my_pick:pick}:x))
    const {data,error}=await hub('tot.answer',{prompt_id:p.id,pick})
    if(error){say(error);setList(l=>l.map(x=>x.id===p.id?{...x,my_pick:null}:x));return}
    setList(l=>l.map(x=>x.id===p.id?{...x,my_pick:data.pick,host_pick:data.host_pick}:x))
  }
  const open=list.filter(p=>p.my_pick==null),done=list.filter(p=>p.my_pick!=null)
  const card=(p,i)=>{
    const opts=[p.option_a,p.option_b],answered=p.my_pick!=null
    const same=answered&&p.host_pick===p.my_pick
    return(
      <div key={p.id} className="tot rise" style={{'--d':Math.min(i,6)}}>
        {p.category&&<span className="tag">{p.category}</span>}
        <div className="totrow">
          {opts.map((t,k)=>(
            <button key={k} disabled={answered} className={'totbtn'+(p.my_pick===k?' me':'')+(answered&&p.host_pick===k?' him':'')} onClick={()=>answer(p,k)}>
              <span>{t}</span>
              {answered&&<small>{p.my_pick===k&&p.host_pick===k?'هر دو 🤝':p.my_pick===k?'تو':p.host_pick===k?HOST:''}</small>}
            </button>
          ))}
        </div>
        {answered&&<div className={'reveal'+(same?' same':'')}>
          {p.host_pick===null||p.host_pick===undefined?`${HOST} هنوز انتخاب نکرده 😄`:same?`${HOST} هم همین رو زد ✨`:`${HOST} "${opts[p.host_pick]}" رو زد 😄`}
        </div>}
      </div>
    )
  }
  return(
    <div className="grow">
      <h2 className="h">انتخاب روز</h2>
      <p className="sub">هر وقت خواستی یکی بزن؛ جواب من همون لحظه نشون داده می‌شه. درست و غلط نداره.</p>
      {!list.length&&<div className="journey-no-choices"><p className="sub">هنوز انتخابی از طرف علی ثبت نشده؛ این مرحله رو رد کن و ادامه بده.</p><button className="btn big" onClick={()=>onComplete?.({answered:0,same:0})}>ادامه‌ی ماجرا</button></div>}
      {open.map(card)}
      {done.length>0&&<><h3 className="sec">جواب‌داده‌ها</h3>{done.map(card)}</>}
      {!!list.length&&!open.length&&<button className="btn big" onClick={()=>onComplete?.({answered:done.length,same:done.filter(p=>p.host_pick===p.my_pick).length})}>ادامه‌ی ماجرا</button>}
    </div>
  )
}

function HostTot({say}){
  const [gs]=useGuests(),[list,setList]=useState(null)
  const [cat,setCat]=useState(CATS[0]),[a,setA]=useState(''),[b,setB]=useState(''),[pick,setPick]=useState(0),[target,setTarget]=useState(''),[sure,setSure]=useState(null)
  const load=async()=>{const {data,error}=await hub('tot.list');if(error)say(error);setList(data||[])}
  useEffect(()=>{load()},[])
  const preset=()=>{const [c,x,y]=rnd(PRESETS);setCat(c);setA(x);setB(y)}
  const add=async()=>{
    if(!a.trim()||!b.trim())return say('هر دو گزینه را بنویس')
    const {error}=await hub('tot.add',{category:cat,option_a:a,option_b:b,host_pick:pick,guest_id:target||null})
    if(error)return say(error)
    setA('');setB('');say('اضافه شد ✅');load()
  }
  const setHp=async(id,v)=>{const {error}=await hub('tot.setpick',{id,host_pick:v});if(error)return say(error);load()}
  const del=async id=>{const {error}=await hub('tot.del',{id});if(error)return say(error);setSure(null);load()}
  return(
    <div className="grow">
      <h2 className="h">انتخاب روز</h2>
      <div className="chips">{CATS.map(c=><button key={c} className={'chip2'+(cat===c?' on':'')} onClick={()=>setCat(c)}>{c}</button>)}</div>
      <div className="grow2"><input className="field s" placeholder="گزینه‌ی اول" value={a} onChange={e=>setA(e.target.value)}/><input className="field s" placeholder="گزینه‌ی دوم" value={b} onChange={e=>setB(e.target.value)}/></div>
      <div className="chips">
        <span className="tgs">انتخاب من:</span>
        {[0,1].map(k=><button key={k} className={'chip2'+(pick===k?' on':'')} onClick={()=>setPick(k)}>{(k?b:a)||(k?'دوم':'اول')}</button>)}
      </div>
      {gs?.length>0&&<div className="chips"><span className="tgs">برای:</span>
        <button className={'chip2'+(!target?' on':'')} onClick={()=>setTarget('')}>همه</button>
        {gs.map(g=><button key={g.id} className={'chip2'+(target===g.id?' on':'')} onClick={()=>setTarget(g.id)}>{g.name}</button>)}
      </div>}
      <div className="acts"><button className="btn" onClick={add}>افزودن</button><button className="ghost sq" onClick={preset}><Ic n="refresh" s={16}/> ایده‌ی آماده</button></div>
      {!list&&<div className="skel"/>}
      {list?.map(p=>(
        <div key={p.id} className="gbox" style={{marginTop:10}}>
          <div className="between"><span className="tag">{p.category||'—'}{p.target?' · '+p.target:' · همه'}</span>
            {sure===p.id?<button className="mini red" onClick={()=>del(p.id)}>مطمئنی؟</button>:<button className="mini red" onClick={()=>setSure(p.id)}><Ic n="trash" s={14}/></button>}</div>
          <div className="chips">{[p.option_a,p.option_b].map((t,k)=><button key={k} className={'chip2'+(p.host_pick===k?' on':'')} onClick={()=>setHp(p.id,k)}>{t}</button>)}</div>
          {p.answers.length?p.answers.map(x=><div key={x.guest_id} className="ln">{x.name}: {x.pick?p.option_b:p.option_a}</div>):<div className="ln">هنوز جوابی نیامده</div>}
        </div>
      ))}
    </div>
  )
}

/* ───────────────────────── قرار ───────────────────────── */
function MapView({places,selected,onSelect,onPick,h=240}){
  const el=useRef(null),map=useRef(null),layer=useRef(null),cb=useRef({})
  cb.current={onSelect,onPick}
  useEffect(()=>{
    const m=L.map(el.current,{zoomControl:true}).setView([35.6892,51.389],11)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(m)
    layer.current=L.layerGroup().addTo(m);map.current=m
    m.on('click',e=>cb.current.onPick&&cb.current.onPick(e.latlng))
    setTimeout(()=>m.invalidateSize(),120)
    return()=>m.remove()
  },[])
  const key=places.map(p=>p.id).join(',')
  useEffect(()=>{
    const m=map.current;if(!m)return
    if(places.length===1)m.setView([places[0].lat,places[0].lng],15)
    else if(places.length>1)m.fitBounds(places.map(p=>[p.lat,p.lng]),{padding:[40,40],maxZoom:15})
  },[key])
  useEffect(()=>{
    const g=layer.current;if(!g)return
    g.clearLayers()
    const css=getComputedStyle(document.documentElement),ac=css.getPropertyValue('--ac').trim()||'#d4b476'
    places.forEach(p=>{
      const on=p.id===selected
      L.circleMarker([p.lat,p.lng],{radius:on?12:8,color:'#fff',weight:2,fillColor:ac,fillOpacity:on?1:.75})
        .bindTooltip(p.name,{direction:'top'}).on('click',ev=>{L.DomEvent.stopPropagation(ev);cb.current.onSelect&&cb.current.onSelect(p.id)}).addTo(g)
    })
  },[places,selected])
  return <div ref={el} className="map" style={{height:h}}/>
}

export function DateTab({sess,say}){
  return sess.role==='host'?<HostDate say={say}/>:<GuestDate say={say}/>
}

const WHEN=['امروز','فردا','آخر هفته','یه روز دیگه']
const WHEN_ASK={'امروز':'امروز','فردا':'فردا','آخر هفته':'آخر هفته','یه روز دیگه':'یه روزی'}

function GuestDate({say}){
  const [places,setPlaces]=useState(null),[plans,setPlans]=useState([]),[step,setStep]=useState('list')
  const [sel,setSel]=useState(null),[when,setWhen]=useState(''),[time,setTime]=useState(''),[busy,setBusy]=useState(false),[sure,setSure]=useState(false)
  const load=async()=>{
    const [p,q]=await Promise.all([hub('date.places'),hub('date.plans')])
    if(p.error)say(p.error)
    setPlaces(p.data||[]);setPlans(q.data||[])
  }
  useEffect(()=>{load()},[])
  if(!places)return <div className="skel"/>
  const open=plans.find(p=>['requested','confirmed'].includes(p.status))
  const place=places.find(p=>p.id===sel)
  const reset=()=>{setStep('list');setSel(null);setWhen('');setTime('');load()}
  const create=async()=>{
    setBusy(true)
    const {error}=await hub('date.create',{place_id:sel,when_text:when+(time?` · ساعت ${time}`:'')})
    setBusy(false)
    if(error){say(error);return}
    buzz([20,40,20]);setStep('done')
  }
  const cancel=async()=>{const {error}=await hub('date.cancel',{id:open.id});if(error)return say(error);setSure(false);say('لغو شد');load()}

  if(step==='ask')return(
    <div className="stage rise">
      <div className="ring soft">📍</div>
      <h2 className="h">می‌خوای {WHEN_ASK[when]} منو ببینی؟ 😌</h2>
      <p className="sub">{place?.name}{time?` · ساعت ${time}`:''}</p>
      <button className="btn big" onClick={()=>setStep('yes')}>آره 😌</button>
      <button className="ghost" onClick={()=>setStep('tease')}>نه، پشیمون شدم 😅</button>
    </div>
  )
  if(step==='tease')return(
    <div className="stage rise">
      <div className="ring soft">🥺</div>
      <h2 className="h">دلت میاد؟</h2>
      <button className="btn big" onClick={()=>setStep('yes')}>نه، دلم نمیاد 😄</button>
      <button className="ghost" onClick={()=>setStep('later')}>فعلاً نه، یه وقت دیگه</button>
    </div>
  )
  if(step==='later')return(
    <div className="stage rise">
      <div className="ring soft">🙂</div>
      <h2 className="h">باشه، هر وقت دلت خواست.</h2>
      <p className="sub">هیچ عجله‌ای نیست.</p>
      <button className="ghost" onClick={reset}>برگرد</button>
    </div>
  )
  if(step==='yes')return(
    <div className="stage rise">
      <div className="ring soft">😄</div>
      <h2 className="h">هییی باشه، بیا!</h2>
      <p className="sub">{place?.name} · {when}{time?` · ساعت ${time}`:''}</p>
      <button className="btn big" disabled={busy} onClick={create}>{busy?'…':'ثبت قرار ✨'}</button>
      <button className="link" onClick={()=>setStep('list')}>برگرد</button>
    </div>
  )
  if(step==='done')return(
    <div className="stage rise">
      <div className="ring soft">🎉</div>
      <h2 className="h">ثبت شد!</h2>
      <p className="sub">{place?.name} · {when}{time?` · ساعت ${time}`:''}</p>
      <button className="btn big" onClick={reset}>باشه</button>
    </div>
  )
  if(step==='when')return(
    <div className="stage rise">
      <h2 className="h">کی؟</h2>
      <div className="chips" style={{justifyContent:'center'}}>{WHEN.map(w=><button key={w} className={'chip2'+(when===w?' on':'')} onClick={()=>setWhen(w)}>{w}</button>)}</div>
      <p className="sub" style={{marginTop:6}}>ساعت (اختیاری)</p>
      <input className="field" style={{textAlign:'center'}} type="time" value={time} onChange={e=>setTime(e.target.value)}/>
      <button className="btn big" disabled={!when} onClick={()=>setStep('ask')}>بعدی</button>
      <button className="link" onClick={()=>setStep('list')}>برگرد</button>
    </div>
  )
  return(
    <div className="grow">
      <h2 className="h">قرار</h2>
      {open?(
        <div className="card2 rise">
          <b>{STATUS[open.status]}</b>
          <p>📍 {open.place_name}<br/>🕒 {open.when_text}</p>
          {sure?<div className="acts"><button className="btn danger" onClick={cancel}>مطمئنم، لغو کن</button><button className="ghost sq" onClick={()=>setSure(false)}>نه</button></div>
            :<button className="mini" onClick={()=>setSure(true)}>لغو قرار</button>}
        </div>
      ):<>
        <p className="sub">یه جا از روی نقشه انتخاب کن.</p>
        {!places.length&&<p className="sub">هنوز جایی اضافه نشده.</p>}
        {places.length>0&&<MapView places={places} selected={sel} onSelect={setSel}/>}
        <div className="placelist">{places.map(p=>(
          <button key={p.id} className={'row'+(sel===p.id?' selrow':'')} onClick={()=>setSel(p.id)}>
            <div><b>{p.name}</b>{p.note&&<span className="tgs">{p.note}</span>}</div>{sel===p.id&&<Ic n="check" s={18}/>}
          </button>))}</div>
        <button className="btn big" disabled={!sel} onClick={()=>setStep('when')}>بعدی</button>
      </>}
      {plans.filter(p=>!['requested','confirmed'].includes(p.status)).length>0&&<>
        <h3 className="sec">قبلی‌ها</h3>
        {plans.filter(p=>!['requested','confirmed'].includes(p.status)).map(p=><div key={p.id} className="ln">{p.place_name} · {p.when_text} · {STATUS[p.status]}</div>)}
      </>}
    </div>
  )
}

function HostDate({say}){
  const [gs,reloadGs]=useGuests(),[places,setPlaces]=useState(null),[plans,setPlans]=useState(null)
  const [pend,setPend]=useState(null),[name,setName]=useState(''),[note,setNote]=useState(''),[sel,setSel]=useState(null),[sure,setSure]=useState(null)
  const load=async()=>{
    const [p,q]=await Promise.all([hub('date.places'),hub('date.plans')])
    if(p.error)say(p.error)
    setPlaces(p.data||[]);setPlans(q.data||[])
  }
  useEffect(()=>{load()},[])
  if(!places)return <div className="skel"/>
  const addPlace=async()=>{
    if(!name.trim())return say('اسم مکان را بنویس')
    const {error}=await hub('date.place.add',{name,note,lat:pend.lat,lng:pend.lng})
    if(error)return say(error)
    setPend(null);setName('');setNote('');say('مکان اضافه شد 📍');load()
  }
  const delPlace=async id=>{const {error}=await hub('date.place.del',{id});if(error)return say(error);setSure(null);setSel(null);load()}
  const status=async(id,s)=>{const {error}=await hub('date.status',{id,status:s});if(error)return say(error);load()}
  return(
    <div className="grow">
      <h2 className="h">قرار</h2>
      <h3 className="sec">چه کسی به این بخش دسترسی دارد؟</h3>
      {gs?.map(g=><div key={g.id} className="between" style={{marginBottom:6}}><span>{g.name}</span><Access g={g} keys={['date']} say={say} reload={reloadGs}/></div>)}
      <h3 className="sec">مکان‌ها (روی نقشه بزن تا اضافه شود)</h3>
      <MapView places={places} selected={sel} onSelect={setSel} onPick={setPend}/>
      {pend&&<div className="gbox" style={{marginTop:10}}>
        <input className="field s" placeholder="اسم مکان" value={name} onChange={e=>setName(e.target.value)}/>
        <div className="gap"/>
        <input className="field s" placeholder="توضیح کوتاه (اختیاری)" value={note} onChange={e=>setNote(e.target.value)}/>
        <div className="acts"><button className="btn" onClick={addPlace}>افزودن مکان</button><button className="ghost sq" onClick={()=>setPend(null)}>انصراف</button></div>
      </div>}
      <div className="placelist">{places.map(p=>(
        <div key={p.id} className={'row'+(sel===p.id?' selrow':'')}>
          <button style={{flex:1,textAlign:'right'}} onClick={()=>setSel(p.id)}><b>{p.name}</b>{p.note&&<span className="tgs"> {p.note}</span>}</button>
          {sure===p.id?<button className="mini red" onClick={()=>delPlace(p.id)}>مطمئنی؟</button>:<button className="mini red" onClick={()=>setSure(p.id)}><Ic n="trash" s={14}/></button>}
        </div>))}</div>
      <h3 className="sec">قرارها</h3>
      {!plans?.length&&<p className="sub">هنوز قراری نیست.</p>}
      {plans?.map(p=>(
        <div key={p.id} className="gbox">
          <div className="between"><b>{p.guest_name}</b><span className="status">{STATUS[p.status]}</span></div>
          <div className="ln">📍 {p.place_name} · 🕒 {p.when_text}</div>
          {['requested','confirmed'].includes(p.status)&&<div className="acts wrapx">
            {p.status==='requested'&&<button className="mini gold" onClick={()=>status(p.id,'confirmed')}>تایید</button>}
            <button className="mini" onClick={()=>status(p.id,'done')}>انجام شد</button>
            <button className="mini red" onClick={()=>status(p.id,'cancelled')}>لغو</button>
          </div>}
        </div>
      ))}
    </div>
  )
}
