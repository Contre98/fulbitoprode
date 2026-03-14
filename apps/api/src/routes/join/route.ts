export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const invite = url.searchParams.get("invite")?.trim() || "";

  if (!invite) {
    return new Response("Link de invitación inválido.", { status: 400 });
  }

  const deepLink = `fulbito://?invite=${encodeURIComponent(invite)}`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unirse a grupo – Fulbito Prode</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #f0f0f0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      text-align: center;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 360px;
      width: 100%;
    }
    .logo { font-size: 40px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
    p { font-size: 14px; color: #888; margin-bottom: 24px; line-height: 1.5; }
    .btn {
      display: block;
      background: #22c55e;
      color: #fff;
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
      padding: 14px 24px;
      border-radius: 12px;
      margin-bottom: 12px;
    }
    .hint { font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">⚽</div>
    <h1>Te invitaron a un grupo</h1>
    <p>Abrí la app de Fulbito Prode para unirte al grupo de pronósticos.</p>
    <a class="btn" href="${deepLink}">Abrir en Fulbito Prode</a>
    <p class="hint">Si no tenés la app instalada, pedile el link al que te invitó.</p>
  </div>
  <script>
    // Auto-redirect on page load
    window.location.href = "${deepLink}";
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
