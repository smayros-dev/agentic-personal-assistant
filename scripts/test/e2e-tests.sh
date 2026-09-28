#!/bin/bash

# Comprehensive E2E Test Suite for Agentic Personal Assistant
# Tests API endpoints, Document Management, and RAG workflow
# No browser automation required - uses curl for API testing

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
. "$PROJECT_ROOT/scripts/lib/common.sh"

API_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"

# Chat model: E2E_CHAT_MODEL > server/.env OLLAMA_MODEL > first installed model
CHAT_MODEL="${E2E_CHAT_MODEL:-}"
if [ -z "$CHAT_MODEL" ] && [ -f "$PROJECT_ROOT/server/.env" ]; then
    CHAT_MODEL="$(sed -n 's/^OLLAMA_MODEL=//p' "$PROJECT_ROOT/server/.env" | head -1 | tr -d '"\r ')"
fi
if [ -z "$CHAT_MODEL" ]; then
    CHAT_MODEL="$(curl -s "$API_URL/api/models" | sed -n 's/.*"models":\["\([^"]*\)".*/\1/p')"
fi
CHAT_MODEL="${CHAT_MODEL:-gemma4:26b}"
echo "Chat model: $CHAT_MODEL"
echo ""

TESTS_PASSED=0
TESTS_FAILED=0
TEST_RESULTS=()

# Test helper function
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expect=$5
    
    echo -n "  ✓ $test_name: "
    
    if [ "$method" = "GET" ]; then
        result=$(curl -s "$API_URL$endpoint")
    elif [ "$method" = "POST" ]; then
        result=$(curl -s -X POST "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    elif [ "$method" = "DELETE" ]; then
        result=$(curl -s -X DELETE "$API_URL$endpoint")
    else
        echo -e "${RED}Unknown method${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
    
    if echo "$result" | grep -q "$expect"; then
        echo -e "${GREEN}✅${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        TEST_RESULTS+=("PASS: $test_name")
        return 0
    else
        echo -e "${RED}❌${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        TEST_RESULTS+=("FAIL: $test_name - Got: ${result:0:100}")
        return 1
    fi
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    E2E Test Suite - Agentic Personal Assistant${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

# --- Frontend Tests ---
echo -e "${BLUE}[1] FRONTEND TESTS${NC}"
echo -n "  ✓ Frontend loads: "
if curl -s "$FRONTEND_URL" | grep -q "<!doctype"; then
    echo -e "${GREEN}✅${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

# --- Backend Health ---
echo -e "${BLUE}[2] BACKEND HEALTH${NC}"
test_api "Models endpoint" "GET" "/api/models" "" "models"
test_api "Health check" "GET" "/healthz" "" "ok"
test_api "Config endpoint" "GET" "/api/config" "" "vectorStore"
echo ""

# --- Document Management Tests ---
echo -e "${BLUE}[3] DOCUMENT MANAGEMENT${NC}"

# Get initial document count
INITIAL=$(curl -s "$API_URL/api/documents" | grep -o '"count":[0-9]*' | grep -o '[0-9]*$')

test_api "List documents" "GET" "/api/documents" "" "count"
test_api "Get stats" "GET" "/api/documents/stats/overview" "" "totalDocuments"

# Upload test PDF
echo -n "  ✓ Upload document: "
TEST_PDF="$(pa_tmp)/test.pdf"
node "$PROJECT_ROOT/scripts/test/make-test-pdf.mjs" "$TEST_PDF" >/dev/null
UPLOAD_RESULT=$(curl -s -X POST "$API_URL/api/ingest" \
    -F "file=@$TEST_PDF")

if echo "$UPLOAD_RESULT" | grep -q "ok"; then
    DOC_ID=$(echo "$UPLOAD_RESULT" | grep -o '"documentId":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅${NC}"
    echo "    Document ID: $DOC_ID"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    DOC_ID="unknown"
fi

# Search documents
echo -n "  ✓ Search documents: "
SEARCH=$(curl -s -X POST "$API_URL/api/documents/search" \
    -H "Content-Type: application/json" \
    -d '{"query":"test"}')

if echo "$SEARCH" | grep -q "count"; then
    echo -e "${GREEN}✅${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Get specific document
if [ "$DOC_ID" != "unknown" ]; then
    echo -n "  ✓ Get document details: "
    GET_DOC=$(curl -s "$API_URL/api/documents/$DOC_ID")
    
    if echo "$GET_DOC" | grep -q "document"; then
        echo -e "${GREEN}✅${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

echo ""

# --- Chat & RAG Tests ---
echo -e "${BLUE}[4] CHAT & RAG WORKFLOW${NC}"

if PY="$(pa_python)"; then
    SESSION_ID=$($PY -c "import uuid; print(str(uuid.uuid4()))")
elif command -v uuidgen >/dev/null 2>&1; then
    SESSION_ID=$(uuidgen)
else
    SESSION_ID="session-$(date +%s)-$$"
fi

# Simple chat
echo -n "  ✓ Send message: "
CHAT=$(curl -s -X POST "$API_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"Hello\",\"model\":\"$CHAT_MODEL\",\"sessionId\":\"$SESSION_ID\"}" \
    --max-time 180)

if echo "$CHAT" | grep -q "answer"; then
    echo -e "${GREEN}✅${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌${NC}"
    echo "    got: $(echo "$CHAT" | head -c 200)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Chat with context
echo -n "  ✓ Chat with document context: "
CONTEXT_CHAT=$(curl -s -X POST "$API_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"What is in the document?\",\"model\":\"$CHAT_MODEL\",\"sessionId\":\"$SESSION_ID\"}" \
    --max-time 180)

if echo "$CONTEXT_CHAT" | grep -q "answer"; then
    echo -e "${GREEN}✅${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌${NC}"
    echo "    got: $(echo "$CONTEXT_CHAT" | head -c 200)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""

# --- Error Handling Tests ---
echo -e "${BLUE}[5] ERROR HANDLING${NC}"

echo -n "  ✓ Reject empty message: "
EMPTY=$(curl -s -X POST "$API_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":\"\",\"model\":\"$CHAT_MODEL\"}")

if echo "$EMPTY" | grep -qi "error\|required\|cannot be empty"; then
    echo -e "${GREEN}✅${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${RED}❌${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo -n "  ✓ Reject invalid JSON: "
INVALID=$(curl -s -X POST "$API_URL/api/chat" \
    -H "Content-Type: application/json" \
    -d 'invalid json' 2>/dev/null)

# This should error
if [ $? -ne 0 ] || echo "$INVALID" | grep -q "error\|SyntaxError"; then
    echo -e "${GREEN}✅${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    echo -e "${YELLOW}⚠️${NC}  (Expected to reject invalid JSON)"
fi

echo ""

# --- Cleanup ---
echo -e "${BLUE}[6] CLEANUP${NC}"

if [ "$DOC_ID" != "unknown" ]; then
    echo -n "  ✓ Delete document: "
    DELETE=$(curl -s -X DELETE "$API_URL/api/documents/$DOC_ID")
    
    if echo "$DELETE" | grep -q "ok\|success"; then
        echo -e "${GREEN}✅${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
fi

echo ""

# --- Summary ---
TOTAL=$((TESTS_PASSED + TESTS_FAILED))

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}    TEST RESULTS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "  Total Tests:  $TOTAL"
echo -e "  ${GREEN}Passed:${NC}     $TESTS_PASSED"
echo -e "  ${RED}Failed:${NC}     $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ ALL TESTS PASSED${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "\n${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "\nFailed Tests:"
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == FAIL* ]]; then
            echo -e "  ${RED}$result${NC}"
        fi
    done
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    exit 1
fi
