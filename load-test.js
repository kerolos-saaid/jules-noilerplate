const autocannon = require('autocannon');

// Generate unique usernames for each request
let counter = 0;
function generateBody() {
  counter++;
  return JSON.stringify({
    username: `user${Date.now()}${counter}`,
    email: `user${Date.now()}${counter}@example.com`,
    password: 'Password123!',
  });
}

// Load test configuration
const config = {
  url: 'http://localhost:3000/api/v1/auth/register',
  connections: 10,
  duration: 100,
  pipelining: 1,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  setupClient: (client) => {
    client.setBody(generateBody());
    client.on('response', () => {
      client.setBody(generateBody());
    });
  },
};

console.log('Starting load test...');
console.log(`Target: ${config.url}`);
console.log(`Duration: ${config.duration}s`);
console.log(`Connections: ${config.connections}\n`);

autocannon(config, (err, result) => {
  if (err) {
    console.error('Load test failed:', err);
    process.exit(1);
  }

  console.log('\n=== Load Test Results ===');
  console.log(`Requests: ${result.requests.total || 0}`);
  console.log(`Duration: ${result.duration || 0}s`);
  console.log(`Throughput: ${result.throughput?.mean || 0} req/s`);
  console.log(`Latency (avg): ${result.latency?.mean || 0}ms`);
  console.log(`Latency (p95): ${result.latency?.p95 || 0}ms`);
  console.log(`Latency (p99): ${result.latency?.p99 || 0}ms`);
  console.log(`Errors: ${result.errors || 0}`);
  console.log(`Timeouts: ${result.timeouts || 0}`);
  console.log(`2xx responses: ${result['2xx'] || 0}`);
  console.log(`4xx responses: ${result['4xx'] || 0}`);
  console.log(`5xx responses: ${result['5xx'] || 0}`);
});
