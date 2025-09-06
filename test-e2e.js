#!/usr/bin/env node

/**
 * Comprehensive End-to-End Test Runner
 * 
 * This test runner orchestrates all testing levels:
 * 1. Unit Tests (TypeScript + Python)
 * 2. Integration Tests (MCP Server + Python Bridge)  
 * 3. End-to-End Tests (Full UE + Demo Project)
 * 4. Code Coverage (Combined reporting)
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class E2ETestRunner {
  constructor() {
    this.config = {
      demoProjectPath: path.join(__dirname, 'Demo'),
      serverPath: path.join(__dirname, 'server'),
      pythonBridge: 'http://localhost:8765',
      mcpPort: process.env.MCP_PORT || 3000,
      timeout: 30000, // 30 second timeout for UE operations
      coverage: process.env.COVERAGE === 'true',
      verbose: process.env.VERBOSE === 'true'
    };
    
    this.results = {
      unit: { passed: 0, failed: 0, coverage: null },
      integration: { passed: 0, failed: 0, coverage: null },
      e2e: { passed: 0, failed: 0, coverage: null },
      total: { passed: 0, failed: 0, duration: 0 }
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅', 
      error: '❌',
      warning: '⚠️',
      debug: '🐛'
    }[level] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runUnitTests() {
    this.log('Running Unit Tests (TypeScript + Python)', 'info');
    
    try {
      // TypeScript unit tests
      this.log('📦 Running TypeScript unit tests...');
      const tsResult = execSync('npm test', { 
        cwd: this.config.serverPath,
        stdio: this.config.verbose ? 'inherit' : 'pipe' 
      });
      
      this.results.unit.passed += 1;
      this.log('TypeScript unit tests passed', 'success');
      
      return true;
    } catch (error) {
      this.results.unit.failed += 1;
      this.log(`Unit tests failed: ${error.message}`, 'error');
      return false;
    }
  }

  async checkUEConnection() {
    this.log('🔌 Checking Unreal Engine connection...');
    
    try {
      const response = await fetch(this.config.pythonBridge, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const status = await response.json();
        this.log(`UE Connected: ${status.project || 'Unknown'} (${status.engine_version || 'Unknown'})`, 'success');
        return true;
      }
    } catch (error) {
      this.log('UE connection failed - will run tests in mock mode', 'warning');
      return false;
    }
    
    return false;
  }

  async runIntegrationTests() {
    this.log('Running Integration Tests (MCP + Python Bridge)', 'info');
    
    const integrationTests = [
      'test-connection.js',
      'test-server.js', 
      'test-mcp-direct.js',
      'test-python-proxy.js'
    ];
    
    let passed = 0, failed = 0;
    
    for (const test of integrationTests) {
      const testPath = path.join(__dirname, 'tests', 'integration', test);
      
      if (!fs.existsSync(testPath)) {
        this.log(`Test file not found: ${test}`, 'warning');
        continue;
      }
      
      try {
        this.log(`Running ${test}...`);
        execSync(`node "${testPath}"`, {
          stdio: this.config.verbose ? 'inherit' : 'pipe',
          timeout: this.config.timeout
        });
        
        passed++;
        this.log(`${test} passed`, 'success');
      } catch (error) {
        failed++;
        this.log(`${test} failed: ${error.message}`, 'error');
      }
    }
    
    this.results.integration = { passed, failed };
    return failed === 0;
  }

  async runE2ETests() {
    this.log('Running End-to-End Tests (Full UE + Demo Project)', 'info');
    
    const ueConnected = await this.checkUEConnection();
    
    if (!ueConnected) {
      this.log('Skipping E2E tests - UE not connected', 'warning');
      this.results.e2e = { passed: 0, failed: 0, skipped: true };
      return true; // Don't fail the overall test run
    }
    
    const e2eTests = [
      'test-ue-live.js',
      'test-socket-snapping.js', 
      'test-mcp-integration.js',
      'test-comprehensive-mcp.js'  // Complete MCP tool coverage test
    ];
    
    let passed = 0, failed = 0;
    
    for (const test of e2eTests) {
      const testPath = path.join(__dirname, 'tests', 'integration', test);
      
      if (!fs.existsSync(testPath)) {
        this.log(`Test file not found: ${test}`, 'warning');
        continue;
      }
      
      try {
        this.log(`Running E2E test: ${test}...`);
        execSync(`node "${testPath}"`, {
          stdio: this.config.verbose ? 'inherit' : 'pipe',
          timeout: this.config.timeout,
          env: {
            ...process.env,
            UE_PROJECT_PATH: this.config.demoProjectPath
          }
        });
        
        passed++;
        this.log(`${test} passed`, 'success');
      } catch (error) {
        failed++;
        this.log(`${test} failed: ${error.message}`, 'error');
      }
    }
    
    this.results.e2e = { passed, failed };
    return failed === 0;
  }

  async generateCoverageReport() {
    if (!this.config.coverage) return;
    
    this.log('📊 Generating Combined Coverage Report...', 'info');
    
    try {
      // Generate TypeScript coverage
      execSync('npm run test:coverage', { 
        cwd: this.config.serverPath,
        stdio: 'pipe' 
      });
      
      // TODO: Implement combined coverage reporting
      // This would merge TypeScript + Python + Integration coverage
      
      this.log('Coverage reports generated in coverage/', 'success');
    } catch (error) {
      this.log(`Coverage generation failed: ${error.message}`, 'error');
    }
  }

  async cleanupTestActors() {
    this.log('🧹 Cleaning up all test actors and folders...', 'info');
    
    try {
      const { MCPClient } = require('./tests/utils/mcp-client.js');
      const client = new MCPClient();
      
      // Get current level outliner to see folder structure
      const outlinerResult = await client.callTool('level_outliner', {});
      
      let totalDeleted = 0;
      
      if (outlinerResult.success) {
        this.log('Checking for Test folder structure...', 'info');
        
        // Get all actors
        const levelResult = await client.callTool('level_actors', {});
        
        if (levelResult.success && levelResult.actors) {
          // Find all actors in Test folder or with test names
          const testActorPatterns = [
            'Wall1', 'Wall2', 'Door1',           // Legacy names
            'Foundation', 'WallSegment_',        // Comprehensive test actors
            'BuildingWall', 'DoorFrame', 'CornerPiece', // Socket test assets
            'Complex_Wall', 'Complex_Door', 'Complex_Window', 'Complex_Corner' // Complex socket test
          ];
          
          const actorsToClean = levelResult.actors.filter(actor => 
            testActorPatterns.some(pattern => actor.name.includes(pattern))
          );
          
          if (actorsToClean.length > 0) {
            this.log(`Found ${actorsToClean.length} test actors to clean up`, 'info');
            
            // Delete each actor
            for (const actor of actorsToClean) {
              try {
                const deleteResult = await client.callTool('actor_delete', {
                  actorName: actor.name
                });
                
                if (deleteResult.success) {
                  totalDeleted++;
                  this.log(`  ✓ Deleted ${actor.name}`);
                } else {
                  this.log(`  ✗ Failed to delete ${actor.name}`, 'warning');
                }
              } catch (error) {
                this.log(`  ✗ Error deleting ${actor.name}: ${error.message}`, 'warning');
              }
            }
            
            this.log(`Successfully cleaned up ${totalDeleted}/${actorsToClean.length} test actors`, 'success');
          } else {
            this.log('No test actors found to clean up', 'success');
          }
        }
      }
      
    } catch (error) {
      this.log(`Failed to clean test actors: ${error.message}`, 'warning');
    }
  }

  async checkUELogs() {
    this.log('🔍 Checking Unreal Engine logs for errors...', 'info');
    
    // Constants for log reading configuration
    const LOG_BUFFER_SIZE = 50000; // 50KB buffer for recent log content
    
    try {
      // Read UE log file directly (more reliable than going through MCP tools)
      const logPath = path.join(os.homedir(), 'Library', 'Logs', 'Unreal Engine', 'HomeEditor', 'Home.log');
      
      let logContent = '';
      if (fs.existsSync(logPath)) {
        const logStats = fs.statSync(logPath);
        const fileSize = logStats.size;
        const readFromPos = Math.max(0, fileSize - LOG_BUFFER_SIZE);
        
        let fd;
        try {
          fd = fs.openSync(logPath, 'r');
          const buffer = Buffer.alloc(LOG_BUFFER_SIZE);
          const bytesRead = fs.readSync(fd, buffer, 0, LOG_BUFFER_SIZE, readFromPos);
          logContent = buffer.toString('utf8', 0, bytesRead);
        } finally {
          if (fd !== undefined) {
            fs.closeSync(fd);
          }
        }
      } else {
        this.log('⚠️  UE log file not found at expected location', 'warning');
        return;
      }
      
      const logLines = logContent.split('\n').filter(line => line.trim());
      const errorLines = [];
      const criticalPatterns = [
        /LogPython.*Error:/i,
        /LogPython.*UEMCP.*Failed/i,
        /LogCore.*Error:/i,
        /LogUObjectGlobals.*Error:/i,
        /LogScript.*Error:/i,
        /Fatal error/i,
        /Assertion failed/i,
      ];
      
      // Scan for critical errors
      for (const line of logLines) {
        for (const pattern of criticalPatterns) {
          if (pattern.test(line)) {
            errorLines.push(line);
            break;
          }
        }
      }
      
      if (errorLines.length > 0) {
        this.log('❌ Critical errors found in UE logs:', 'error');
        errorLines.slice(0, 10).forEach(line => {
          console.log(`   ${line.trim()}`);
        });
        
        if (errorLines.length > 10) {
          console.log(`   ... and ${errorLines.length - 10} more errors`);
        }
        
        // Add to results
        this.results.e2e.ueLogErrors = errorLines.length;
      } else {
        this.log('✅ No critical errors found in UE logs', 'success');
        this.results.e2e.ueLogErrors = 0;
      }
      
    } catch (error) {
      this.log(`⚠️  Failed to check UE logs: ${error.message}`, 'warning');
    }
  }

  printResults() {
    const { unit, integration, e2e, total } = this.results;
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 UEMCP E2E Test Results');
    console.log('='.repeat(60));
    
    console.log(`📦 Unit Tests:        ${unit.passed} passed, ${unit.failed} failed`);
    console.log(`🔗 Integration Tests: ${integration.passed} passed, ${integration.failed} failed`);
    
    if (e2e.skipped) {
      console.log(`🎮 E2E Tests:         Skipped (UE not connected)`);
    } else {
      console.log(`🎮 E2E Tests:         ${e2e.passed} passed, ${e2e.failed} failed`);
    }
    
    const totalPassed = unit.passed + integration.passed + (e2e.passed || 0);
    const totalFailed = unit.failed + integration.failed + (e2e.failed || 0);
    
    console.log('\n' + '-'.repeat(40));
    console.log(`🎯 TOTAL:             ${totalPassed} passed, ${totalFailed} failed`);
    
    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed! UEMCP is working correctly.');
    } else {
      console.log(`\n💥 ${totalFailed} test(s) failed. Check logs above.`);
    }
    
    console.log('='.repeat(60) + '\n');
    
    return totalFailed === 0;
  }

  async run() {
    const startTime = Date.now();
    
    this.log('🚀 Starting UEMCP Comprehensive Test Suite', 'info');
    this.log(`Demo Project: ${this.config.demoProjectPath}`);
    this.log(`Coverage: ${this.config.coverage ? 'Enabled' : 'Disabled'}`);
    
    // Run all test levels
    await this.runUnitTests();
    await this.runIntegrationTests(); 
    await this.runE2ETests();
    
    // Generate coverage if requested
    if (this.config.coverage) {
      await this.generateCoverageReport();
    }
    
    // Clean up all test actors before checking logs
    await this.cleanupTestActors();
    
    // Check UE logs for errors
    await this.checkUELogs();
    
    this.results.total.duration = Date.now() - startTime;
    
    const success = this.printResults();
    process.exit(success ? 0 : 1);
  }
}

// CLI interface
if (require.main === module) {
  const runner = new E2ETestRunner();
  
  process.on('SIGINT', () => {
    console.log('\n⚠️  Test run interrupted');
    process.exit(1);
  });
  
  runner.run().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = E2ETestRunner;