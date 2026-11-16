import { db, readSession, methodNotAllowed } from '../lib/server.js'

const TABLES = new Set(['guests', 'questions', 'answers', 'messages'])
const filter = (query, filters = []) => {
  for (const f of filters) {
    if (!f || typeof f.column !== 'string' || !/^[a-z_]+$/.test(f.column)) continue
    if (f.op === 'eq') query = query.eq(f.column, f.value)
    else if (f.op === 'neq') query = query.neq(f.column, f.value)
    else if (f.op === 'not' && f.operator === 'is') query = query.not(f.column, 'is', f.value)
  }
  return query
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
  const session = readSession(req)
  if (!session) return res.status(401).json({ error: 'نشست شما منقضی شده؛ دوباره وارد شو' })
  const body = req.body || {}
  const { table, action = 'select', columns = '*', filters = [], orders = [], singleMode, limit } = body
  let values = body.values
  if (!TABLES.has(table) || !['select', 'insert', 'update', 'delete'].includes(action)) return res.status(400).json({ error: 'درخواست دیتابیس معتبر نیست' })
  const host = session.role === 'host'
  if (!host && table === 'questions' && action === 'update' && values && typeof values === 'object') {
    const allowed = ['prompt', 'statements', 'truth_index', 'story']
    values = Object.fromEntries(Object.entries(values).filter(([key]) => allowed.includes(key)))
  }
  if (!host) {
    if (table === 'guests' && action !== 'select') return res.status(403).json({ error: 'دسترسی مجاز نیست' })
    if (table === 'messages' && !(action === 'insert' || action === 'select')) return res.status(403).json({ error: 'دسترسی مجاز نیست' })
    if (table === 'messages' && action === 'select') return res.status(403).json({ error: 'دسترسی مجاز نیست' })
    if (table === 'questions' && !['select', 'insert', 'update', 'delete'].includes(action)) return res.status(403).json({ error: 'دسترسی مجاز نیست' })
    if (table === 'answers' && !['select', 'insert', 'delete'].includes(action)) return res.status(403).json({ error: 'دسترسی مجاز نیست' })
  }
  try {
    let query
    if (action === 'select') query = db.from(table).select(columns)
    if (action === 'insert') {
      const rows = Array.isArray(values) ? values : [values]
      if (!rows.length || rows.some(x => !x || typeof x !== 'object')) return res.status(400).json({ error: 'داده معتبر نیست' })
      if (!host) {
        if (table === 'questions') {
          if (rows.some(x => x.owner !== 'guest' || x.guest_id !== session.id)) return res.status(403).json({ error: 'دسترسی مجاز نیست' })
          if (rows.some(x => !Array.isArray(x.statements) || x.statements.length !== 3 || x.statements.some(t => typeof t !== 'string' || !t.trim() || t.length > 500) || !Number.isInteger(x.truth_index) || x.truth_index < 0 || x.truth_index > 2 || String(x.prompt || '').length > 120 || String(x.story || '').length > 3000)) return res.status(400).json({ error: 'متن سؤال یا گزینه‌ها معتبر نیستند' })
          values = rows.map(x => ({ prompt: x.prompt || '', statements: x.statements, truth_index: x.truth_index, story: x.story || '', owner: 'guest', guest_id: session.id, notified: false }))
        }
        if (table === 'answers') {
          const checked = []
          for (const row of rows) {
            if (!Array.isArray(row.picked_lies) || row.picked_lies.length !== 2 || row.picked_lies.some(n => !Number.isInteger(n) || n < 0 || n > 2) || row.picked_lies[0] === row.picked_lies[1]) return res.status(400).json({ error: 'انتخاب‌ها معتبر نیستند' })
            const { data: q, error } = await db.from('questions').select('id,owner,truth_index').eq('id', row.question_id).maybeSingle()
            if (error || !q || q.owner !== 'host') return res.status(403).json({ error: 'این سؤال قابل پاسخ نیست' })
            const lies = [0, 1, 2].filter(n => n !== q.truth_index)
            checked.push({ question_id: q.id, responder: session.id, picked_lies: row.picked_lies, correct: lies.every(n => row.picked_lies.includes(n)) })
          }
          values = checked
        }
        if (table === 'messages') {
          if (rows.some(x => x.guest_id !== session.id)) return res.status(403).json({ error: 'دسترسی مجاز نیست' })
          if (rows.some(x => !String(x.body || '').trim() || String(x.body).length > 2000)) return res.status(400).json({ error: 'متن پیام معتبر نیست' })
          values = rows.map(x => ({ guest_id: session.id, body: String(x.body).trim(), notified: false }))
        }
      }
      query = table === 'answers' ? db.from(table).upsert(values, { onConflict: 'question_id,responder' }) : db.from(table).insert(values)
      if (columns && columns !== '*') query = query.select(columns)
      else if (body.returning) query = query.select(body.returning)
    }
    if (action === 'update') {
      if (!values || typeof values !== 'object' || Array.isArray(values)) return res.status(400).json({ error: 'داده معتبر نیست' })
      query = db.from(table).update(values)
    }
    if (action === 'delete') query = db.from(table).delete()

    query = filter(query, filters)
    if (!host) {
      if (table === 'guests' && action === 'select') query = query.eq('id', session.id)
      if (table === 'questions') {
        if (action === 'select') {
          const ownerFilter = filters.find(f => f.column === 'owner' && f.op === 'eq')?.value
          if (ownerFilter === 'guest') query = query.eq('guest_id', session.id)
          else if (ownerFilter !== 'host') query = query.eq('guest_id', session.id)
          if (ownerFilter !== 'guest') query = query.eq('owner', 'host')
          query = query.eq('answers.responder', session.id)
        } else if (['update', 'delete'].includes(action)) {
          query = query.eq('owner', 'guest').eq('guest_id', session.id)
        }
      }
      if (table === 'answers' && action === 'select') query = query.eq('responder', session.id)
      if (table === 'answers' && action === 'delete') {
        const questionId = filters.find(f => f.column === 'question_id' && f.op === 'eq')?.value
        if (!questionId) return res.status(403).json({ error: 'دسترسی مجاز نیست' })
        const { data: ownQuestion, error } = await db.from('questions').select('id').eq('id', questionId).eq('owner', 'guest').eq('guest_id', session.id).maybeSingle()
        if (error || !ownQuestion) return res.status(403).json({ error: 'دسترسی مجاز نیست' })
      }
    }
    for (const order of orders) if (order && /^[a-z_]+$/.test(order.column)) query = query.order(order.column, { ascending: order.ascending !== false })
    if (Number.isInteger(limit)) query = query.limit(Math.max(1, Math.min(500, limit)))
    if (singleMode === 'single') query = query.single()
    if (singleMode === 'maybeSingle') query = query.maybeSingle()
    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message, code: error.code })
    return res.status(200).json({ data })
  } catch (error) {
    console.error('db api error', error)
    return res.status(500).json({ error: 'خطای داخلی سرور' })
  }
}
