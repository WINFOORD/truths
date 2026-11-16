import { db, createSession, setSessionCookie, clearSessionCookie, readSession, methodNotAllowed } from '../lib/server.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'GET') { const session = readSession(req); return session ? res.status(200).json({ session }) : res.status(401).json({ error: 'نشست معتبر نیست' }) }
  if (req.method === 'DELETE') { clearSessionCookie(res); return res.status(200).json({ ok: true }) }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST', 'DELETE'])
  const { role, pin } = req.body || {}
  try {
    let session, maxAge
    if (role === 'host') {
      const expected = process.env.HOST_PIN
      if (!expected || typeof pin !== 'string' || pin.length < 4 || pin !== expected) return res.status(401).json({ error: 'رمز میزبان درست نیست' })
      session = { role: 'host', name: process.env.HOST_NAME || 'علی' }; maxAge = 60 * 60 * 24 * 7
    } else if (role === 'guest') {
      const invite = typeof req.body?.invite === 'string' ? req.body.invite : ''
      if (!/^[a-f0-9]{32,64}$/i.test(invite)) return res.status(400).json({ error: 'لینک دعوت معتبر نیست' })
      const { data: g, error } = await db.from('guests').select('id,name,slug,theme,notes,invite_token').eq('invite_token', invite).maybeSingle()
      if (error) throw error
      if (!g) return res.status(401).json({ error: 'این لینک دعوت معتبر نیست یا غیرفعال شده' })
      session = { role: 'guest', id: g.id, name: g.name, slug: g.slug, theme: g.theme || '', notes: g.notes || '', invite_token: g.invite_token }
      maxAge = 60 * 60 * 24 * 30
    } else return res.status(400).json({ error: 'نوع ورود معتبر نیست' })
    const token = createSession(session, maxAge)
    setSessionCookie(res, token, maxAge)
    return res.status(200).json({ session })
  } catch (error) {
    console.error('auth error', error)
    return res.status(500).json({ error: 'ورود انجام نشد؛ تنظیمات سرور را بررسی کن' })
  }
}
