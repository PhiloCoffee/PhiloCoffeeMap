#!/usr/bin/env bash
# PhiloCoffeeMap — API local test script
# Run: bash scripts/test-api.sh
# Requires: dev server running at localhost:3000 (npm run dev)

BASE="http://localhost:3000/api"
PASS=0
FAIL=0
CREATED_ID=""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✓ $1${NC}"; ((PASS++)); }
fail() { echo -e "${RED}  ✗ $1${NC}"; ((FAIL++)); }
info() { echo -e "${YELLOW}► $1${NC}"; }

# ── Helper: check HTTP status ────────────────────────────────
check_status() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then ok "$label (HTTP $actual)"
  else fail "$label — expected HTTP $expected, got HTTP $actual"; fi
}

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║    PhiloCoffeeMap  API Test Suite            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. GET all spots (empty is fine) ────────────────────────
info "1. GET /api/spots"
RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/spots")
check_status "GET all spots" "200" "$RES"

# ── 2. POST — create a test spot ────────────────────────────
info "2. POST /api/spots (create test spot)"
BODY='{
  "name": "Test Café φ",
  "address": "123 Philosophy St",
  "lat": 25.0478,
  "lng": 121.5318,
  "notes": "**Great espresso.** A place for deep thought.",
  "philosophy_quote": "The unexamined coffee is not worth drinking.",
  "vibe": "contemplative",
  "rating": 5,
  "tags": ["wifi", "quiet", "espresso"]
}'
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE/spots" \
  -H "Content-Type: application/json" \
  -d "$BODY")
STATUS=$(echo "$RESPONSE" | tail -1)
JSON=$(echo "$RESPONSE" | head -n -1)
check_status "POST new spot" "201" "$STATUS"

# Extract ID for subsequent tests
CREATED_ID=$(echo "$JSON" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
if [ -n "$CREATED_ID" ]; then
  ok "Got spot ID: $CREATED_ID"
else
  fail "Could not parse spot ID from response: $JSON"
fi

# ── 3. GET single spot ───────────────────────────────────────
if [ -n "$CREATED_ID" ]; then
  info "3. GET /api/spots/$CREATED_ID"
  RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/spots/$CREATED_ID")
  check_status "GET spot by ID" "200" "$RES"
fi

# ── 4. PUT — update the spot ────────────────────────────────
if [ -n "$CREATED_ID" ]; then
  info "4. PUT /api/spots/$CREATED_ID (update rating)"
  RES=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/spots/$CREATED_ID" \
    -H "Content-Type: application/json" \
    -d '{"rating": 4, "notes": "Updated notes via test script."}')
  check_status "PUT update spot" "200" "$RES"
fi

# ── 5. GET all spots again (should have 1+) ──────────────────
info "5. GET /api/spots (verify spot appears in list)"
SPOTS_JSON=$(curl -s "$BASE/spots")
COUNT=$(echo "$SPOTS_JSON" | grep -o '"id"' | wc -l | tr -d ' ')
if [ "$COUNT" -ge 1 ]; then
  ok "Spot list contains $COUNT spot(s)"
else
  fail "Spot list is empty after insert"
fi

# ── 6. DELETE the test spot ──────────────────────────────────
if [ -n "$CREATED_ID" ]; then
  info "6. DELETE /api/spots/$CREATED_ID (cleanup)"
  RES=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/spots/$CREATED_ID")
  check_status "DELETE spot" "200" "$RES"
fi

# ── 7. Verify deletion ───────────────────────────────────────
if [ -n "$CREATED_ID" ]; then
  info "7. GET /api/spots/$CREATED_ID (should be 404)"
  RES=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/spots/$CREATED_ID")
  check_status "Deleted spot returns 404" "404" "$RES"
fi

# ── Summary ─────────────────────────────────────────────────
echo ""
echo "────────────────────────────────────────────────"
echo -e "  ${GREEN}PASS: $PASS${NC}   ${RED}FAIL: $FAIL${NC}"
echo "────────────────────────────────────────────────"
echo ""

[ "$FAIL" -eq 0 ] && echo -e "${GREEN}All tests passed! ☕ φ${NC}" || echo -e "${RED}Some tests failed. Check server logs.${NC}"
echo ""
exit $FAIL
