// Yandex Cloud Function (Node.js 18+) — API реакций поверх YDB.
// Переменные окружения: YDB_ENDPOINT (grpcs://ydb.serverless.yandexcloud.net:2135), YDB_DATABASE (/ru-central1/b1g.../etn...)
// Таблица: reactions (track_id Utf8, client_id Utf8, type Utf8, PRIMARY KEY (track_id, client_id))
// GET  /?client=UUID            -> { counts: {trackId:{fire,tree,snow}}, mine: {trackId:type} }
// POST /  {id, type, client}    -> { mine, counts } (повтор того же type снимает реакцию)
const { Driver, MetadataAuthService, TypedValues } = require('ydb-sdk');

const TYPES = ['fire', 'tree', 'snow'];
const H = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
let driver;

async function getDriver() {
  if (driver) return driver;
  let endpoint = (process.env.YDB_ENDPOINT || '').trim(), database = (process.env.YDB_DATABASE || '').trim();
  const m = endpoint.match(/^(.*?)\/?\?database=(.*)$/); // допускаем полную строку из консоли
  if (m) { endpoint = m[1]; if (!database) database = m[2]; }
  driver = new Driver({ endpoint, database,
    authService: new MetadataAuthService() });
  if (!await driver.ready(10000)) throw new Error('YDB not ready');
  return driver;
}
const res = (code, body) => ({ statusCode: code, headers: H, body: JSON.stringify(body) });
const P = v => TypedValues.utf8(v);
const ok = (s, max) => typeof s === 'string' && s.length > 0 && s.length <= max && /^[\w-]+$/.test(s);

async function counts(session, id) {
  const where = id ? 'WHERE track_id = $id' : '';
  const q = `${id ? 'DECLARE $id AS Utf8;' : ''}
    SELECT track_id, type, COUNT(*) AS c FROM reactions ${where} GROUP BY track_id, type;`;
  const { resultSets } = await session.executeQuery(q, id ? { $id: P(id) } : {});
  const out = {};
  for (const r of resultSets[0].rows) {
    const t = r.items[0].textValue, ty = r.items[1].textValue, c = Number(String(r.items[2].uint64Value));
    (out[t] = out[t] || {})[ty] = c;
  }
  return out;
}


module.exports.handler = async (event) => {
  const method = event.httpMethod;
  if (method === 'OPTIONS') return res(204, {});
  try {
    const d = await getDriver();
    if (method === 'GET') {
      const client = (event.queryStringParameters || {}).client;
      return await d.tableClient.withSession(async s => {
        const all = await counts(s);
        let mine = {};
        if (ok(client, 64)) {
          const { resultSets } = await s.executeQuery(
            'DECLARE $c AS Utf8; SELECT track_id, type FROM reactions WHERE client_id = $c;', { $c: P(client) });
          for (const r of resultSets[0].rows) mine[r.items[0].textValue] = r.items[1].textValue;
        }
        return res(200, { counts: all, mine });
      });
    }
    if (method === 'POST') {
      const b = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body || '{}');
      if (!ok(b.id, 64) || !ok(b.client, 64) || !TYPES.includes(b.type)) return res(400, { error: 'bad request' });
      return await d.tableClient.withSession(async s => {
        const p = { $id: P(b.id), $c: P(b.client), $t: P(b.type) };
        const decl = 'DECLARE $id AS Utf8; DECLARE $c AS Utf8; DECLARE $t AS Utf8;';
        const { resultSets } = await s.executeQuery(
          'DECLARE $id AS Utf8; DECLARE $c AS Utf8; SELECT type FROM reactions WHERE track_id=$id AND client_id=$c;', { $id: p.$id, $c: p.$c });
        const prev = resultSets[0].rows[0] && resultSets[0].rows[0].items[0].textValue;
        let mine;
        if (prev === b.type) {
          await s.executeQuery(`${decl} DELETE FROM reactions WHERE track_id=$id AND client_id=$c;`, p);
        } else {
          await s.executeQuery(`${decl} UPSERT INTO reactions (track_id, client_id, type) VALUES ($id,$c,$t);`, p);
          mine = b.type;
        }
        const all = await counts(s, b.id);
        return res(200, { mine, counts: all[b.id] || {} });
      });
    }
    return res(405, { error: 'method not allowed' });
  } catch (e) {
    console.error(e);
    return res(500, { error: 'server error', detail: String(e && e.message || e) });
  }
};



