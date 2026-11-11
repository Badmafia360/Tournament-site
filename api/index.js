// Vercel serverless entry point.
//
// vercel.json rewrites /api/* and /uploads/* to this function. Depending on
// routing mode, the request may arrive with the destination path plus a
// `p`/`u` query param (path segments), or already carrying the original
// path. restorePath() normalizes both cases so the Express router always
// sees the original URL.
//
// CommonJS + dynamic import: the repo root has no "type": "module", and the
// server workspace is ESM — dynamic import() bridges the two.

let appPromise;

function restorePath(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const p = url.searchParams.get('p');
    const u = url.searchParams.get('u');
    if (p === null && u === null) return;
    const prefix = p !== null ? '/api/' : '/uploads/';
    const rest = p !== null ? p : u;
    url.searchParams.delete('p');
    url.searchParams.delete('u');
    req.url = prefix + rest + url.search;
  } catch {
    // Unparsable URL — leave req.url untouched.
  }
}

module.exports = async (req, res) => {
  if (!appPromise) {
    appPromise = import('../server/src/app.js').then((m) => m.default);
  }
  const app = await appPromise;
  restorePath(req);
  return app(req, res);
};

// Exposed for tests.
module.exports.restorePath = restorePath;
