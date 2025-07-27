
import https from 'https';
import fs from 'fs';

class PerformanceMonitor {
  constructor(targetUrl = 'https://indieshots.replit.app') {
    this.targetUrl = targetUrl;
    this.results = [];
    this.startTime = Date.now();
  }

  async testEndpoint(path, method = 'GET', body = null) {
    const start = Date.now();
    
    return new Promise((resolve) => {
      const url = new URL(path, this.targetUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'User-Agent': 'Performance Monitor',
          'Accept': 'application/json'
        }
      };

      if (body && method === 'POST') {
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(body);
      }

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const duration = Date.now() - start;
          const result = {
            path,
            method,
            statusCode: res.statusCode,
            duration,
            timestamp: new Date().toISOString(),
            contentLength: data.length
          };
          
          this.results.push(result);
          resolve(result);
        });
      });

      req.on('error', (error) => {
        const duration = Date.now() - start;
        const result = {
          path,
          method,
          statusCode: 0,
          duration,
          timestamp: new Date().toISOString(),
          error: error.message
        };
        
        this.results.push(result);
        resolve(result);
      });

      if (body && method === 'POST') {
        req.write(body);
      }
      
      req.end();
    });
  }

  async runBasicTests() {
    console.log('🔍 Running basic performance tests...');
    
    const endpoints = [
      '/',
      '/health',
      '/api/health',
      '/auth',
      '/dashboard',
      '/upload'
    ];

    for (const endpoint of endpoints) {
      const result = await this.testEndpoint(endpoint);
      console.log(`${endpoint}: ${result.statusCode} (${result.duration}ms)`);
    }
  }

  async runConcurrentTests(concurrency = 10, duration = 30000) {
    console.log(`🚀 Running concurrent tests (${concurrency} concurrent users for ${duration/1000}s)...`);
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < concurrency; i++) {
      promises.push(this.runContinuousRequests(startTime + duration));
    }
    
    await Promise.all(promises);
    console.log(`✅ Concurrent test completed with ${this.results.length} requests`);
  }

  async runContinuousRequests(endTime) {
    const endpoints = ['/', '/health', '/api/health'];
    
    while (Date.now() < endTime) {
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
      await this.testEndpoint(endpoint);
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    }
  }

  generateReport() {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.statusCode >= 200 && r.statusCode < 400).length;
    const averageResponseTime = this.results.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
    const maxResponseTime = Math.max(...this.results.map(r => r.duration));
    const minResponseTime = Math.min(...this.results.map(r => r.duration));
    
    const report = {
      summary: {
        totalRequests,
        successfulRequests,
        successRate: (successfulRequests / totalRequests * 100).toFixed(2) + '%',
        averageResponseTime: averageResponseTime.toFixed(2) + 'ms',
        maxResponseTime: maxResponseTime + 'ms',
        minResponseTime: minResponseTime + 'ms',
        testDuration: (Date.now() - this.startTime) + 'ms'
      },
      statusCodes: this.getStatusCodeDistribution(),
      slowestEndpoints: this.getSlowestEndpoints(),
      results: this.results
    };

    const filename = `results/performance-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    if (!fs.existsSync('results')) {
      fs.mkdirSync('results');
    }
    
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Performance Test Report');
    console.log('==========================');
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Success Rate: ${report.summary.successRate}`);
    console.log(`Average Response Time: ${report.summary.averageResponseTime}`);
    console.log(`Max Response Time: ${report.summary.maxResponseTime}`);
    console.log(`Min Response Time: ${report.summary.minResponseTime}`);
    console.log(`\n📄 Detailed report saved to: ${filename}`);
    
    return report;
  }

  getStatusCodeDistribution() {
    const distribution = {};
    this.results.forEach(result => {
      distribution[result.statusCode] = (distribution[result.statusCode] || 0) + 1;
    });
    return distribution;
  }

  getSlowestEndpoints() {
    const endpointTimes = {};
    this.results.forEach(result => {
      if (!endpointTimes[result.path]) {
        endpointTimes[result.path] = [];
      }
      endpointTimes[result.path].push(result.duration);
    });

    return Object.entries(endpointTimes)
      .map(([path, times]) => ({
        path,
        averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        maxTime: Math.max(...times),
        requestCount: times.length
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5);
  }
}

// CLI Usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new PerformanceMonitor();
  
  async function runTests() {
    await monitor.runBasicTests();
    console.log('\n');
    await monitor.runConcurrentTests(20, 60000); // 20 concurrent users for 60 seconds
    monitor.generateReport();
  }
  
  runTests().catch(console.error);
}

export default PerformanceMonitor;
