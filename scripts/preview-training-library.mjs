import { createAppServer } from '../backend/app.mjs';
import { fileURLToPath } from 'node:url';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const requested = Number(process.argv[2] ?? 4188);
if (!Number.isInteger(requested) || requested < 0 || requested > 65535) throw new Error('端口须为0–65535，0表示自动选择');
const server = createAppServer({ rootDirectory: workspace });
server.prependListener('request', req => { if (req.url === '/') req.url = '/frontend/previews/training-library/index.html'; });
const listen = port => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
});
try { await listen(requested); }
catch (error) { if (error.code !== 'EADDRINUSE' || requested === 0) throw error; await listen(0); }
const port = server.address().port;
const url = `http://127.0.0.1:${port}/frontend/previews/training-library/index.html`;
console.log(`球搭交互预览：${url}`);
console.log('仅内存示例；不读取正式档案。保持此窗口运行，Ctrl+C停止。');
if (process.argv[3]) {
  const report = path.resolve(process.argv[3]);
  const artifacts = path.join(workspace, 'artifacts') + path.sep;
  if (!report.startsWith(artifacts)) throw new Error('服务记录仅允许写入本项目artifacts目录');
  await mkdir(path.dirname(report), { recursive: true });
  await writeFile(report, JSON.stringify({ pid: process.pid, port, url, startedAt: new Date().toISOString(), purpose: 'User-facing local preview; separate from disposable QA servers.' }, null, 2));
}
const stop = () => { server.closeAllConnections(); server.close(() => process.exit(0)); };
process.once('SIGINT', stop); process.once('SIGTERM', stop);
