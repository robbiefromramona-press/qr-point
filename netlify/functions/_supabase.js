// Shared Supabase client for Netlify Functions.
// Uses the SERVICE ROLE key — this file only ever runs server-side, never
// bundled to the browser, so it's safe to use the privileged key here.
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify env vars.

const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
        'Set these in Netlify (Site settings > Environment variables) — see README.md.'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

module.exports = { getSupabaseClient, CORS_HEADERS, jsonResponse };
