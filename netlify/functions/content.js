// Netlify serverless function: reads/writes the admin-editable JSON files
// (data/events.json, data/menu.json, data/gallery.json) directly on
// GitHub, and accepts new gallery photo uploads, all gated by a single
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

// The three content files the admin panel can read and overwrite.
const ALLOWED_JSON_PATHS = ['data/events.json', 'data/menu.json', 'data/gallery.json'];

// New gallery photos the admin panel can upload. Restricted to this one
// folder and to ordinary image extensions, so the admin panel can never
// be used to write (or overwrite) anything else in the repo. Uploads
// always use a freshly generated filename, so this never touches an
// existing file -- there's no way to overwrite a photo through the
// admin panel, only add new ones or drop them from the gallery list.
const IMAGE_PATH_RE = /^images\/gallery\/[a-zA-Z0-9_-]+\.(jpe?g|png|webp|gif)$/i;

// Keeps a single request well under Netlify's function payload limit.
// Base64 inflates raw bytes by about 4/3, so this allows roughly a 4.5MB
// photo -- plenty for a phone photo, small enough to stay reliable.
const MAX_IMAGE_BASE64_LENGTH = 6000000;

function isAllowedJsonPath(path) {
  return ALLOWED_JSON_PATHS.includes(path);
}

function isAllowedImagePath(path) {
  return typeof path === 'string' && IMAGE_PATH_RE.test(path);
}

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
      if (!isAllowedJsonPath(path)) {
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
      const isJson = isAllowedJsonPath(path);
      const isImage = !isJson && isAllowedImagePath(path);

      if (!isJson && !isImage) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown file.' }) };
      }
      if (isImage && (payload.content || '').length > MAX_IMAGE_BASE64_LENGTH) {
        return { statusCode: 413, headers: cors, body: JSON.stringify({ error: 'That photo is too large. Please use one under about 4MB.' }) };
      }

      const body = {
        message: payload.message || 'Update content via admin panel',
        content: payload.content,
        branch: BRANCH,
      };
      // Only JSON edits carry a sha (they're overwriting a known file).
      // Image uploads always create a brand new file, so no sha is sent.
      if (isJson) { body.sha = payload.sha; }

      const res = await fetch(
        'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + path,
        {
          method: 'PUT',
          headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders),
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        return { statusCode: res.status, headers: cors, body: JSON.stringify({ error: 'GitHub save failed: ' + text }) };
      }
      const json = await res.json();
      return { statusCode: 200, headers: cors, body: JSON.stringify({ sha: json.content.sha, path: json.content.path }) };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed.' }) };
  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
