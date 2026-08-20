// GET /api/search-points?q={term}&projectId={optional}
// Manual entry fallback for when scanning isn't practical — searches by
// point number (and optionally scoped to a project).

const { getSupabaseClient, jsonResponse, CORS_HEADERS } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed. Use GET.' });
  }

  const params = event.queryStringParameters || {};
  const q = (params.q || '').trim();
  const projectId = (params.projectId || '').trim();

  if (!q) {
    return jsonResponse(400, { error: 'Missing q query parameter.' });
  }

  const supabase = getSupabaseClient();
  let query = supabase
    .from('points')
    .select('id, project_id, point_number, created_at')
    .ilike('point_number', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(25);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error) {
    return jsonResponse(500, { error: `Supabase query failed: ${error.message}` });
  }

  return jsonResponse(200, { results: data });
};
