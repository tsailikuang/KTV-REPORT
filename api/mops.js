// Vercel Serverless Function：MOPS XBRL 代理（解決瀏覽器 CORS）
// 部署：與 index.html 放同一個專案，路徑 /api/mops?year=2026&file=tifrs-fr1-m1-ci-cr-9943-2026Q2.html
module.exports = async (req, res) => {
  const { year, file } = req.query || {};
  // 白名單驗證：只允許三家公司的 XBRL 檔名，避免被當成開放代理
  const okYear = /^\d{4}$/.test(year || '');
  const okFile = /^tifrs-fr1-m[12]-ci-(cr|ir)-(9943|7760|8359)-\d{4}Q[1-4]\.html$/.test(file || '');
  if (!okYear || !okFile) return res.status(400).send('bad request');

  const url = `https://mopsov.twse.com.tw/server-java/t164sb01?step=3&SYEAR=${year}&file_name=${file}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' } });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(r.status).send(buf);
  } catch (e) {
    return res.status(502).send('upstream error');
  }
};
