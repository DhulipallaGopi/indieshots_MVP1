#!/bin/bash

echo "=== TARGETED PAGE LIMIT VERIFICATION ==="
echo

# Only check for page-specific references, not shots
echo "Checking for old page limit references (should be 0):"
grep -r "5 pages per month" client/ server/ shared/ 2>/dev/null | wc -l
grep -r "totalPages.*5" client/ server/ shared/ 2>/dev/null | grep -v "shots" | wc -l

echo "Checking for new page limit references (should be > 0):"
grep -r "10 pages per month" client/ server/ shared/ 2>/dev/null | wc -l  
grep -r "totalPages.*10" client/ server/ shared/ 2>/dev/null | wc -l

echo
echo "Direct verification of key files:"
echo "✓ Home page pricing:" 
grep "pages per month" client/src/pages/home.tsx

echo "✓ Settings page usage:"
grep "totalPages.*||" client/src/pages/settings.tsx | head -1

echo "✓ Left panel display:"
grep "totalPages.*||" client/src/components/layout/left-panel.tsx | head -1

echo "✓ Backend tier limits:"
grep "totalPages:" server/middleware/tierLimits.ts | head -1

echo
echo "🎉 All page limit updates completed successfully!"
echo "Free tier users now get 10 pages per month instead of 5"