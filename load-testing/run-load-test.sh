
#!/bin/bash

echo "🚀 Starting IndieShots Load Testing Suite"
echo "=========================================="

# Change to load-testing directory
cd "$(dirname "$0")"

# Install Artillery if not present
if ! command -v artillery &> /dev/null; then
    echo "📦 Installing Artillery..."
    npm install -g artillery
fi

# Create results directory
mkdir -p results

# Get current timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🎯 Target: https://indieshots.replit.app"
echo "📊 Test scenarios:"
echo "   • Authentication flows (30%)"
echo "   • Dashboard navigation (25%)"
echo "   • API health checks (20%)"
echo "   • Static assets (15%)"
echo "   • Upload simulation (10%)"
echo ""

# Check if config file exists
if [ ! -f "artillery-config.yml" ]; then
    echo "❌ Error: artillery-config.yml not found!"
    echo "📂 Current directory: $(pwd)"
    echo "📋 Files available: $(ls -la)"
    exit 1
fi

# Run the load test
echo "▶️  Starting load test..."
artillery run artillery-config.yml \
  --output "results/load-test-${TIMESTAMP}.json"

# Check if results file was created
if [ -f "results/load-test-${TIMESTAMP}.json" ]; then
    # Generate HTML report
    echo "📈 Generating HTML report..."
    artillery report "results/load-test-${TIMESTAMP}.json" \
      --output "results/load-test-report-${TIMESTAMP}.html"
else
    echo "❌ No results file generated - test may have failed"
    echo "📂 Checking results directory:"
    ls -la results/ 2>/dev/null || echo "No results directory found"
fi

echo ""
echo "✅ Load test completed!"
echo "📄 Results saved to: results/load-test-${TIMESTAMP}.json"
echo "📊 HTML report: results/load-test-report-${TIMESTAMP}.html"
echo ""
echo "🔍 Quick analysis:"
echo "   • Check response times under load"
echo "   • Monitor error rates (should be <1%)"
echo "   • Verify autoscaling behavior"
echo "   • Watch for memory/database bottlenecks"
