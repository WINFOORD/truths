import {db,tg} from './_lib.js'
const HOST=process.env.TELEGRAM_HOST_CHAT_ID

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).end()
  const {type,id}=req.body||{}
  try{
    if(type==='question'){
      const {data:q}=await db.from('questions').select('*').eq('id',id).maybeSingle()
      if(!q||q.notified) return res.json({ok:true})
      await db.from('questions').update({notified:true}).eq('id',id)
      if(q.owner==='guest'){
        const {data:g}=await db.from('guests').select('name').eq('id',q.guest_id).maybeSingle()
        if(HOST) await tg(HOST,`🎯 ${g?.name||'یکی'} یه سؤال جدید به بازی‌تون اضافه کرد!`)
      }else{
        const {data:gs}=await db.from('guests').select('chat_id').not('chat_id','is',null)
        await Promise.all((gs||[]).map(g=>tg(g.chat_id,'🎯 علی یه سؤال جدید به بازیتون اضافه کرد. بیا جواب بده 😏')))
      }
    }
    if(type==='message'){
      const {data:m}=await db.from('messages').select('*, guests(name)').eq('id',id).maybeSingle()
      if(!m||m.notified) return res.json({ok:true})
      await db.from('messages').update({notified:true}).eq('id',id)
      if(HOST) await tg(HOST,`💌 پیام از ${m.guests?.name||'یکی'}:\n\n${m.body}`)
    }
    res.json({ok:true})
  }catch(e){res.status(500).json({ok:false})}
}
