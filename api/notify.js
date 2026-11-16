import { db, tg, readSession, methodNotAllowed } from '../lib/server.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
  const session = readSession(req)
  if (!session) return res.status(401).json({ error: 'نشست معتبر نیست' })
  const { type, id } = req.body || {}
  if (!id || !['question', 'message'].includes(type)) return res.status(400).json({ error: 'درخواست معتبر نیست' })
  try {
    if (type === 'question') {
      const { data: q, error } = await db.from('questions').select('*').eq('id', id).maybeSingle()
      if (error || !q) return res.status(404).json({ error: 'سؤال پیدا نشد' })
      if (session.role === 'guest' && (q.owner !== 'guest' || q.guest_id !== session.id)) return res.status(403).json({ error: 'دسترسی مجاز نیست' })
      if (session.role === 'host' && q.owner !== 'host') return res.status(403).json({ error: 'دسترسی مجاز نیست' })
      if (q.notified) return res.status(200).json({ ok: true, alreadySent: true })
      let sent = false
      if (q.owner === 'guest') {
        const { data: g } = await db.from('guests').select('name').eq('id', q.guest_id).maybeSingle()
        sent = await tg(process.env.TELEGRAM_HOST_CHAT_ID, `🎯 ${g?.name || 'یکی'} یه سؤال جدید به بازی‌تون اضافه کرد!`)
      } else {
        const { data: guests } = await db.from('guests').select('chat_id').not('chat_id', 'is', null)
        const chats = (guests || []).map(g => g.chat_id).filter(Boolean)
        const results = await Promise.all(chats.map(chat => tg(chat, '🎯 علی یه سؤال جدید به بازیتون اضافه کرد. بیا جواب بده 😏')))
        sent = chats.length > 0 && results.some(Boolean)
      }
      if (sent) await db.from('questions').update({ notified: true }).eq('id', id)
      return res.status(200).json({ ok: true, sent })
    }
    const { data: m, error } = await db.from('messages').select('*, guests(name)').eq('id', id).maybeSingle()
    if (error || !m) return res.status(404).json({ error: 'پیام پیدا نشد' })
    if (session.role !== 'guest' || m.guest_id !== session.id) return res.status(403).json({ error: 'دسترسی مجاز نیست' })
    if (m.notified) return res.status(200).json({ ok: true, alreadySent: true })
    const sent = await tg(process.env.TELEGRAM_HOST_CHAT_ID, `💌 پیام از ${m.guests?.name || 'یکی'}:\n\n${m.body}`)
    if (sent) await db.from('messages').update({ notified: true }).eq('id', id)
    return res.status(200).json({ ok: true, sent })
  } catch (error) {
    console.error('notify error', error)
    return res.status(500).json({ error: 'ارسال اعلان انجام نشد' })
  }
}
