
# IndieShots Load Testing Suite

This directory contains comprehensive load testing tools for the IndieShots application.

## Quick Start

1. **Install Artillery** (if not already installed):
   ```bash
   npm install -g artillery
   ```

2. **Run Basic Load Test**:
   ```bash
   cd load-testing
   chmod +x run-load-test.sh
   ./run-load-test.sh
   ```

3. **Run Performance Monitoring**:
   ```bash
   node monitor-performance.js
   ```

## Test Scenarios

### Basic Load Test (`artillery-config.yml`)
- **Warm-up**: 1 user for 30 seconds
- **Ramp-up**: 1-10 users over 60 seconds
- **Sustained**: 10 users for 120 seconds
- **Peak**: 10-50 users over 60 seconds
- **Stress**: 50-100 users for 30 seconds

### Stress Test (`stress-test.yml`)
- **Extreme**: 100-500 users over 60 seconds
- **Breaking Point**: 500-1000 users for 30 seconds

## Test Coverage

### Endpoints Tested
- **Authentication**: Login/logout flows
- **Navigation**: Home, dashboard, projects
- **API**: Health checks, user data
- **Static Assets**: Images, CSS, JavaScript
- **Upload Simulation**: File handling flows

### Metrics Monitored
- Response times (avg, min, max)
- Success rates
- Error rates by status code
- Concurrent user handling
- Database performance
- Memory usage patterns

## Expected Results for Current Infrastructure

### Replit Autoscale Deployment
- **Target**: 80 concurrent requests per instance
- **Expected scaling**: New instances added above 80 concurrent
- **Response time**: <500ms for static content, <2000ms for API calls
- **Success rate**: >99% for basic operations

### Bottlenecks to Watch
1. **OpenAI API limits**: 3,500 RPM typically
2. **Database connections**: PostgreSQL connection pool
3. **Memory usage**: File uploads and processing
4. **Instance startup time**: Cold start latency

## Running Specific Tests

### Basic Performance Check
```bash
node monitor-performance.js
```

### Standard Load Test
```bash
artillery run artillery-config.yml
```

### Stress Test
```bash
artillery run stress-test.yml
```

### Custom Target
```bash
artillery run artillery-config.yml --config config.target=https://your-domain.com
```

## Interpreting Results

### Good Performance Indicators
- Response times <1000ms for 95% of requests
- Success rate >99%
- Smooth scaling without errors
- Memory usage staying within limits

### Warning Signs
- Response times >2000ms consistently
- Error rates >1%
- 5xx errors indicating server issues
- Memory or connection pool exhaustion

### Autoscaling Verification
- Monitor instance count during peak load
- Verify new instances start under high traffic
- Check that scaling down occurs after traffic reduces

## Optimization Tips

1. **Database Optimization**
   - Add indexes for frequently queried fields
   - Implement connection pooling
   - Use read replicas for heavy read operations

2. **Caching Strategy**
   - Implement Redis for session data
   - Cache API responses where appropriate
   - Use CDN for static assets

3. **Application Performance**
   - Optimize OpenAI API usage
   - Implement request queuing for heavy operations
   - Add proper error handling and retries

## Production Monitoring

After load testing, set up continuous monitoring:
- Response time alerts
- Error rate monitoring
- Database performance tracking
- Instance scaling notifications
