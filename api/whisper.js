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

  const ext = (mimeType || 'audio/webm').split('/')[1].split(';')[0] || 'webm';
  const filename = 'voice.' + ext;

  // Convert base64 to buffer
  const buffer = Buffer.from(base64, 'base64');

  // Build multipart form data manually for Whisper API
  const boundary = '----WhisperBoundary' + Date.now();
  const parts = [];

  // File part
  parts.push(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="' + filename + '"\r\n' +
    'Content-Type: ' + (mimeType || 'audio/webm') + '\r\n\r\n'
  );
  parts.push(buffer);
  parts.push('\r\n');

  // Model part
  parts.push(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="model"\r\n\r\n' +
    'whisper-1\r\n'
  );

  // Language hint (optional, helps accuracy)
  parts.push(
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="language"\r\n\r\n' +
    'en\r\n'
  );

  parts.push('--' + boundary + '--\r\n');

  // Combine into single buffer
  const bodyParts = parts.map(function(p) {
    return typeof p === 'string' ? Buffer.from(p) : p;
  });
  const body = Buffer.concat(bodyParts);

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_API_KEY,
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
      },
      body: body,
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
