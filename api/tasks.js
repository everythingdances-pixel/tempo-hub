// /api/tasks.js — Reads and writes tasks to Supabase
// Keeps SUPABASE_URL and SUPABASE_SERVICE_KEY on the server.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=representation',
  };
}

async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...supabaseHeaders(), ...options.headers },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body };
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  // GET /api/tasks — list tasks (default: open, newest first)
  if (req.method === 'GET') {
    const { done } = req.query;
    let path = 'tasks?order=created_at.desc';
    if (done === 'false') path += '&done=eq.false';
    if (done === 'true') path += '&done=eq.true';

    const { ok, body, status } = await supabaseFetch(path);
    if (!ok) return res.status(status).json({ error: 'Supabase read error', detail: body });
    return res.status(200).json(body);
  }

  // POST /api/tasks — create a new task
  if (req.method === 'POST') {
    const task = req.body;
    if (!task || !task.body) {
      return res.status(400).json({ error: 'Task body is required' });
    }

    const { ok, body, status } = await supabaseFetch('tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    if (!ok) return res.status(status).json({ error: 'Supabase write error', detail: body });
    return res.status(201).json(body?.[0] ?? body);
  }

  // PATCH /api/tasks?id=<uuid> — update a task (e.g. mark done)
  if (req.method === 'PATCH') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing task id' });

    const { ok, body, status } = await supabaseFetch(`tasks?id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify(req.body),
    });
    if (!ok) return res.status(status).json({ error: 'Supabase update error', detail: body });
    return res.status(200).json(body?.[0] ?? body);
  }

  // DELETE /api/tasks?id=<uuid> — delete a task
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing task id' });

    const { ok, body, status } = await supabaseFetch(`tasks?id=eq.${id}`, {
      method: 'DELETE',
    });
    if (!ok) return res.status(status).json({ error: 'Supabase delete error', detail: body });
    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
