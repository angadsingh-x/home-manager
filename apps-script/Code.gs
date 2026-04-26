/**
 * Home Manager — Google Apps Script backend.
 *
 * Required Script Properties (Project Settings → Script properties):
 *   SHEET_ID         The ID of the Google Sheet that holds users/leaves/shopping/calendar/things tabs.
 *   ALLOWED_AUD      The OAuth 2.0 Web client ID; must match the `aud` claim on incoming ID tokens.
 *
 * Deploy as: Web app, Execute as: Me, Who has access: Anyone (auth is enforced inside the script).
 */

const TABS = ['users', 'leaves', 'shopping', 'calendar', 'things'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const token = (e.parameter && e.parameter.token) || body.idToken;
    if (!token) return json({ error: 'missing_token' }, 401);

    const claims = verifyIdToken(token);
    if (!claims) return json({ error: 'invalid_token' }, 401);

    const email = String(claims.email || '').toLowerCase();
    const user = lookupUser(email);
    if (!user) return json({ error: 'not_authorized', email }, 403);

    const action = body.action;
    const tab = body.tab;

    if (action === 'home') return json({ data: getHomeView() });

    if (!TABS.includes(tab)) return json({ error: 'bad_tab' }, 400);

    switch (action) {
      case 'list':   return json({ data: listRows(tab) });
      case 'add':    return json({ data: addRow(tab, body.data || {}, email) });
      case 'update': return json({ data: updateRow(tab, body.id, body.data || {}, email) });
      case 'delete': return json({ data: deleteRow(tab, body.id) });
      default:       return json({ error: 'bad_action' }, 400);
    }
  } catch (err) {
    return json({ error: 'server_error', message: String(err && err.message || err) }, 500);
  }
}

function doGet() {
  // Browser preflight / sanity check. CORS is automatic on Apps Script web apps.
  return json({ ok: true });
}

function json(obj, _status) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyIdToken(token) {
  const cache = CacheService.getScriptCache();
  const key = 'tok:' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, token)
  );
  const nowSec = Math.floor(Date.now() / 1000);

  const hit = cache.get(key);
  if (hit) {
    try {
      const cached = JSON.parse(hit);
      if (Number(cached.exp) > nowSec) return cached;
    } catch (e) { /* fall through to refetch */ }
    cache.remove(key);
  }

  const url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token);
  const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (resp.getResponseCode() !== 200) return null;
  const claims = JSON.parse(resp.getContentText());
  const expectedAud = PropertiesService.getScriptProperties().getProperty('ALLOWED_AUD');
  if (!expectedAud || claims.aud !== expectedAud) return null;
  if (claims.email_verified !== 'true' && claims.email_verified !== true) return null;
  if (Number(claims.exp) <= nowSec) return null;

  // Cap cache TTL to remaining token lifetime, max 5 min.
  const ttl = Math.min(300, Number(claims.exp) - nowSec);
  if (ttl > 0) cache.put(key, JSON.stringify(claims), ttl);
  return claims;
}

function sheet(tab) {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const ss = SpreadsheetApp.openById(id);
  const sh = ss.getSheetByName(tab);
  if (!sh) throw new Error('tab_missing:' + tab);
  return sh;
}

function readAll(tab) {
  const sh = sheet(tab);
  const values = sh.getDataRange().getValues();
  if (values.length === 0) return { headers: [], rows: [] };
  const headers = values[0].map(String);
  const rows = values.slice(1)
    .filter(function (r) { return r.some(function (c) { return c !== '' && c !== null; }); })
    .map(function (r) {
      const obj = {};
      for (let i = 0; i < headers.length; i++) obj[headers[i]] = r[i];
      return obj;
    });
  return { headers: headers, rows: rows };
}

function lookupUser(email) {
  const { rows } = readAll('users');
  return rows.find(function (r) { return String(r.email || '').toLowerCase() === email; }) || null;
}

function listRows(tab) {
  return readAll(tab).rows;
}

function addRow(tab, data, email) {
  const sh = sheet(tab);
  const { headers } = readAll(tab);
  const id = data.id || Utilities.getUuid();
  const now = new Date().toISOString();

  const record = Object.assign({}, data, { id: id });
  if (headers.indexOf('created_by') !== -1 && !record.created_by) record.created_by = email;
  if (headers.indexOf('created_at') !== -1 && !record.created_at) record.created_at = now;
  if (headers.indexOf('updated_by') !== -1) record.updated_by = email;
  if (headers.indexOf('updated_at') !== -1) record.updated_at = now;

  const row = headers.map(function (h) { return record[h] === undefined ? '' : record[h]; });
  sh.appendRow(row);
  return record;
}

function findRowIndex(tab, id) {
  const sh = sheet(tab);
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);
  const idCol = headers.indexOf('id');
  if (idCol === -1) throw new Error('no_id_column');
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) return { sheet: sh, headers: headers, rowNum: i + 1, current: rowToObject(headers, values[i]) };
  }
  return null;
}

function rowToObject(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) obj[headers[i]] = row[i];
  return obj;
}

function updateRow(tab, id, patch, email) {
  const found = findRowIndex(tab, id);
  if (!found) throw new Error('not_found');
  const merged = Object.assign({}, found.current, patch, { id: id });
  if (found.headers.indexOf('updated_by') !== -1) merged.updated_by = email;
  if (found.headers.indexOf('updated_at') !== -1) merged.updated_at = new Date().toISOString();
  // Shopping done_by/done_at: stamp when status flips to done.
  if (tab === 'shopping' && patch.status === 'done') {
    merged.done_by = email;
    merged.done_at = new Date().toISOString();
  }
  const newRow = found.headers.map(function (h) { return merged[h] === undefined ? '' : merged[h]; });
  found.sheet.getRange(found.rowNum, 1, 1, found.headers.length).setValues([newRow]);
  return merged;
}

function deleteRow(tab, id) {
  const found = findRowIndex(tab, id);
  if (!found) throw new Error('not_found');
  found.sheet.deleteRow(found.rowNum);
  return { id: id, deleted: true };
}

function getHomeView() {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const dayAfter = addDays(today, 2);

  const leaves = readAll('leaves').rows;
  const events = readAll('calendar').rows;
  const shopping = readAll('shopping').rows;

  function leavesOn(d) {
    const next = addDays(d, 1);
    return leaves.filter(function (r) {
      const ts = parseDate(r.date);
      return ts && ts >= d.getTime() && ts < next.getTime();
    });
  }

  function eventsOn(d) {
    const next = addDays(d, 1);
    return events.filter(function (r) {
      const ts = parseDate(r.start);
      return ts && ts >= d.getTime() && ts < next.getTime();
    });
  }

  return {
    today: {
      leaves: leavesOn(today),
      events: eventsOn(today),
      shoppingOpenCount: shopping.filter(function (r) { return r.status !== 'done'; }).length,
    },
    tomorrow: {
      leaves: leavesOn(tomorrow),
      events: eventsOn(tomorrow),
    },
    dayAfter: dayAfter.toISOString(),
  };
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(String(v));
  return isNaN(t) ? null : t;
}
