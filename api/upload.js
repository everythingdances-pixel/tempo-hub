// /api/upload.js — Uploads files to Supabase Storage (captures bucket)
// Accepts base64 data + contentType, stores in Supabase, returns public URL.

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

// Map MIME types to proper extensions for non-obvious types
const MIME_EXT = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
};

function getExtension(contentType, originalName) {
  // Prefer extension from original filename if provided
  if (originalName) {
    const dotIdx = originalName.lastIndexOf('.');
    if (dotIdx > 0) return originalName.slice(dotIdx + 1).toLowerCase();
  }
  // Check known MIME map
  if (MIME_EXT[contentType]) return MIME_EXT[contentType];
  // Fallback: second part of MIME (works for image/jpeg, image/png, application/pdf)
  const sub = contentType.split('/')[1];
  if (sub && sub.length < 10) return sub;
  return 'bin';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase env vars not configured' });
  }

  const { base64, contentType, originalName } = req.body;

  if (!base64 || !contentType) {
    return res.status(400).json({ error: 'Missing base64 or contentType' });
  }

  // Generate unique filename with proper extension
  const ext = getExtension(contentType, originalName);
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
