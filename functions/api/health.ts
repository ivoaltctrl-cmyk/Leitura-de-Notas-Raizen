export const onRequestGet = async () => {
  return new Response(
    JSON.stringify({ status: 'ok', time: new Date().toISOString(), platform: 'cloudflare-pages' }),
    {
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
