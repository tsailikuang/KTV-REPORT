// MOPS XBRL 代理（Vercel Serverless Function / 本機 server.js 共用）
// 用法：/api/mops?year=2026&file=tifrs-fr1-m1-ci-cr-9943-2026Q2.html
// 回應：200=XBRL HTML；400=參數不合法；404 'NOFILE|…'=MOPS 無此檔或被擋；502='UPSTREAM_…'=連不上 MOPS
module.exports = async (req, res) => {
  const { year, file } = req.query || {};
  // 白名單：只允許三家公司的 XBRL 檔名，避免被當成開放代理
  const okYear = /^\d{4}$/.test(year || '');
  const okFile = /^tifrs-fr1-m[12]-ci-(cr|ir)-(9943|7760|8359)-\d{4}Q[1-4]\.html$/.test(file || '');
  if (!okYear || !okFile) return res.status(400).send('BAD_REQUEST');

  const url = `https://mopsov.twse.com.tw/server-java/t164sb01?step=3&SYEAR=${year}&file_name=${file}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20000);
  try {
    const r = await fetch(url, {
      signal: ac.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'zh-TW,zh;q=0.9',
        'Referer': 'https://mopsov.twse.com.tw/',
      },
    });
    const buf = Buffer.from(await r.arrayBuffer());
    if (!r.ok) return res.status(502).send(`UPSTREAM_HTTP_${r.status}`);
    if (!/ix:nonFraction/i.test(buf.toString('latin1'))) {
      const snippet = buf.toString('utf8').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
      return res.status(404).send('NOFILE|' + snippet);
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(buf);
  } catch (e) {
    const code = (e && e.cause && e.cause.code) || (e && e.name) || 'ERR';
    return res.status(502).send(`UPSTREAM_FETCH_FAILED: ${code}`);
  } finally {
    clearTimeout(timer);
  }
};
