#!/bin/bash
#
# Complete Interface Test Suite for Hydroponic Test Simulation
#
# Tests all web interfaces and API endpoints to verify the system is working correctly.
# Includes tests for:
# - Welcome page
# - Dashboard
# - API documentation
# - Sensor endpoints
# - Actuator endpoints
# - Simulation control
# - Configuration management
#
# Usage: ./scripts/test-interface.sh [base_url]
# Example: ./scripts/test-interface.sh http://localhost:3000
#

set -e

# Configuration
BASE_URL="${1:-http://localhost:3000}"
PORT="${2:-3000}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_TOTAL=0

# Helper functions
print_header() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_result() {
    local test_name="$1"
    local passed="$2"
    local details="$3"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    if [ "$passed" = true ]; then
        echo -e "  ${GREEN}✓ PASS${NC} - $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "  ${RED}✗ FAIL${NC} - $test_name"
    fi
    
    if [ -n "$details" ]; then
        echo -e "         ${YELLOW}$details${NC}"
    fi
}

# Test functions
test_connectivity() {
    print_header "🔌 Connectivity Test"
    
    if curl -s "$BASE_URL" > /dev/null 2>&1; then
        print_result "Server Connection" true "Status: 200"
        return 0
    else
        print_result "Server Connection" false "Error: Cannot connect to $BASE_URL"
        echo ""
        echo -e "${RED}⚠️  Server is not running. Start it with: npm start${NC}"
        return 1
    fi
}

test_welcome_page() {
    print_header "🏠 Welcome Page"
    
    response=$(curl -s "$BASE_URL/")
    
    if echo "$response" | grep -q "Hydroponic Test Simulation"; then
        print_result "Welcome Page Load" true "Status: 200"
    else
        print_result "Welcome Page Load" false "Page not found"
        return 1
    fi
    
    if echo "$response" | grep -q "dashboard\|api-docs"; then
        print_result "Navigation Links" true
    else
        print_result "Navigation Links" false
        return 1
    fi
}

test_dashboard() {
    print_header "📊 Dashboard"
    
    response=$(curl -s "$BASE_URL/dashboard")
    
    if echo "$response" | grep -q "Hydroponic System Monitor"; then
        print_result "Dashboard Load" true "Status: 200"
    else
        print_result "Dashboard Load" false "Dashboard not found"
        return 1
    fi
    
    if echo "$response" | grep -q "phValue\|ecValue\|tempValue\|waterValue"; then
        print_result "Sensor Displays" true
    else
        print_result "Sensor Displays" false
        return 1
    fi
    
    if echo "$response" | grep -q "toggleActuator\|startSimulation"; then
        print_result "Control Functions" true
    else
        print_result "Control Functions" false
        return 1
    fi
}

test_api_docs() {
    print_header "📚 API Documentation"
    
    response=$(curl -s "$BASE_URL/api-docs")
    
    if echo "$response" | grep -q "swagger"; then
        print_result "Swagger UI Load" true "Status: 200"
    else
        print_result "Swagger UI Load" false "Swagger UI not found"
        return 1
    fi
}

test_sensors_api() {
    print_header "📡 Sensors API"
    
    response=$(curl -s "$BASE_URL/api/sensors")
    
    if echo "$response" | grep -q '"success":true'; then
        sensor_count=$(echo "$response" | grep -o '"id"' | wc -l)
        print_result "List Sensors" true "Found: $sensor_count sensors"
        
        echo "    Sensors:"
        echo "$response" | grep -o '"id":"[^"]*"' | sed 's/"id":"\([^"]*\)"/      • \1/' | head -5
    else
        print_result "List Sensors" false
        return 1
    fi
    
    # Test individual sensor
    sensor_id=$(echo "$response" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
    if [ -n "$sensor_id" ]; then
        sensor_response=$(curl -s "$BASE_URL/api/sensors/$sensor_id")
        if echo "$sensor_response" | grep -q '"success":true'; then
            value=$(echo "$sensor_response" | grep -o '"value":[0-9.]*' | head -1 | sed 's/"value":\([0-9.]*\)/\1/')
            print_result "Get Sensor Value" true "Sensor: $sensor_id, Value: $value"
        else
            print_result "Get Sensor Value" false
            return 1
        fi
    fi
}

test_actuators_api() {
    print_header "⚙️  Actuators API"
    
    response=$(curl -s "$BASE_URL/api/actuators")
    
    if echo "$response" | grep -q '"success":true'; then
        actuator_count=$(echo "$response" | grep -o '"id"' | wc -l)
        print_result "List Actuators" true "Found: $actuator_count actuators"
        
        echo "    Actuators:"
        echo "$response" | grep -o '"id":"[^"]*"' | sed 's/"id":"\([^"]*\)"/      • \1/' | head -5
    else
        print_result "List Actuators" false
        return 1
    fi
}

test_simulation_control() {
    print_header "▶️  Simulation Control"
    
    response=$(curl -s "$BASE_URL/api/simulation/status")
    
    if echo "$response" | grep -q '"success":true'; then
        print_result "Get Status" true
        
        echo "    Status:"
        running=$(echo "$response" | grep -o '"running":[^,}]*' | sed 's/"running":\([^,}]*\)/\1/')
        echo -e "      • Running: ${MAGENTA}$running${NC}"
        
        time_accel=$(echo "$response" | grep -o '"timeAcceleration":[0-9]*' | sed 's/"timeAcceleration":\([0-9]*\)/\1/')
        echo -e "      • Time Acceleration: ${MAGENTA}${time_accel}x${NC}"
        
        sim_time=$(echo "$response" | grep -o '"simulatedTime":[0-9.]*' | sed 's/"simulatedTime":\([0-9.]*\)/\1/')
        echo -e "      • Simulated Time: ${MAGENTA}${sim_time}s${NC}"
    else
        print_result "Simulation Status" false
        return 1
    fi
}

test_configuration_api() {
    print_header "⚙️  Configuration API"
    
    response=$(curl -s "$BASE_URL/api/config")
    
    if echo "$response" | grep -q '"success":true'; then
        print_result "Get Configuration" true
        
        echo "    Configuration:"
        capacity=$(echo "$response" | grep -o '"capacity":[0-9]*' | head -1 | sed 's/"capacity":\([0-9]*\)/\1/')
        echo -e "      • Reservoir Capacity: ${MAGENTA}${capacity}L${NC}"
        
        water_level=$(echo "$response" | grep -o '"initialWaterLevel":[0-9]*' | sed 's/"initialWaterLevel":\([0-9]*\)/\1/')
        echo -e "      • Initial Water Level: ${MAGENTA}${water_level}%${NC}"
    else
        print_result "Configuration API" false
        return 1
    fi
}

test_response_format() {
    print_header "📋 Response Format Validation"
    
    response=$(curl -s "$BASE_URL/api/sensors")
    
    if echo "$response" | grep -q '"success"'; then
        print_result "Has 'success' field" true
    else
        print_result "Has 'success' field" false
        return 1
    fi
    
    if echo "$response" | grep -q '"data"'; then
        print_result "Has 'data' field" true
    else
        print_result "Has 'data' field" false
        return 1
    fi
    
    if echo "$response" | grep -q '"timestamp"'; then
        print_result "Has 'timestamp' field" true
    else
        print_result "Has 'timestamp' field" false
        return 1
    fi
    
    if echo "$response" | grep -q '"simulatedTime"'; then
        print_result "Has 'simulatedTime' field" true
    else
        print_result "Has 'simulatedTime' field" false
        return 1
    fi
}

show_summary() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📊 TEST SUMMARY${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    percentage=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    echo "  Tests Passed: $TESTS_PASSED / $TESTS_TOTAL ($percentage%)"
    
    if [ $percentage -eq 100 ]; then
        echo ""
        echo -e "  ${GREEN}✅ ALL TESTS PASSED!${NC}"
    else
        echo ""
        echo -e "  ${YELLOW}⚠️  Some tests failed. Please review the output above.${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}📍 Quick Links:${NC}"
    echo -e "   🏠 Welcome Page:  ${MAGENTA}$BASE_URL${NC}"
    echo -e "   📊 Dashboard:     ${MAGENTA}$BASE_URL/dashboard${NC}"
    echo -e "   📚 API Docs:      ${MAGENTA}$BASE_URL/api-docs${NC}"
    echo ""
}

# Main execution
main() {
    echo ""
    echo -e "${CYAN}🌱 HYDROPONIC TEST SIMULATION - INTERFACE TEST SUITE${NC}"
    echo -e "${YELLOW}Version 1.0.0${NC}"
    echo ""
    
    # Check connectivity first
    if ! test_connectivity; then
        exit 1
    fi
    
    # Run all tests
    test_welcome_page || true
    test_dashboard || true
    test_api_docs || true
    test_sensors_api || true
    test_actuators_api || true
    test_simulation_control || true
    test_configuration_api || true
    test_response_format || true
    
    # Show summary
    show_summary
    
    # Exit with appropriate code
    if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main
main
