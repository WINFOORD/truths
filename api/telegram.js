import {db,tg} from './_lib.js'

export default async function handler(req,res){
  if(req.headers['x-telegram-bot-api-secret-token']!==process.env.TELEGRAM_WEBHOOK_SECRET) return res.status(401).end()
  const m=req.body?.message
  if(!m?.text) return res.json({ok:true})
  const chat=m.chat.id,text=m.text.trim()
  if(text.startsWith('/start')){
    const slug=text.split(' ')[1]
    if(slug){
      const {data:g}=await db.from('guests').select('id,name').eq('slug',slug).maybeSingle()
      if(g){
        await db.from('guests').update({chat_id:chat,tg_username:m.from?.username||null}).eq('id',g.id)
        await tg(chat,`سلام ${g.name} 👋✨\nاز این به بعد هر وقت سؤال تازه‌ای به بازی اضافه بشه، همین‌جا خبرش رو می‌گیری 🎯`)
        return res.json({ok:true})
      }
    }
    await tg(chat,`شناسه‌ی چت شما: ${chat}`)
  }
  res.json({ok:true})
}
