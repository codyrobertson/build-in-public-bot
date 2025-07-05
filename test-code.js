// Example JavaScript code for screenshot testing
function fibonacci(n) {
  if (n <= 1) return n;
  
  const dp = [0, 1];
  
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  
  return dp[n];
}

// Generate first 10 Fibonacci numbers
console.log('Fibonacci sequence:');
for (let i = 0; i < 10; i++) {
  console.log(`F(${i}) = ${fibonacci(i)}`);
}

// Performance test
const start = performance.now();
const result = fibonacci(40);
const end = performance.now();

console.log(`\nF(40) = ${result}`);
console.log(`Time: ${(end - start).toFixed(2)}ms`);