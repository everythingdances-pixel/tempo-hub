// /api/claude.js — Proxies requests to Anthropic API
// Keeps the ANTHROPIC_API_KEY on the server, never exposed to the browser.

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { input } = req.body;

  if (!input || typeof input !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "input" field' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const systemPrompt = `You are the triage engine for Tempo Advisory's task capture system.
Tempo Advisory is a boutique management consultancy. The two users are
Paul Lakey (founder) and Camille Chen (director).

Active projects: Kirwan, Filaro, Angove, Portfolio, FHL, WAPC, JDSI,
Bethanie, Everland, Peters, Procurement, DPLH.

When given a raw capture (text, voice transcript, or image description),
return ONLY valid JSON with these fields:
- project: closest matching project name, or "General" if unclear
- urgent: true if time-sensitive or explicitly flagged, otherwise false
- type: one of "task", "note", "decision", "action", "question"
- body: cleaned, concise version of the input (fix voice-to-text errors)
- actions: array of discrete action items extracted, empty array if none

No preamble. No explanation. JSON only.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: input },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(response.status).json({ error: 'Anthropic API error', detail: errBody });
    }

    const data = await response.json();

    // Extract the text content from Claude's response
    const text = data.content?.[0]?.text;
    if (!text) {
      return res.status(500).json({ error: 'No response from Claude' });
    }

    // Strip markdown code fences if Claude wraps the JSON
    let clean = text.trim();
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }

    // Parse the JSON Claude returned
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
