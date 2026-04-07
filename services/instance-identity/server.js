/**
 * Standalone HTTP service exposing process identity for routing, observability,
 * and load-balancer verification.
 *
 * - SERVICE_NAME: logical name in JSON/logs (set per deployment unit in env).
 * - INSTANCE_ID: unique replica; set in orchestration (e.g. pod name) or defaults to hostname.
 */
const http = require('http');
const os = require('os');

const port = Number(process.env.PORT || 3000);
const serviceName = process.env.SERVICE_NAME || 'instance-identity';
const instanceId = process.env.INSTANCE_ID || os.hostname();

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify(
        {
          service: serviceName,
          instanceId,
          hostname: os.hostname(),
          pid: process.pid,
        },
        null,
        2,
      ),
    );
    return;
  }

  res.statusCode = 404;
  res.end();
});

server.listen(port, '0.0.0.0', () => {
  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'listening',
      service: serviceName,
      address: `0.0.0.0:${port}`,
      instanceId,
    }),
  );
});
