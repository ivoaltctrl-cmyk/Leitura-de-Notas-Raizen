/// <reference types="@cloudflare/workers-types" />
// Cloudflare Pages Function — GET /api/health
export const onRequestGet: PagesFunction = async () => {
  return new Response(
    JSON.stringify({ status: 'ok', time: new Date().toISOString() }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
