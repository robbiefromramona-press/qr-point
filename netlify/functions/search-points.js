// GET /api/search-points?q={term}&projectId={required}
// Manual entry fallback for when scanning isn't practical — searches by
// point number within one project.
//
// projectId is required. It used to be optional, which meant an
// unauthenticated caller could substring-search point numbers across every
// project anyone had ever uploaded and read back each match's project_id.

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
  if (!projectId) {
    return jsonResponse(400, {
      error: 'Missing projectId query parameter. Searches are scoped to one project.',
    });
  }

  const supabase = getSupabaseClient();
  const query = supabase
    .from('points')
    .select('id, project_id, point_number, created_at')
    .eq('project_id', projectId)
    .ilike('point_number', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(25);

  const { data, error } = await query;

  if (error) {
    return jsonResponse(500, { error: `Supabase query failed: ${error.message}` });
  }

  return jsonResponse(200, { results: data });
};
