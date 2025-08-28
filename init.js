#!/usr/bin/env node

/**
 * UEMCP Universal Initialization Script
 * Works on Windows, macOS, and Linux
 * 
 * Usage:
 *   node init.js [options]
 * 
 * Options:
 *   --project <path>    Path to Unreal Engine project (will install plugin)
 *   --symlink           Create symlink instead of copying plugin (recommended for development)
 *   --copy              Copy plugin files instead of symlinking
 *   --no-interactive    Run without prompts
 *   --skip-claude       Skip Claude Desktop configuration
 *   --claude-code       Configure Claude Code (claude.ai/code) MCP
 *   --help              Show this help
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    project: null,
    interactive: true,
    skipClaude: false,
    claudeCode: false,
    skipDeps: false,  // Skip dependency installation (when called from setup.sh)
    symlink: null, // null = ask, true = symlink, false = copy
    help: false
};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--project':
            options.project = args[++i];
            break;
        case '--no-interactive':
            options.interactive = false;
            break;
        case '--skip-claude':
            options.skipClaude = true;
            break;
        case '--skip-deps':
            options.skipDeps = true;
            break;
        case '--claude-code':
            options.claudeCode = true;
            break;
        case '--symlink':
            options.symlink = true;
            break;
        case '--copy':
            options.symlink = false;
            break;
        case '--help':
        case '-h':
            options.help = true;
            break;
    }
}

if (options.help) {
    console.log(`
UEMCP Init Script

Usage:
  node init.js [options]

Options:
  --project <path>    Path to Unreal Engine project (will install plugin)
  --symlink           Create symlink instead of copying plugin (recommended for development)
  --copy              Copy plugin files instead of symlinking
  --no-interactive    Run without prompts
  --skip-claude       Skip Claude Desktop configuration
  --claude-code       Configure Claude Code (claude.ai/code) MCP
  --help              Show this help

Examples:
  node init.js
  node init.js --project "/path/to/project" --symlink
  node init.js --no-interactive --skip-claude
  node init.js --claude-code
`);
    process.exit(0);
}

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Helper functions
const log = {
    info: (msg) => console.log(`${colors.blue}${msg}${colors.reset}`),
    success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
    warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    section: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`)
};

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Check if command exists
function commandExists(cmd) {
    try {
        execSync(`${cmd} --version`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Get Claude config directory based on OS
function getClaudeConfigDir() {
    const platform = os.platform();
    const homeDir = os.homedir();
    
    switch (platform) {
        case 'darwin': // macOS
            return path.join(homeDir, 'Library', 'Application Support', 'Claude');
        case 'win32': // Windows
            return path.join(process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming'), 'Claude');
        default: // Linux and others
            return path.join(homeDir, '.config', 'claude');
    }
}

// Copy directory recursively
function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Install plugin to Unreal project
async function installPlugin(projectPath, useSymlink = false) {
    log.section(`${useSymlink ? 'Symlinking' : 'Installing'} UEMCP Plugin to Unreal Project...`);
    
    const pluginsDir = path.join(projectPath, 'Plugins');
    const uemcpPluginDir = path.join(pluginsDir, 'UEMCP');
    const sourcePluginDir = path.join(__dirname, 'plugin');
    
    // Check if source plugin exists
    if (!fs.existsSync(sourcePluginDir)) {
        log.error('Plugin source not found!');
        return false;
    }
    
    // Create Plugins directory if it doesn't exist
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir, { recursive: true });
        log.success('Created Plugins directory');
    }
    
    // Check if plugin already exists
    if (fs.existsSync(uemcpPluginDir)) {
        // Check if it's already a symlink
        const stats = fs.lstatSync(uemcpPluginDir);
        if (stats.isSymbolicLink()) {
            const linkTarget = fs.readlinkSync(uemcpPluginDir);
            log.warning(`UEMCP plugin already exists as symlink → ${linkTarget}`);
            if (options.interactive) {
                const answer = await question('Update existing symlink? (y/N): ');
                if (answer.toLowerCase() !== 'y') {
                    log.info('Keeping existing symlink.');
                    return false;
                }
            } else {
                log.info('Keeping existing symlink.');
                return false;
            }
        } else {
            log.warning('UEMCP plugin already exists in project.');
            if (options.interactive) {
                const answer = await question('Replace existing plugin? (y/N): ');
                if (answer.toLowerCase() !== 'y') {
                    log.info('Skipping plugin installation.');
                    return false;
                }
            } else {
                log.info('Skipping plugin installation (already exists).');
                return false;
            }
        }
        
        // Remove existing plugin or symlink
        fs.rmSync(uemcpPluginDir, { recursive: true, force: true });
    }
    
    // Install plugin (copy or symlink)
    try {
        if (useSymlink) {
            log.info(`Creating symlink: ${uemcpPluginDir} → ${sourcePluginDir}`);
            // Use 'junction' on Windows for compatibility, default symlink type on other platforms
            const symlinkType = os.platform() === 'win32' ? 'junction' : undefined;
            fs.symlinkSync(sourcePluginDir, uemcpPluginDir, symlinkType);
            log.success('Plugin symlinked successfully!');
            log.info('💡 Tip: Changes to plugin code will be reflected immediately after restart_listener()');
        } else {
            log.info('Copying plugin files...');
            copyDir(sourcePluginDir, uemcpPluginDir);
            log.success('Plugin copied successfully!');
        }
        
        // Update .uproject file to enable the plugin
        const uprojectFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.uproject'));
        if (uprojectFiles.length > 0) {
            const uprojectPath = path.join(projectPath, uprojectFiles[0]);
            log.info(`Updating ${uprojectFiles[0]}...`);
            
            try {
                const uproject = JSON.parse(fs.readFileSync(uprojectPath, 'utf8'));
                
                // Add plugin to the list if not already there
                if (!uproject.Plugins) {
                    uproject.Plugins = [];
                }
                
                const pluginExists = uproject.Plugins.some(p => p.Name === 'UEMCP');
                if (!pluginExists) {
                    uproject.Plugins.push({
                        Name: 'UEMCP',
                        Enabled: true
                    });
                    
                    fs.writeFileSync(uprojectPath, JSON.stringify(uproject, null, 2));
                    log.success('Updated project file to enable UEMCP plugin');
                }
            } catch (error) {
                log.warning(`Could not update .uproject file: ${error.message}`);
                log.info('You may need to enable the plugin manually in Unreal Editor');
            }
        }
        
        return true;
    } catch (error) {
        log.error(`Failed to install plugin: ${error.message}`);
        return false;
    }
}

// Main initialization function
async function init() {
    if (options.interactive) {
        console.clear();
    }
    log.info('╔════════════════════════════════════════╗');
    log.info('║        UEMCP Initialization            ║');
    log.info('║   Unreal Engine MCP Server Setup       ║');
    log.info('╚════════════════════════════════════════╝');
    
    const projectRoot = __dirname;
    
    // Check prerequisites
    log.section('Checking prerequisites...');
    
    // Check Node.js
    if (!commandExists('node')) {
        log.error('Node.js is not installed!');
        console.log('Please install Node.js from https://nodejs.org/');
        process.exit(1);
    }
    const nodeVersion = execSync('node --version').toString().trim();
    log.success(`Node.js ${nodeVersion}`);
    
    // Check npm
    if (!commandExists('npm')) {
        log.error('npm is not installed!');
        process.exit(1);
    }
    const npmVersion = execSync('npm --version').toString().trim();
    log.success(`npm ${npmVersion}`);
    
    // Check Python (optional but recommended)
    let pythonAvailable = false;
    let pythonCmd = 'python3';
    let pipCmd = 'pip3';
    
    if (commandExists('python3')) {
        pythonAvailable = true;
        pythonCmd = 'python3';
        pipCmd = commandExists('pip3') ? 'pip3' : 'python3 -m pip';
    } else if (commandExists('python')) {
        // Check if it's Python 3
        try {
            const version = execSync('python --version 2>&1').toString();
            if (version.includes('Python 3')) {
                pythonAvailable = true;
                pythonCmd = 'python';
                pipCmd = commandExists('pip') ? 'pip' : 'python -m pip';
            }
        } catch {}
    }
    
    if (pythonAvailable) {
        const pythonVersion = execSync(`${pythonCmd} --version 2>&1`).toString().trim();
        log.success(pythonVersion);
        
        // Check if pip is available
        try {
            execSync(`${pipCmd} --version`, { stdio: 'ignore' });
            log.success('pip is available');
        } catch {
            pipCmd = `${pythonCmd} -m pip`;
            try {
                execSync(`${pipCmd} --version`, { stdio: 'ignore' });
                log.success('pip module is available');
            } catch {
                log.warning('pip is not available. Python dependencies cannot be installed.');
                pythonAvailable = false;
            }
        }
    } else {
        log.warning('Python 3 not found. Testing and linting features will be limited.');
        log.info('Note: The core UEMCP functionality will still work in Unreal Engine.');
    }
    
    // Check if called from setup.sh (dependencies already handled)
    const isCalledFromSetup = process.env.UEMCP_SETUP_COMPLETE === 'true';
    
    if (!options.skipDeps && !isCalledFromSetup) {
        // Install dependencies
        log.section('Installing dependencies...');
        process.chdir(path.join(projectRoot, 'server'));
        
        try {
            execSync('npm install', { stdio: 'inherit' });
            log.success('Dependencies installed');
        } catch (error) {
            log.error('Failed to install dependencies');
            process.exit(1);
        }
        
        // Build server
        log.section('Building MCP server...');
        try {
            execSync('npm run build', { stdio: 'inherit' });
            log.success('Server built successfully!');
        } catch (error) {
            log.error('Build failed!');
            process.exit(1);
        }
    } else {
        if (isCalledFromSetup) {
            log.info('Dependencies already handled by setup.sh');
        } else {
            log.info('Skipping dependency installation (--skip-deps)');
        }
    }
    
    // Install Python dependencies if available (skip if called from setup.sh)
    if (!options.skipDeps && !isCalledFromSetup) {
        if (pythonAvailable && fs.existsSync(path.join(projectRoot, 'requirements-dev.txt'))) {
            log.section('Installing Python dependencies (optional)...');
            process.chdir(projectRoot);
            
            // Ask user if they want to install Python dev dependencies in interactive mode
            let shouldInstallPython = !options.interactive; // Install by default in non-interactive mode
            
            if (options.interactive) {
                console.log('');
                log.info('Python development dependencies are optional.');
                log.info('They provide testing and linting tools but are not required for core functionality.');
                const answer = await question('Install Python development dependencies? (y/N): ');
                shouldInstallPython = answer.toLowerCase() === 'y';
            }
            
            if (shouldInstallPython) {
                try {
                    log.info('Installing Python packages (this may take a moment)...');
                    // Use --user flag to avoid permission issues
                    execSync(`${pipCmd} install --user -r requirements-dev.txt`, { 
                        stdio: options.interactive ? 'inherit' : 'ignore'
                    });
                    log.success('Python dependencies installed');
                    log.info('Note: These are development tools for testing and linting.');
                } catch (error) {
                    log.warning('Could not install Python dependencies');
                    log.info('This is OK - the core UEMCP functionality will still work.');
                    log.info('These dependencies are only needed for:');
                    console.log('  - Running tests with pytest');
                    console.log('  - Code formatting with black');
                    console.log('  - Linting with flake8/ruff');
                    
                    if (options.interactive) {
                        console.log('');
                        log.info('To install later, run:');
                        console.log(`  ${pipCmd} install -r requirements-dev.txt`);
                    }
                }
            } else {
                log.info('Skipping Python dependencies (can be installed later if needed)');
            }
        } else if (!pythonAvailable) {
            log.info('Skipping Python dependencies (Python not available)');
            log.info('The UEMCP plugin will still work in Unreal Engine.');
        }
    }
    
    // Handle UE project path
    let ueProjectPath = options.project;
    
    if (!ueProjectPath && options.interactive) {
        console.log('');
        ueProjectPath = await question('Enter the path to your Unreal Engine project (or press Enter to skip): ');
    }
    
    let validProjectPath = null;
    let shouldInstallPlugin = false;
    if (ueProjectPath) {
        const expandedPath = ueProjectPath.replace(/^~/, os.homedir());
        if (fs.existsSync(expandedPath)) {
            validProjectPath = expandedPath;
            log.success(`Project path verified: ${expandedPath}`);
            
            // Plugin installation is automatic when project is specified
            // Ask for confirmation in interactive mode
            shouldInstallPlugin = true;
            if (options.interactive) {
                const answer = await question('Install UEMCP plugin to this project? (Y/n): ');
                shouldInstallPlugin = answer.toLowerCase() !== 'n';
                
                // Ask about symlink vs copy if not specified
                if (shouldInstallPlugin && options.symlink === null) {
                    console.log('\nHow would you like to install the plugin?');
                    console.log('  1. Symlink (recommended for development - hot reload support)');
                    console.log('  2. Copy (recommended for production)');
                    const methodAnswer = await question('Choose method (1/2) [1]: ');
                    
                    // Handle method selection with clear logic
                    if (methodAnswer === '1' || methodAnswer === '') {
                        options.symlink = true; // Default to symlink
                    } else if (methodAnswer === '2') {
                        options.symlink = false; // Use copy
                    } else {
                        log.warning('Invalid choice. Defaulting to symlink.');
                        options.symlink = true;
                    }
                }
            }
        } else {
            log.error(`Directory not found: ${expandedPath}`);
            log.warning('You can set this later with environment variable UE_PROJECT_PATH');
        }
    }
    
    // Install plugin if project path provided
    if (shouldInstallPlugin && validProjectPath) {
        // Default to symlink in non-interactive mode if not specified
        const useSymlink = options.symlink !== null ? options.symlink : true;
        await installPlugin(validProjectPath, useSymlink);
    }
    
    // Configure Claude Desktop
    if (!options.skipClaude) {
        log.section('Configuring Claude Desktop integration...');
        
        const claudeConfigDir = getClaudeConfigDir();
        const configFile = path.join(claudeConfigDir, 'claude_desktop_config.json');
        
        // Create config directory if it doesn't exist
        fs.mkdirSync(claudeConfigDir, { recursive: true });
        
        let config = {};
        let backupMade = false;
        
        // Check if config exists
        if (fs.existsSync(configFile)) {
            log.info('Found existing Claude config. Creating backup...');
            const backupName = `claude_desktop_config.json.backup.${Date.now()}`;
            fs.copyFileSync(configFile, path.join(claudeConfigDir, backupName));
            backupMade = true;
            
            try {
                config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            } catch {
                log.warning('Could not parse existing config. Creating new one.');
                config = {};
            }
        }
        
        // Add UEMCP server to config
        if (!config.mcpServers) {
            config.mcpServers = {};
        }
        
        const serverPath = path.join(projectRoot, 'server', 'dist', 'index.js').replace(/\\/g, '/');
        config.mcpServers.uemcp = {
            command: 'node',
            args: [serverPath],
            env: {
                DEBUG: 'uemcp:*'
            }
        };
        
        // Add project path if available
        if (validProjectPath) {
            config.mcpServers.uemcp.env.UE_PROJECT_PATH = validProjectPath;
        }
        
        // Save config
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        log.success('Claude configuration saved');
    }
    
    // Check if user wants to configure Claude Code
    if (!options.claudeCode && options.interactive) {
        const answer = await question('\nAlso configure Claude Code (claude.ai/code)? (y/N): ');
        options.claudeCode = answer.toLowerCase() === 'y';
    }
    
    // Configure Claude Code
    if (options.claudeCode) {
        log.section('Configuring Claude Code (claude.ai/code)...');
        
        // Check if claude mcp CLI is installed
        if (!commandExists('claude')) {
            log.warning('Claude MCP CLI not found. Installing...');
            try {
                execSync('npm install -g @anthropic/claude-mcp', { stdio: 'inherit' });
                log.success('Claude MCP CLI installed');
            } catch (error) {
                log.error('Failed to install Claude MCP CLI');
                log.info('You can install it manually with: npm install -g @anthropic/claude-mcp');
            }
        }
        
        // Configure using claude mcp add
        if (commandExists('claude')) {
            try {
                const serverPath = path.join(projectRoot, 'server', 'dist', 'index.js').replace(/\\/g, '/');
                let addCommand = `claude mcp add uemcp node "${serverPath}"`;
                
                // Add project path if available
                if (validProjectPath) {
                    addCommand += ` -e "UE_PROJECT_PATH=${validProjectPath}"`;
                }
                
                log.info('Adding UEMCP to Claude Code configuration...');
                execSync(addCommand, { stdio: 'inherit' });
                log.success('Claude Code configuration complete!');
                
                // Verify installation
                try {
                    execSync('claude mcp list', { stdio: 'inherit' });
                } catch {}
                
            } catch (error) {
                log.error('Failed to configure Claude Code');
                log.info('You can configure manually with:');
                console.log(`  claude mcp add uemcp node "${path.join(projectRoot, 'server', 'dist', 'index.js').replace(/\\/g, '/')}"`);
            }
        }
    }
    
    // Create test scripts
    log.section('Creating test scripts...');
    
    // Create test-connection script
    const testScriptContent = `#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

console.log('Testing UEMCP connection...');
const testProcess = spawn('node', [path.join(__dirname, 'test-uemcp-simple.js')], {
    stdio: 'inherit',
    env: { ...process.env, DEBUG: 'uemcp:*' }
});

testProcess.on('close', (code) => {
    process.exit(code);
});
`;
    
    fs.writeFileSync(path.join(projectRoot, 'test-connection.js'), testScriptContent);
    if (os.platform() !== 'win32') {
        fs.chmodSync(path.join(projectRoot, 'test-connection.js'), '755');
    }
    
    // Summary
    console.log('');
    log.success('════════════════════════════════════════');
    log.success('✨ UEMCP Initialization Complete! ✨');
    log.success('════════════════════════════════════════');
    console.log('');
    
    log.info('Configuration Summary:');
    console.log(`  • Server: Built and ready`);
    if (!options.skipClaude) {
        console.log(`  • Claude Desktop: Configured`);
    }
    if (options.claudeCode) {
        console.log(`  • Claude Code: Configured`);
    }
    if (validProjectPath) {
        console.log(`  • Project: ${validProjectPath}`);
        if (shouldInstallPlugin) {
            const useSymlink = options.symlink !== null ? options.symlink : true;
            console.log(`  • Plugin: ${useSymlink ? 'Symlinked' : 'Copied'} to project`);
        }
    }
    
    console.log('');
    log.info('Next Steps:');
    let stepNum = 1;
    if (!options.skipClaude) {
        console.log(`  ${stepNum++}. Restart Claude Desktop`);
        console.log(`  ${stepNum++}. Say "List available UEMCP tools" in Claude Desktop`);
    }
    if (options.claudeCode) {
        console.log(`  ${stepNum++}. Visit claude.ai/code and say "List available UEMCP tools"`);
    }
    console.log(`  ${stepNum++}. Test locally: node test-connection.js`);
    if (validProjectPath && shouldInstallPlugin) {
        console.log(`  ${stepNum++}. Open your project in Unreal Editor`);
        console.log(`  ${stepNum++}. The UEMCP plugin should load automatically`);
    }
    
    console.log('');
    log.info('Quick Commands:');
    if (!validProjectPath) {
        console.log('  • Set project: export UE_PROJECT_PATH="/path/to/project"');
    }
    console.log('  • Run tests: npm test');
    console.log('  • View logs: DEBUG=uemcp:* node test-connection.js');
    
    console.log('');
    log.success('Happy coding with UEMCP! 🚀');
    
    rl.close();
}

// Run initialization
init().catch((error) => {
    log.error(`Initialization failed: ${error.message}`);
    process.exit(1);
});