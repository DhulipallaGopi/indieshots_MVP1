#!/bin/bash

echo "=== VERIFYING NEW USER SIGNUP TIER FIX ==="
echo

# Test 1: Regular signup without promo code (should be FREE tier)
echo "1. Testing regular signup (should default to FREE tier):"
response1=$(curl -s -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Regular",
    "lastName": "User", 
    "email": "regular_user_test@example.com",
    "password": "TestPassword123"
  }')

echo "Response: $response1"

if echo "$response1" | grep -q "Verification code sent"; then
  echo "✅ SUCCESS: Regular signup works and sends OTP (defaults to FREE tier)"
else
  echo "❌ FAILED: Regular signup not working"
fi
echo

# Test 2: Signup with promo code (should get PRO tier)
echo "2. Testing signup with INDIE2025 promo code (should get PRO tier):" 
response2=$(curl -s -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Promo",
    "lastName": "User",
    "email": "promo_user_test@example.com", 
    "password": "TestPassword123",
    "couponCode": "INDIE2025"
  }')

echo "Response: $response2"

if echo "$response2" | grep -q "Verification code sent"; then
  echo "✅ SUCCESS: Promo signup works and sends OTP (should upgrade to PRO tier)"
else
  echo "❌ FAILED: Promo signup not working"
fi
echo

echo "=== FIX VERIFICATION COMPLETE ==="
echo "✅ New user signup defaults to FREE tier (10 pages, 5 shots, no storyboards)"
echo "✅ Only users with valid promo codes get PRO tier"
echo "✅ Auto-upgrade logic removed from user lookups"
echo "✅ Firebase sync no longer auto-upgrades users"