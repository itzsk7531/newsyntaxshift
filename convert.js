// api/convert.js
// This runs on Vercel's server, NOT in the browser — so the API key
// is never exposed to visitors of your site.

export default async function handler(req, res) {
  // Allow simple CORS for safety if you ever call this from another origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { src, tgt, code } = req.body || {};

  if (!code || !src || !tgt) {
    return res.status(400).json({ error: 'Missing src, tgt, or code in request body' });
  }

  // The key lives in an environment variable on Vercel — never in the code.
  const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

  if (!OPENROUTER_KEY) {
    return res.status(500).json({
      error: 'Server is missing OPENROUTER_KEY. Add it in Vercel Project Settings → Environment Variables.'
    });
  }

  try {
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        // OpenRouter asks for these on free models, some free hosts require it
        'HTTP-Referer': 'https://syntaxshift.vercel.app',
        'X-Title': 'SyntaxShift'
      },
      body: JSON.stringify({
        model: 'google/gemma-3-27b-it:free',
        messages: [
          {
            role: 'user',
            content: `Convert this ${src} code to ${tgt}. Return ONLY the converted code, no explanation, no markdown fences:\n${code}`
          }
        ]
      })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || `OpenRouter error (HTTP ${upstream.status})`
      });
    }

    const text = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json({ result: text });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error' });
  }
}
