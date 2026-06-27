const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V3.2';
const SILICONFLOW_URL = 'https://api.siliconflow.cn/v1/chat/completions';

function getAllowedOrigins() {
  return (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function setCorsHeaders(req, res) {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.origin;

  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.content === 'string')
    .slice(-8)
    .map((message) => ({
      role: ['system', 'user', 'assistant'].includes(message.role) ? message.role : 'user',
      content: message.content.slice(0, 4000),
    }));
}

module.exports = async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing SILICONFLOW_API_KEY' });
  }

  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.origin;

  if (allowedOrigins.length > 0 && origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Origin is not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const messages = sanitizeMessages(body.messages);

  if (messages.length === 0) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const response = await fetch(SILICONFLOW_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.SILICONFLOW_MODEL || DEFAULT_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 512,
      stream: false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return res.status(response.status).json({
      error: data.error?.message || data.message || 'SiliconFlow request failed',
    });
  }

  return res.status(200).json(data);
};
