// /api/upload.js — Uploads images to Supabase Storage (captures bucket)
// Accepts base64 image data, stores in Supabase, returns public URL.

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  const { base64, contentType } = req.body;

  if (!base64 || !contentType) {
    return res.status(400).json({ error: 'Missing base64 or contentType' });
  }

  // Generate unique filename
  const ext = contentType.split('/')[1] || 'jpg';
  const filename = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
  const path = 'captures/' + filename;

  // Convert base64 to binary buffer
  const buffer = Buffer.from(base64, 'base64');

  try {
    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: buffer,
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      return res.status(uploadRes.status).json({ error: 'Upload failed', detail: errBody });
    }

    // Build public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${path}`;

    return res.status(200).json({ url: publicUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
