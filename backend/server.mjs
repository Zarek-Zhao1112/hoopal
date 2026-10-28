import { networkInterfaces } from 'node:os';
import { createAppServer } from './app.mjs';

const port = Number(process.env.PORT || 4173);
createAppServer().listen(port, '0.0.0.0', () => {
  console.log(`电脑打开: http://localhost:${port}`);
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) console.log(`手机同一 Wi-Fi 打开: http://${address.address}:${port}`);
    }
  }
  console.log('按 Ctrl+C 停止服务。');
});
