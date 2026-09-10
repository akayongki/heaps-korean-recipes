const GIST_FILENAME = 'heaps-korean-recipes.json';
const DEFAULT_GIST_ID = 'd7c7bf5a640d1711148a46a38f0e308b';

function checkPin(req) {
  const expected = process.env.APP_PIN;
  if (!expected) return false; // fail closed if PIN isn't configured server-side
  const provided = req.headers['x-app-pin'] || (req.query && req.query.pin);
  return typeof provided === 'string' && provided === expected;
}

export default async function handler(req, res) {
  const token = process.env.GIST_TOKEN;
  const gistId = process.env.GIST_ID || DEFAULT_GIST_ID;

  if (!token) {
    res.status(500).json({ error: 'Server not configured: missing GIST_TOKEN' });
    return;
  }
  if (!checkPin(req)) {
    res.status(401).json({ error: 'Invalid or missing PIN' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const r = await fetch('https://api.github.com/gists/' + gistId, {
        headers: { Authorization: 'token ' + token, Accept: 'application/vnd.github.v3+json' }
      });
      if (!r.ok) {
        res.status(r.status).json({ error: 'Gist fetch failed' });
        return;
      }
      const data = await r.json();
      const file = data.files && data.files[GIST_FILENAME];
      if (!file) {
        res.status(404).json({ error: 'Recipes file not found in gist' });
        return;
      }
      res.status(200).json({ recipes: JSON.parse(file.content) });
      return;
    }

    if (req.method === 'POST') {
      const recipes = req.body && req.body.recipes;
      if (!Array.isArray(recipes)) {
        res.status(400).json({ error: 'Invalid payload: recipes must be an array' });
        return;
      }
      const content = JSON.stringify(recipes, null, 2);
      const r = await fetch('https://api.github.com/gists/' + gistId, {
        method: 'PATCH',
        headers: { Authorization: 'token ' + token, 'Content-Type': 'application/json', Accept: 'application/vnd.github.v3+json' },
        body: JSON.stringify({ files: { [GIST_FILENAME]: { content } } })
      });
      if (!r.ok) {
        res.status(r.status).json({ error: 'Gist save failed' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: 'Unexpected server error' });
  }
}
