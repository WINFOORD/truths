import { db, tg } from '../lib/server.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).end()
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!secret || req.headers['x-telegram-bot-api-secret-token'] !== secret) return res.status(401).end()
  const message = req.body?.message
  if (!message?.text) return res.status(200).json({ ok: true })
  const chat = message.chat.id
  const text = message.text.trim()
  if (text.startsWith('/start')) {
    const slug = text.split(/\s+/)[1]
    if (slug) {
      const { data: guest, error } = await db.from('guests').select('id,name').eq('slug', slug).maybeSingle()
      if (error) return res.status(200).json({ ok: true })
      if (guest) {
        await db.from('guests').update({ chat_id: chat, tg_username: message.from?.username || null }).eq('id', guest.id)
        await tg(chat, `سلام ${guest.name} 👋✨\nاتصال تلگرام انجام شد. از این به بعد وقتی سؤال تازه‌ای به بازی اضافه شود، همین‌جا خبرش را می‌گیری 🎯`)
        return res.status(200).json({ ok: true })
      }
    }
    await tg(chat, 'برای اتصال اعلان‌ها، لینک اختصاصی تلگرام را از داخل بازی باز کن.')
  }
  return res.status(200).json({ ok: true })
}
