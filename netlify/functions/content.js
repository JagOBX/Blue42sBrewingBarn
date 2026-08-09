// Netlify serverless function: reads/writes the admin-editable JSON files
// (data/events.json, data/menu.json) directly on GitHub, gated by a single
// admin password. Two secrets are read from Netlify environment variables
// (Site configuration > Environment variables) -- never from this file:
//
//   ADMIN_PASSWORD  the one password the admin panel asks for
//   GITHUB_TOKEN    a GitHub personal access token with Contents:
//                    read & write on this repo only
//
// This keeps the client-side admin page free of any real secret -- the
// password typed into the browser is only ever compared here, server-side.

const REPO_OWNER = 'JagOBX';
const REPO_NAME = 'Blue42sBrewingBarn';
const BRANCH = 'main';
const ALLOWED_PATHS = ['data/events.json', 'data/menu.json'];

exports.handler = async (event) => {
  const cors = { 'Content-Type': 'application/json' };

  const auth = event.headers.authorization || event.headers.Authorization || '';
  const password = auth.replace(/^Bearer\s+/i, '');
  const adminPassword = process.env.ADMIN_PASSWORD;
  const token = process.env.GITHUB_TOKEN;

  if (!adminPassword || !token) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Admin panel is not fully configured yet. Missing ADMIN_PASSWORD or GITHUB_TOKEN.' }) };
  }
  if (!password || password !== adminPassword) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Incorrect password.' }) };
  }

  const ghHeaders = {
    Authorization: 'Bearer ' + token,
    'User-Agent': 'blue42-admin-panel',
    Accept: 'application/vnd.github+json',
  };

  try {
    if (event.httpMethod === 'GET') {
      const path = (event.queryStringParameters || {}).path;
      if (!ALLOWED_PATHS.includes(path)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown file.' }) };
      }
      const res = await fetch(
        'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + path + '?ref=' + BRANCH,
        { headers: ghHeaders }
      );
      if (!res.ok) {
        const text = await res.text();
        return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: 'GitHub load failed: ' + text }) };
      }
      const json = await res.json();
      return { statusCode: 200, headers: cors, body: JSON.stringify({ content: json.content, sha: json.sha }) };
    }

    if (event.httpMethod === 'PUT') {
      const payload = JSON.parse(event.body || '{}');
      const path = payload.path;
      if (!ALLOWED_PATHS.includes(path)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown file.' }) };
      }
      const res = await fetch(
        'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + path,
        {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders),
          body: JSON.stringify({
            message: payload.message || 'Update content via admin panel',
            content: payload.content,
            sha: payload.sha,
            branch: BRANCH,
          }),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: 'GitHub save failed: ' + text }) };
      }
      const json = await res.json();
      return { statusCode: 200, headers: cors, body: JSON.stringify({ sha: json.content.sha }) };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed.' }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
