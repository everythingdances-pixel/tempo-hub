// /api/whisper.js — Transcribes audio via OpenAI Whisper API
// Accepts base64 audio data, returns transcription text.

export const config = {
  api: { bodyParser: { sizeLimit: '25mb' } }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const { base64, mimeType } = req.body;

  if (!base64) {
    return res.status(400).json({ error: 'Missing base64 audio data' });
  }

  const mime = mimeType || 'audio/webm';
  const ext = mime.split('/')[1].split(';')[0] || 'webm';
  const filename = 'voice.' + ext;

  // Convert base64 to buffer then to Blob for FormData
  const buffer = Buffer.from(base64, 'base64');
  const blob = new Blob([buffer], { type: mime });

  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(response.status).json({ error: 'Whisper API error', detail: errBody });
    }

    const data = await response.json();
    return res.status(200).json({ text: data.text || '' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
