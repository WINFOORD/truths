import { db, tg, readSession, methodNotAllowed } from '../lib/server.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST'])
  const session = readSession(req)
  if (!session) return res.status(401).json({ error: 'نشست معتبر نیست' })
  const { type, id } = req.body || {}
  if (type === 'results') {
    if (session.role !== 'guest') return res.status(403).json({ error: 'دسترسی مجاز نیست' })
    try {
      const { data: questions, error: questionsError } = await db.from('questions')
        .select('id,prompt,statements,truth_index')
        .eq('owner', 'host')
      if (questionsError) throw questionsError
      if (!questions?.length) return res.status(200).json({ ok: true, complete: false })

      const questionIds = questions.map(q => q.id)
      const { data: answers, error: answersError } = await db.from('answers')
        .select('question_id,picked_lies,correct,reported')
        .eq('responder', session.id)
        .in('question_id', questionIds)
      if (answersError) throw answersError
      const byQuestion = new Map((answers || []).map(answer => [answer.question_id, answer]))
      if (questions.some(q => !byQuestion.has(q.id))) {
        return res.status(200).json({ ok: true, complete: false })
      }

      const pending = (answers || []).filter(answer => !answer.reported)
      if (!pending.length) return res.status(200).json({ ok: true, complete: true, alreadySent: true })

      const correctCount = (answers || []).filter(answer => answer.correct).length
      const average = Math.round(correctCount * 100 / answers.length)
      const questionById = new Map(questions.map(q => [q.id, q]))
      const parts = pending.map((answer, index) => {
        const q = questionById.get(answer.question_id)
        const picked = answer.picked_lies.map(n => q.statements[n]).filter(Boolean)
        const truth = q.statements[q.truth_index]
        return `${index + 1}) ${q.prompt || truth}\nجواب: ${picked.join(' | ')}\nحقیقت: ${truth}\n${answer.correct ? '✅ درست' : '❌ نادرست'}`
      })
      const header = `🎯 نتیجه‌ی ${session.name}\nمیانگین تفاهم: ${average}٪ (${correctCount} از ${answers.length} جواب درست)\nجواب‌های جدید: ${pending.length}`
      const messages = []
      let message = header
      for (const part of parts) {
        if (message.length + part.length + 2 > 3500) {
          messages.push(message)
          message = `ادامه‌ی جواب‌های ${session.name}:\n${part}`
        } else message += `\n\n${part}`
      }
      messages.push(message)

      for (const text of messages) {
        if (!await tg(process.env.TELEGRAM_HOST_CHAT_ID, text)) {
          return res.status(200).json({ ok: true, complete: true, sent: false })
        }
      }

      const { error: updateError } = await db.from('answers')
        .update({ reported: true })
        .eq('responder', session.id)
        .in('question_id', pending.map(answer => answer.question_id))
      if (updateError) throw updateError
      return res.status(200).json({ ok: true, complete: true, sent: true })
    } catch (error) {
      console.error('results notification error', error)
      return res.status(500).json({ error: 'ارسال نتیجه انجام نشد' })
    }
  }
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
