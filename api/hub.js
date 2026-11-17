import { db, tg, readSession, methodNotAllowed } from '../lib/server.js'

const DEFAULT_FEATURES = { page: true, game: true, tot: true, date: false }
const FEATURE_KEYS = Object.keys(DEFAULT_FEATURES)
const HOST_CHAT = () => process.env.TELEGRAM_HOST_CHAT_ID

const FAL = [
  'امروز یه اتفاق کوچیک و خوب سر راهته؛ فقط باید ازش رد نشی.',
  'یه چیزی که چند وقته فکرت رو مشغول کرده، امروز یه جواب کوچیک پیدا می‌کنه.',
  'امروز به یه چیز ساده خوب نگاه کن؛ از اون چیزی که فکر می‌کنی جالب‌تره.',
  'یکی امروز بی‌دلیل به تو فکر می‌کنه و لبخند می‌زنه.',
  'یه آهنگ قدیمی امروز دوباره سر زبونت میاد؛ بذار تا آخر بره.',
  'امروز روز خوبیه برای شروع کاری که عقب انداختی.',
  'یه خبر خوب نزدیکه، با یه تماس یا یه پیام کوتاه.',
  'امروز اگه کنجکاو باشی، یه چیز جدید یاد می‌گیری.',
  'یه ایده‌ی کوچیک امروز به ذهنت می‌رسه؛ یادداشتش کن.',
  'قهوه یا چایی که امروز می‌خوری، طعم بهتری از همیشه داره.',
  'آدمی که انتظارش رو نداری، امروز حرف قشنگی بهت می‌زنه.',
  'یه برنامه‌ی ساده امروز از یه برنامه‌ی بزرگ بهتر درمیاد.',
  'امروز نفس عمیق بکش؛ از اون چیزی که به نظر میاد آروم‌تره.',
  'چیزی که گم کرده بودی، امروز خودش رو نشون می‌ده.',
  'شب، آسمون امروز ارزش یه نگاه رو داره.'
]

const fail = (res, code, error) => res.status(code).json({ error })
const lines = text => String(text || '').split('\n').map(x => x.trim()).filter(Boolean)
const dayIndex = () => Math.floor((Date.now() + 3.5 * 3600 * 1000) / 86400000) // Tehran day
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const feats = g => ({ ...DEFAULT_FEATURES, ...(g?.features && typeof g.features === 'object' ? g.features : {}) })
const str = (v, max) => String(v ?? '').trim().slice(0, max)
const isId = v => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v)

function parseCards(text) {
  return lines(text).map(l => {
    const i = l.indexOf('|')
    return i > 0 ? { title: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { title: '', text: l }
  })
}

async function guestNames() {
  const { data } = await db.from('guests').select('id,name')
  return Object.fromEntries((data || []).map(g => [g.id, g.name]))
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
  const session = readSession(req)
  if (!session) return fail(res, 401, 'نشست شما منقضی شده؛ دوباره وارد شو')
  const body = req.body || {}
  const action = body.action
  const host = session.role === 'host'

  try {
    let guest = null
    if (!host) {
      const { data, error } = await db.from('guests').select('id,name,chat_id,features,fal,page_cards').eq('id', session.id).maybeSingle()
      if (error) throw error
      if (!data) return fail(res, 401, 'نشست معتبر نیست')
      guest = data
    }
    const F = host ? { page: true, game: true, tot: true, date: true } : feats(guest)
    const needGuest = key => {
      if (host) return fail(res, 403, 'این عملیات مخصوص مخاطب است')
      if (!F[key]) return fail(res, 403, 'این بخش برای تو فعال نیست')
      return null
    }
    const needHost = () => (host ? null : fail(res, 403, 'دسترسی مجاز نیست'))
    const ok = data => res.status(200).json({ data: data ?? null })

    // ───────── personal page ─────────
    if (action === 'page.get') {
      const denied = needGuest('page'); if (denied) return denied
      const pool = lines(guest.fal).length ? lines(guest.fal) : FAL
      const fal = pool[(dayIndex() + hash(guest.id)) % pool.length]
      const { data: timed, error } = await db.from('timed_messages').select('id,body,unlock_at').eq('guest_id', guest.id).order('unlock_at', { ascending: true })
      if (error) throw error
      const now = Date.now()
      return ok({
        fal,
        cards: parseCards(guest.page_cards),
        timed: (timed || []).map(t => new Date(t.unlock_at).getTime() <= now
          ? { id: t.id, unlock_at: t.unlock_at, locked: false, body: t.body }
          : { id: t.id, unlock_at: t.unlock_at, locked: true })
      })
    }

    if (action === 'guest.get') {
      const denied = needHost(); if (denied) return denied
      if (!isId(body.guest_id)) return fail(res, 400, 'مخاطب معتبر نیست')
      const [{ data: g, error }, { data: timed }] = await Promise.all([
        db.from('guests').select('id,name,features,fal,page_cards').eq('id', body.guest_id).maybeSingle(),
        db.from('timed_messages').select('id,body,unlock_at').eq('guest_id', body.guest_id).order('unlock_at', { ascending: true })
      ])
      if (error || !g) return fail(res, 404, 'مخاطب پیدا نشد')
      return ok({ features: feats(g), fal: g.fal || '', page_cards: g.page_cards || '', timed: timed || [] })
    }

    if (action === 'guest.set') {
      const denied = needHost(); if (denied) return denied
      if (!isId(body.guest_id)) return fail(res, 400, 'مخاطب معتبر نیست')
      const patch = {}
      if (typeof body.fal === 'string') patch.fal = body.fal.slice(0, 4000)
      if (typeof body.page_cards === 'string') patch.page_cards = body.page_cards.slice(0, 8000)
      if (body.features && typeof body.features === 'object') {
        const f = {}
        for (const k of FEATURE_KEYS) f[k] = Boolean(body.features[k])
        patch.features = f
      }
      if (!Object.keys(patch).length) return fail(res, 400, 'چیزی برای ذخیره نیست')
      const { error } = await db.from('guests').update(patch).eq('id', body.guest_id)
      if (error) throw error
      return ok(true)
    }

    if (action === 'timed.add') {
      const denied = needHost(); if (denied) return denied
      const text = str(body.body, 2000), at = new Date(body.unlock_at)
      if (!isId(body.guest_id) || !text || Number.isNaN(at.getTime())) return fail(res, 400, 'پیام یا زمان معتبر نیست')
      const { data, error } = await db.from('timed_messages').insert({ guest_id: body.guest_id, body: text, unlock_at: at.toISOString() }).select('id,body,unlock_at').single()
      if (error) throw error
      return ok(data)
    }
    if (action === 'timed.del') {
      const denied = needHost(); if (denied) return denied
      if (!isId(body.id)) return fail(res, 400, 'شناسه معتبر نیست')
      const { error } = await db.from('timed_messages').delete().eq('id', body.id)
      if (error) throw error
      return ok(true)
    }

    // ───────── this or that ─────────
    if (action === 'tot.list') {
      if (host) {
        const [{ data: prompts, error }, { data: answers }, names] = await Promise.all([
          db.from('tot_prompts').select('*').order('created_at', { ascending: false }).limit(200),
          db.from('tot_answers').select('prompt_id,guest_id,pick'),
          guestNames()
        ])
        if (error) throw error
        return ok((prompts || []).map(p => ({
          ...p,
          target: p.guest_id ? names[p.guest_id] || '؟' : null,
          answers: (answers || []).filter(a => a.prompt_id === p.id).map(a => ({ guest_id: a.guest_id, name: names[a.guest_id] || '؟', pick: a.pick }))
        })))
      }
      const denied = needGuest('tot'); if (denied) return denied
      const [{ data: prompts, error }, { data: answers }] = await Promise.all([
        db.from('tot_prompts').select('*').or(`guest_id.is.null,guest_id.eq.${guest.id}`).order('created_at', { ascending: false }).limit(200),
        db.from('tot_answers').select('prompt_id,pick').eq('guest_id', guest.id)
      ])
      if (error) throw error
      const mine = new Map((answers || []).map(a => [a.prompt_id, a.pick]))
      return ok((prompts || []).map(p => {
        const my = mine.has(p.id) ? mine.get(p.id) : null
        return {
          id: p.id, category: p.category, option_a: p.option_a, option_b: p.option_b, created_at: p.created_at,
          my_pick: my,
          host_pick: my === null ? undefined : p.host_pick // revealed only after she answers
        }
      }))
    }
    if (action === 'tot.add') {
      const denied = needHost(); if (denied) return denied
      const a = str(body.option_a, 120), b = str(body.option_b, 120)
      if (!a || !b) return fail(res, 400, 'هر دو گزینه را بنویس')
      const hp = body.host_pick === 0 || body.host_pick === 1 ? body.host_pick : null
      const gid = isId(body.guest_id) ? body.guest_id : null
      const { data, error } = await db.from('tot_prompts').insert({ category: str(body.category, 40), option_a: a, option_b: b, host_pick: hp, guest_id: gid }).select('id').single()
      if (error) throw error
      return ok(data)
    }
    if (action === 'tot.setpick') {
      const denied = needHost(); if (denied) return denied
      if (!isId(body.id) || ![0, 1].includes(body.host_pick)) return fail(res, 400, 'درخواست معتبر نیست')
      const { error } = await db.from('tot_prompts').update({ host_pick: body.host_pick }).eq('id', body.id)
      if (error) throw error
      return ok(true)
    }
    if (action === 'tot.del') {
      const denied = needHost(); if (denied) return denied
      if (!isId(body.id)) return fail(res, 400, 'شناسه معتبر نیست')
      const { error } = await db.from('tot_prompts').delete().eq('id', body.id)
      if (error) throw error
      return ok(true)
    }
    if (action === 'tot.answer') {
      const denied = needGuest('tot'); if (denied) return denied
      if (!isId(body.prompt_id) || ![0, 1].includes(body.pick)) return fail(res, 400, 'درخواست معتبر نیست')
      const { data: p } = await db.from('tot_prompts').select('id,guest_id,host_pick').eq('id', body.prompt_id).maybeSingle()
      if (!p || (p.guest_id && p.guest_id !== guest.id)) return fail(res, 404, 'سؤال پیدا نشد')
      const { data: existing } = await db.from('tot_answers').select('pick').eq('prompt_id', p.id).eq('guest_id', guest.id).maybeSingle()
      if (existing) return ok({ pick: existing.pick, host_pick: p.host_pick }) // first answer stays
      const { error } = await db.from('tot_answers').insert({ prompt_id: p.id, guest_id: guest.id, pick: body.pick })
      if (error) throw error
      return ok({ pick: body.pick, host_pick: p.host_pick })
    }

    // ───────── date planning ─────────
    if (action === 'date.places') {
      if (!host) { const denied = needGuest('date'); if (denied) return denied }
      const { data, error } = await db.from('date_places').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return ok(data || [])
    }
    if (action === 'date.place.add') {
      const denied = needHost(); if (denied) return denied
      const lat = Number(body.lat), lng = Number(body.lng), name = str(body.name, 80)
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return fail(res, 400, 'مکان معتبر نیست')
      const { data, error } = await db.from('date_places').insert({ name, note: str(body.note, 200), lat, lng }).select('*').single()
      if (error) throw error
      return ok(data)
    }
    if (action === 'date.place.del') {
      const denied = needHost(); if (denied) return denied
      if (!isId(body.id)) return fail(res, 400, 'شناسه معتبر نیست')
      const { error } = await db.from('date_places').delete().eq('id', body.id)
      if (error) throw error
      return ok(true)
    }
    if (action === 'date.plans') {
      if (host) {
        const [{ data, error }, names] = await Promise.all([
          db.from('date_plans').select('*').order('created_at', { ascending: false }).limit(100),
          guestNames()
        ])
        if (error) throw error
        return ok((data || []).map(p => ({ ...p, guest_name: names[p.guest_id] || '؟' })))
      }
      const denied = needGuest('date'); if (denied) return denied
      const { data, error } = await db.from('date_plans').select('*').eq('guest_id', guest.id).order('created_at', { ascending: false }).limit(20)
      if (error) throw error
      return ok(data || [])
    }
    if (action === 'date.create') {
      const denied = needGuest('date'); if (denied) return denied
      if (!isId(body.place_id)) return fail(res, 400, 'مکان معتبر نیست')
      const when = str(body.when_text, 80)
      if (!when) return fail(res, 400, 'زمان را مشخص کن')
      const { data: place } = await db.from('date_places').select('id,name').eq('id', body.place_id).maybeSingle()
      if (!place) return fail(res, 404, 'این مکان دیگر وجود ندارد')
      const { data: open } = await db.from('date_plans').select('id').eq('guest_id', guest.id).in('status', ['requested', 'confirmed']).limit(1)
      if (open?.length) return fail(res, 409, 'یک قرار باز داری؛ اول همان را ببین')
      const { data, error } = await db.from('date_plans').insert({ guest_id: guest.id, place_id: place.id, place_name: place.name, when_text: when }).select('*').single()
      if (error) throw error
      await tg(HOST_CHAT(), `🗓 ${guest.name} یه قرار پیشنهاد داد!\n📍 ${place.name}\n🕒 ${when}`)
      return ok(data)
    }
    if (action === 'date.cancel') {
      const denied = needGuest('date'); if (denied) return denied
      if (!isId(body.id)) return fail(res, 400, 'شناسه معتبر نیست')
      const { data, error } = await db.from('date_plans').update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', body.id).eq('guest_id', guest.id).in('status', ['requested', 'confirmed']).select('id,place_name').maybeSingle()
      if (error) throw error
      if (!data) return fail(res, 404, 'قرار پیدا نشد')
      await tg(HOST_CHAT(), `↩️ ${guest.name} قرار «${data.place_name}» را لغو کرد.`)
      return ok(true)
    }
    if (action === 'date.status') {
      const denied = needHost(); if (denied) return denied
      if (!isId(body.id) || !['confirmed', 'done', 'cancelled'].includes(body.status)) return fail(res, 400, 'درخواست معتبر نیست')
      const { data, error } = await db.from('date_plans').update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', body.id).select('place_name,when_text,guest_id').maybeSingle()
      if (error) throw error
      if (data && body.status === 'confirmed') {
        const { data: g } = await db.from('guests').select('chat_id').eq('id', data.guest_id).maybeSingle()
        if (g?.chat_id) await tg(g.chat_id, `✅ قرارت تایید شد!\n📍 ${data.place_name}\n🕒 ${data.when_text}`)
      }
      return ok(true)
    }

    return fail(res, 400, 'عملیات معتبر نیست')
  } catch (error) {
    console.error('hub error', action, error)
    return fail(res, 500, 'خطای داخلی سرور')
  }
}
