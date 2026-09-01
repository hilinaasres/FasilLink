const { spawn } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'backend');
const serverCmd = 'node';
const serverArgs = ['src/server.js'];

const child = spawn(serverCmd, serverArgs, { cwd: backendDir, env: process.env });

let wsErrorCount = 0;
let notifPollCount = 0;

const wsErrorRe = /websocket|ws error|websocket connection to|socket .* error|socket message notification error|SOCKET.*error/i;
const notifReqRe = /\[REQ\].*\/api\/notifications\/mine/;

const handleData = (data) => {
  const text = String(data);
  process.stdout.write(text);
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    if (wsErrorRe.test(line)) wsErrorCount++;
    if (notifReqRe.test(line)) notifPollCount++;
  }
};

child.stdout.on('data', handleData);
child.stderr.on('data', handleData);

console.log('Collecting backend logs for 30s...');
setTimeout(() => {
  console.log('\n--- Summary after 30s ---');
  console.log('WebSocket error-like lines:', wsErrorCount);
  console.log('/api/notifications/mine requests logged:', notifPollCount);
  try { child.kill('SIGINT'); } catch (e) {}
  process.exit(0);
}, 30000);

child.on('exit', (code, sig) => {
  console.log('Backend process exited', code, sig);
});
