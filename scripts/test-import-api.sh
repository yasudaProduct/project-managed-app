#!/bin/bash

# インポートAPI テストスクリプト
# 使用方法: ./scripts/test-import-api.sh [geppo|wbs] [base_url]

set -e

# デフォルト値
API_TYPE="${1:-geppo}"
BASE_URL="${2:-http://localhost:3000}"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ヘルパー関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# HTTP リクエスト関数
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local expected_status="${4:-200}"
    
    log_info "Making $method request to $url"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" \
            -H "Content-Type: application/json" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" \
            -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    fi
    
    # レスポンスとステータスコードを分離
    body=$(echo "$response" | sed '$d')
    status_code=$(echo "$response" | tail -n1)
    
    echo "Response Body: $body"
    echo "Status Code: $status_code"
    
    # ステータスコードのチェック
    if [ "$status_code" != "$expected_status" ]; then
        log_error "Expected status $expected_status but got $status_code"
        return 1
    fi
    
    # レスポンスの基本構造チェック
    if ! echo "$body" | jq -e '.success' > /dev/null 2>&1; then
        log_error "Response does not have 'success' field or is not valid JSON"
        return 1
    fi
    
    return 0
}

# Geppoインポートテスト
test_geppo_import() {
    log_info "Testing Geppo Import API"
    
    # 現在の月を取得
    current_month=$(date +%Y-%m)
    
    echo "=== Test 1: Get Available Projects ==="
    if make_request "GET" "${BASE_URL}/api/import/geppo?targetMonth=${current_month}"; then
        log_success "Project list retrieval test passed"
    else
        log_error "Project list retrieval test failed"
    fi
    
    echo -e "\n=== Test 2: Dry Run Import ==="
    payload='{
        "targetMonth": "'$current_month'",
        "updateMode": "replace",
        "dryRun": true,
        "skipValidation": true
    }'
    
    if make_request "POST" "${BASE_URL}/api/import/geppo" "$payload"; then
        log_success "Dry run import test passed"
    else
        log_error "Dry run import test failed"
    fi
    
    echo -e "\n=== Test 3: Validation Error Test ==="
    invalid_payload='{
        "targetMonth": "invalid-month",
        "updateMode": "replace"
    }'
    
    if make_request "POST" "${BASE_URL}/api/import/geppo" "$invalid_payload" "400"; then
        log_success "Validation error test passed"
    else
        log_error "Validation error test failed"
    fi
    
}

# WBSインポートテスト  
test_wbs_import() {
    log_info "Testing WBS Import API"
    
    # テスト用のWBS IDを指定（実際の環境に合わせて変更）
    test_wbs_id=1
    
    echo "=== Test 1: Get WBS Sync Preview ==="
    if make_request "GET" "${BASE_URL}/api/import/wbs?wbsId=${test_wbs_id}"; then
        log_success "WBS sync preview test passed"
    else
        log_warning "WBS sync preview test failed (WBS ID $test_wbs_id may not exist)"
    fi
    
    echo -e "\n=== Test 2: WBS Sync Execution (Skip Validation) ==="
    payload='{
        "wbsId": '$test_wbs_id',
        "syncMode": "replace",
        "skipValidation": true
    }'
    
    # 注意：実際のデータが変更される可能性があるため、テスト環境のみで実行
    log_warning "Skipping actual sync execution in test mode"
    log_info "Payload that would be sent: $payload"
    
    echo -e "\n=== Test 3: Invalid WBS ID Test ==="
    invalid_payload='{
        "wbsId": 999999,
        "syncMode": "replace"
    }'
    
    if make_request "POST" "${BASE_URL}/api/import/wbs" "$invalid_payload" "404"; then
        log_success "Invalid WBS ID test passed"
    else
        log_error "Invalid WBS ID test failed"
    fi
    
    echo -e "\n=== Test 4: Missing Parameter Test ==="
    missing_payload='{
        "syncMode": "replace"
    }'
    
    if make_request "POST" "${BASE_URL}/api/import/wbs" "$missing_payload" "400"; then
        log_success "Missing parameter test passed"
    else
        log_error "Missing parameter test failed"
    fi
}


# メイン実行部分
main() {
    echo "=========================================="
    echo "インポートAPI テストスイート"
    echo "=========================================="
    echo "API Type: $API_TYPE"
    echo "Base URL: $BASE_URL"
    echo "=========================================="
    
    # jq コマンドの確認
    if ! command -v jq &> /dev/null; then
        log_error "jq command not found. Please install jq to run this script."
        exit 1
    fi
    
    # curl コマンドの確認
    if ! command -v curl &> /dev/null; then
        log_error "curl command not found. Please install curl to run this script."
        exit 1
    fi
    
    case "$API_TYPE" in
        "geppo")
            test_geppo_import
            ;;
        "wbs")
            test_wbs_import
            ;;
        "all")
            test_geppo_import
            echo -e "\n=========================================="
            test_wbs_import
            ;;
        *)
            log_error "Invalid API type: $API_TYPE"
            echo "Usage: $0 [geppo|wbs|all] [base_url]"
            exit 1
            ;;
    esac
    
    echo -e "\n=========================================="
    log_success "Test suite completed"
    echo "=========================================="
}

# スクリプトが直接実行された場合のみmainを実行
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi