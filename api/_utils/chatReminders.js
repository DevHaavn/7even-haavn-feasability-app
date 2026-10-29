// "Remind me" alerts: the five-minute cron sends every due reminder to the person's own devices, once. Never throws: a missing table or a push failure must not stop the email nudge.
const snippet = (t) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 120)

// store: the chat store (dueReminders, getMessages, pushSubsFor, deletePush, markReminderSent). wp: the web-push sender, or null. Returns the number of reminders handled.
async function sendDue(store, wp, now = Date.now()) {
  let due = []
  try { due = await store.dueReminders(new Date(now).toISOString()) } catch { return 0 }   // the table is not there until the SQL has been run
  if (!due.length) return 0
  let msgs = []
  try { msgs = await store.getMessages([...new Set(due.map((r) => Number(r.message_id)))]) } catch { /* the reminder still goes, without the words */ }
  const by = new Map(msgs.map((m) => [Number(m.id), m]))
  let handled = 0
  for (const r of due) {
    try {
      const m = by.get(Number(r.message_id))
      if (wp) {
        const subs = await store.pushSubsFor([r.person_id])
        const data = JSON.stringify({ title: 'Reminder', body: snippet(m && m.body) || 'A message you asked to be reminded about', tag: 'remind-' + r.id, url: '/?chatopen=' + encodeURIComponent(r.group_id) })
        await Promise.allSettled(subs.map(async (s) => {
          try { await wp.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data) }
          catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) { try { await store.deletePush(s.endpoint) } catch { /* ignore */ } } }
        }))
      }
      await store.markReminderSent(r.id)   // once, even if the person has no device with alerts on
      handled++
    } catch { /* try again on the next run */ }
  }
  return handled
}

module.exports = { sendDue }
