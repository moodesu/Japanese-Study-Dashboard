const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff'
  },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, {error: 'Method not allowed.'});

  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || '';
  const waniKaniToken = process.env.WANIKANI_API_TOKEN || '';
  const allowedUserId = process.env.ALLOWED_USER_ID || '';
  if (!supabaseUrl || !supabaseKey || !waniKaniToken || !allowedUserId) {
    return json(503, {error: 'Private WaniKani service is not configured.'});
  }

  const authorization = event.headers.authorization || event.headers.Authorization || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) return json(401, {error: 'Authentication required.'});

  try {
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {apikey: supabaseKey, Authorization: authorization}
    });
    if (!authResponse.ok) return json(401, {error: 'Invalid or expired session.'});
    const user = await authResponse.json();
    if (!user?.id || user.id !== allowedUserId) return json(403, {error: 'This account is not authorised.'});

    const query = event.queryStringParameters || {};
    const endpoint = query.endpoint;
    if (!['user', 'summary', 'assignments'].includes(endpoint)) return json(400, {error: 'Unsupported request.'});

    const upstream = new URL(`https://api.wanikani.com/v2/${endpoint}`);
    if (endpoint === 'assignments' && query.page_after_id) {
      if (!/^\d+$/.test(query.page_after_id)) return json(400, {error: 'Invalid page cursor.'});
      upstream.searchParams.set('page_after_id', query.page_after_id);
    }

    const response = await fetch(upstream, {
      headers: {
        Authorization: `Bearer ${waniKaniToken}`,
        'Wanikani-Revision': '20170710',
        Accept: 'application/json'
      }
    });
    const body = await response.text();
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      },
      body
    };
  } catch (error) {
    return json(502, {error: 'The private WaniKani service is temporarily unavailable.'});
  }
};
