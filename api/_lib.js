import {createClient} from '@supabase/supabase-js'
export const db=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY)
export const tg=(chat,text)=>fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text})
}).catch(()=>{})
