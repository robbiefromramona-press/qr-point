// POST /api/process-csv
// Body: { csvText: "...", projectId: "PROJ123" }
//
// Parses a Trimble point-export CSV (whatever columns it happens to have —
// no fixed schema), writes one row per point to Supabase, and returns a
// manifest of { id, pointNumber } so the frontend can generate QR codes.

const { parse } = require('csv-parse/sync');
const { getSupabaseClient, jsonResponse, CORS_HEADERS } = require('./_supabase');

// Column names commonly used for the point number across Trimble export
// templates. We check these (case-insensitively) in order and fall back to
// the first column if none match — better than crashing on an unfamiliar
// template.
const POINT_NUMBER_ALIASES = [
  'point number',
  'point_number',
  'pointnumber',
  'point',
  'pt',
  'pt#',
  'pt no',
  'name',
  'id',
];

function slugify(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pt';
}

function findPointNumberKey(row) {
  const keys = Object.keys(row);
  const lowerMap = new Map(keys.map((k) => [k.toLowerCase().trim(), k]));
  for (const alias of POINT_NUMBER_ALIASES) {
    if (lowerMap.has(alias)) return lowerMap.get(alias);
  }
  return keys[0]; // fall back to first column
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed. Use POST.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }

  const { csvText, projectId } = payload;

  if (!csvText || typeof csvText !== 'string') {
    return jsonResponse(400, { error: 'Missing csvText (string) in request body.' });
  }
  if (!projectId || typeof projectId !== 'string') {
    return jsonResponse(400, { error: 'Missing projectId (string) in request body.' });
  }

  let records;
  try {
    records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  } catch (err) {
    return jsonResponse(400, { error: `Could not parse CSV: ${err.message}` });
  }

  if (!records.length) {
    return jsonResponse(400, { error: 'CSV has no data rows.' });
  }

  const projectSlug = slugify(projectId);
  const seenIds = new Set();
  const rowsToInsert = records.map((row, idx) => {
    const pointNumberKey = findPointNumberKey(row);
    const pointNumber = String(row[pointNumberKey] ?? `row-${idx + 1}`).trim();
    let id = `${projectSlug}-${slugify(pointNumber)}`;
    // Guard against duplicate point numbers within the same project.
    if (seenIds.has(id)) id = `${id}-${idx + 1}`;
    seenIds.add(id);

    return {
      id,
      project_id: projectId,
      point_number: pointNumber,
      raw_data: row,
    };
  });

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('points')
    .upsert(rowsToInsert, { onConflict: 'id' })
    .select('id, point_number');

  if (error) {
    return jsonResponse(500, { error: `Supabase insert failed: ${error.message}` });
  }

  return jsonResponse(200, {
    projectId,
    count: data.length,
    manifest: data.map((r) => ({ id: r.id, pointNumber: r.point_number })),
  });
};
