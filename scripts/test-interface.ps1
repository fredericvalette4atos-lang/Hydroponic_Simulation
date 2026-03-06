#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Complete Interface Test Suite for Hydroponic Test Simulation
    
.DESCRIPTION
    Tests all web interfaces and API endpoints to verify the system is working correctly.
    
.EXAMPLE
    .\scripts\test-interface.ps1
#>

param(
    [string]$BaseUrl = "http://localhost:3000"
)

# Color codes
$Colors = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Highlight = "Magenta"
}

function Write-TestHeader {
    param([string]$Title)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Colors.Info
    Write-Host $Title -ForegroundColor $Colors.Info
    Write-Host "========================================" -ForegroundColor $Colors.Info
}

function Write-TestResult {
    param(
        [string]$TestName,
        [bool]$Passed,
        [string]$Details = ""
    )
    
    $status = if ($Passed) { "[PASS]" } else { "[FAIL]" }
    $color = if ($Passed) { $Colors.Success } else { $Colors.Error }
    
    Write-Host "  $status - $TestName" -ForegroundColor $color
    if ($Details) {
        Write-Host "         $Details" -ForegroundColor $Colors.Warning
    }
}

function Test-Connectivity {
    Write-TestHeader "Connectivity Test"
    
    try {
        $response = Invoke-WebRequest $BaseUrl -UseBasicParsing -ErrorAction Stop
        Write-TestResult "Server Connection" $true "Status: $($response.StatusCode)"
        return $true
    } catch {
        Write-TestResult "Server Connection" $false "Error: $_"
        Write-Host ""
        Write-Host "Server is not running. Start it with: npm start" -ForegroundColor $Colors.Error
        return $false
    }
}

function Test-WelcomePage {
    Write-TestHeader "Welcome Page"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/" -UseBasicParsing -ErrorAction Stop
        $passed = $response.StatusCode -eq 200
        Write-TestResult "Welcome Page Load" $passed "Status: $($response.StatusCode)"
        
        $hasTitle = $response.Content -match "Hydroponic Test Simulation"
        Write-TestResult "Page Title" $hasTitle
        
        $hasLinks = $response.Content -match "dashboard|api-docs"
        Write-TestResult "Navigation Links" $hasLinks
        
        return $passed -and $hasTitle -and $hasLinks
    } catch {
        Write-TestResult "Welcome Page Load" $false "Error: $_"
        return $false
    }
}

function Test-Dashboard {
    Write-TestHeader "Dashboard"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/dashboard" -UseBasicParsing -ErrorAction Stop
        $passed = $response.StatusCode -eq 200
        Write-TestResult "Dashboard Load" $passed "Status: $($response.StatusCode)"
        
        $hasTitle = $response.Content -match "Hydroponic System Monitor"
        Write-TestResult "Dashboard Title" $hasTitle
        
        $hasSensors = $response.Content -match "phValue|ecValue|tempValue|waterValue"
        Write-TestResult "Sensor Displays" $hasSensors
        
        $hasControls = $response.Content -match "toggleActuator|startSimulation"
        Write-TestResult "Control Functions" $hasControls
        
        return $passed -and $hasTitle -and $hasSensors -and $hasControls
    } catch {
        Write-TestResult "Dashboard Load" $false "Error: $_"
        return $false
    }
}

function Test-ApiDocs {
    Write-TestHeader "API Documentation"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/api-docs" -UseBasicParsing -ErrorAction Stop
        $passed = $response.StatusCode -eq 200
        Write-TestResult "Swagger UI Load" $passed "Status: $($response.StatusCode)"
        
        $hasSwagger = $response.Content -match "swagger"
        Write-TestResult "Swagger Content" $hasSwagger
        
        return $passed -and $hasSwagger
    } catch {
        Write-TestResult "Swagger UI Load" $false "Error: $_"
        return $false
    }
}

function Test-SensorsApi {
    Write-TestHeader "Sensors API"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/api/sensors" -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
        $passed = $response.success -eq $true
        Write-TestResult "List Sensors" $passed "Found: $($response.data.Count) sensors"
        
        if ($response.data.Count -gt 0) {
            Write-Host "    Sensors:" -ForegroundColor $Colors.Info
            $response.data | ForEach-Object {
                Write-Host "      * $($_.id) - $($_.type) [$($_.unit)]" -ForegroundColor $Colors.Highlight
            }
        }
        
        $sensorTest = $false
        if ($response.data.Count -gt 0) {
            $sensorId = $response.data[0].id
            $sensorResponse = Invoke-WebRequest "$BaseUrl/api/sensors/$sensorId" -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
            $sensorTest = $sensorResponse.success -eq $true
            Write-TestResult "Get Sensor Value" $sensorTest "Sensor: $sensorId, Value: $($sensorResponse.data.value)"
        }
        
        return $passed -and $sensorTest
    } catch {
        Write-TestResult "Sensors API" $false "Error: $_"
        return $false
    }
}

function Test-ActuatorsApi {
    Write-TestHeader "Actuators API"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/api/actuators" -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
        $passed = $response.success -eq $true
        Write-TestResult "List Actuators" $passed "Found: $($response.data.Count) actuators"
        
        if ($response.data.Count -gt 0) {
            Write-Host "    Actuators:" -ForegroundColor $Colors.Info
            $response.data | ForEach-Object {
                Write-Host "      * $($_.id) - $($_.type)" -ForegroundColor $Colors.Highlight
            }
        }
        
        return $passed
    } catch {
        Write-TestResult "Actuators API" $false "Error: $_"
        return $false
    }
}

function Test-SimulationControl {
    Write-TestHeader "Simulation Control"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/api/simulation/status" -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
        $passed = $response.success -eq $true
        Write-TestResult "Get Status" $passed
        
        if ($passed) {
            Write-Host "    Status:" -ForegroundColor $Colors.Info
            Write-Host "      * Running: $($response.data.running)" -ForegroundColor $Colors.Highlight
            Write-Host "      * Paused: $($response.data.paused)" -ForegroundColor $Colors.Highlight
            Write-Host "      * Time Acceleration: $($response.data.timeAcceleration)x" -ForegroundColor $Colors.Highlight
            Write-Host "      * Simulated Time: $([math]::Round($response.data.simulatedTime, 2))s" -ForegroundColor $Colors.Highlight
        }
        
        return $passed
    } catch {
        Write-TestResult "Simulation Status" $false "Error: $_"
        return $false
    }
}

function Test-ConfigurationApi {
    Write-TestHeader "Configuration API"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/api/config" -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
        $passed = $response.success -eq $true
        Write-TestResult "Get Configuration" $passed
        
        if ($passed) {
            Write-Host "    Configuration:" -ForegroundColor $Colors.Info
            Write-Host "      * Reservoir Capacity: $($response.data.reservoir.capacity)L" -ForegroundColor $Colors.Highlight
            Write-Host "      * Initial Water Level: $($response.data.reservoir.initialWaterLevel)%" -ForegroundColor $Colors.Highlight
            Write-Host "      * Tick Rate: $($response.data.simulation.tickRate) Hz" -ForegroundColor $Colors.Highlight
        }
        
        return $passed
    } catch {
        Write-TestResult "Configuration API" $false "Error: $_"
        return $false
    }
}

function Test-ResponseFormat {
    Write-TestHeader "Response Format Validation"
    
    try {
        $response = Invoke-WebRequest "$BaseUrl/api/sensors" -UseBasicParsing -ErrorAction Stop | ConvertFrom-Json
        
        $hasSuccess = $response | Get-Member -Name "success" -ErrorAction SilentlyContinue
        Write-TestResult "Has success field" ($null -ne $hasSuccess)
        
        $hasData = $response | Get-Member -Name "data" -ErrorAction SilentlyContinue
        Write-TestResult "Has data field" ($null -ne $hasData)
        
        $hasTimestamp = $response | Get-Member -Name "timestamp" -ErrorAction SilentlyContinue
        Write-TestResult "Has timestamp field" ($null -ne $hasTimestamp)
        
        $hasSimulatedTime = $response | Get-Member -Name "simulatedTime" -ErrorAction SilentlyContinue
        Write-TestResult "Has simulatedTime field" ($null -ne $hasSimulatedTime)
        
        return ($null -ne $hasSuccess) -and ($null -ne $hasData) -and ($null -ne $hasTimestamp) -and ($null -ne $hasSimulatedTime)
    } catch {
        Write-TestResult "Response Format" $false "Error: $_"
        return $false
    }
}

function Show-Summary {
    param([array]$Results)
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Colors.Info
    Write-Host "TEST SUMMARY" -ForegroundColor $Colors.Info
    Write-Host "========================================" -ForegroundColor $Colors.Info
    
    $passed = ($Results | Where-Object { $_ -eq $true }).Count
    $total = $Results.Count
    $percentage = [math]::Round(($passed / $total) * 100, 0)
    
    Write-Host "  Tests Passed: $passed / $total ($percentage%)" -ForegroundColor $Colors.Success
    
    if ($percentage -eq 100) {
        Write-Host ""
        Write-Host "  [SUCCESS] ALL TESTS PASSED!" -ForegroundColor $Colors.Success
    } else {
        Write-Host ""
        Write-Host "  [WARNING] Some tests failed. Please review the output above." -ForegroundColor $Colors.Warning
    }
    
    Write-Host ""
    Write-Host "Quick Links:" -ForegroundColor $Colors.Info
    Write-Host "   Welcome Page:  $BaseUrl" -ForegroundColor $Colors.Highlight
    Write-Host "   Dashboard:     $BaseUrl/dashboard" -ForegroundColor $Colors.Highlight
    Write-Host "   API Docs:      $BaseUrl/api-docs" -ForegroundColor $Colors.Highlight
    Write-Host ""
}

function Main {
    Write-Host ""
    Write-Host "HYDROPONIC TEST SIMULATION - INTERFACE TEST SUITE" -ForegroundColor $Colors.Info
    Write-Host "Version 1.0.0" -ForegroundColor $Colors.Warning
    Write-Host ""
    
    if (-not (Test-Connectivity)) {
        exit 1
    }
    
    $results = @()
    $results += Test-WelcomePage
    $results += Test-Dashboard
    $results += Test-ApiDocs
    $results += Test-SensorsApi
    $results += Test-ActuatorsApi
    $results += Test-SimulationControl
    $results += Test-ConfigurationApi
    $results += Test-ResponseFormat
    
    Show-Summary $results
    
    $allPassed = $results -notcontains $false
    if ($allPassed) { exit 0 } else { exit 1 }
}

Main
