// /api/comments.js — CRUD for task comments

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function headers() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=representation',
  };
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  // GET /api/comments?task_id=<uuid> — list comments for a task
  if (req.method === 'GET') {
    const { task_id } = req.query;
    if (!task_id) return res.status(400).json({ error: 'Missing task_id' });

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/comments?task_id=eq.${task_id}&order=created_at.asc`,
      { headers: headers() }
    );
    const body = await r.json().catch(() => null);
    if (!r.ok) return res.status(r.status).json({ error: 'Read error', detail: body });
    return res.status(200).json(body);
  }

  // POST /api/comments — add a comment
  if (req.method === 'POST') {
    const comment = req.body;
    if (!comment || !comment.task_id || !comment.body) {
      return res.status(400).json({ error: 'task_id and body required' });
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/comments`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(comment),
    });
    const body = await r.json().catch(() => null);
    if (!r.ok) return res.status(r.status).json({ error: 'Write error', detail: body });
    return res.status(201).json(body?.[0] ?? body);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
