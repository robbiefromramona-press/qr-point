// GET /api/get-point?id={pointID}
// Fetches a single point's full row data for the lookup page.

const { getSupabaseClient, jsonResponse, CORS_HEADERS } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed. Use GET.' });
  }

  const id = (event.queryStringParameters || {}).id;
  if (!id) {
    return jsonResponse(400, { error: 'Missing id query parameter.' });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('points')
    .select('id, project_id, point_number, raw_data, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return jsonResponse(500, { error: `Supabase query failed: ${error.message}` });
  }
  if (!data) {
    return jsonResponse(404, { error: `No point found for id "${id}".` });
  }

  return jsonResponse(200, { point: data });
};
