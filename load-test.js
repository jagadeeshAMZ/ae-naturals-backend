import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 500 },  // Ramp up to 500 users
    { duration: '1m', target: 1000 },  // Stay at 1000 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

export default function () {
  const storeId = 'cm001'; // Example store ID
  const res = http.get(`http://localhost:3001/products?storeId=${storeId}`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'transaction time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}