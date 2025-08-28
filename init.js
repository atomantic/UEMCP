#!/usr/bin/env node

/**
 * UEMCP MCP Configuration Script
 * Configures Claude Desktop and Claude Code for UEMCP
 * 
 * For complete environment setup (Node.js, Python, dependencies), use ./setup.sh
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
 *   --skip-deps         Skip dependency installation (used by setup.sh)
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
UEMCP MCP Configuration Script

This script configures Claude Desktop and Claude Code to use UEMCP.
For complete environment setup, use ./setup.sh instead.

Usage:
  node init.js [options]

Options:
  --project <path>    Path to Unreal Engine project (will install plugin)
  --symlink           Create symlink instead of copying plugin (development)
  --copy              Copy plugin files instead of symlinking
  --no-interactive    Run without prompts
  --skip-claude       Skip Claude Desktop configuration
  --claude-code       Configure Claude Code (claude.ai/code) MCP
  --skip-deps         Skip dependency installation (used by setup.sh)
  --help              Show this help

Examples:
  node init.js
  node init.js --project "/path/to/project" --symlink
  node init.js --claude-code

For complete setup including environment:
  ./setup.sh
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
            log.warning('UEMCP plugin already exists in project');
            if (options.interactive) {
                const answer = await question('Replace existing plugin? (y/N): ');
                if (answer.toLowerCase() !== 'y') {
                    log.info('Keeping existing plugin.');
                    return false;
                }
            } else {
                log.info('Keeping existing plugin.');
                return false;
            }
        }
        
        // Remove existing plugin
        if (fs.lstatSync(uemcpPluginDir).isSymbolicLink()) {
            fs.unlinkSync(uemcpPluginDir);
        } else {
            fs.rmSync(uemcpPluginDir, { recursive: true, force: true });
        }
    }
    
    // Install plugin
    try {
        if (useSymlink) {
            const absoluteSource = path.resolve(sourcePluginDir);
            fs.symlinkSync(absoluteSource, uemcpPluginDir, 'junction');
            log.success(`Created symlink: ${uemcpPluginDir} → ${absoluteSource}`);
        } else {
            copyDir(sourcePluginDir, uemcpPluginDir);
            log.success('Copied UEMCP plugin to project');
        }
        
        // Update .uproject file
        const uprojectFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.uproject'));
        if (uprojectFiles.length > 0) {
            const uprojectPath = path.join(projectPath, uprojectFiles[0]);
            try {
                const uproject = JSON.parse(fs.readFileSync(uprojectPath, 'utf8'));
                
                if (!uproject.Plugins) {
                    uproject.Plugins = [];
                }
                
                const existingPlugin = uproject.Plugins.find(p => p.Name === 'UEMCP');
                if (!existingPlugin) {
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
    log.info('║      UEMCP MCP Configuration           ║');
    log.info('╚════════════════════════════════════════╝');
    
    const projectRoot = __dirname;
    
    // Check if called from setup.sh (all environment setup already handled)
    const isCalledFromSetup = process.env.UEMCP_SETUP_COMPLETE === 'true';
    
    // Only handle dependencies if NOT called from setup.sh and not skipping
    if (!options.skipDeps && !isCalledFromSetup) {
        log.section('Checking environment...');
        
        // Basic check that Node.js is available
        if (!commandExists('node')) {
            log.error('Node.js is not installed!');
            log.info('Please run ./setup.sh instead, which will install Node.js for you.');
            process.exit(1);
        }
        
        // Install dependencies
        log.section('Installing dependencies...');
        process.chdir(path.join(projectRoot, 'server'));
        
        try {
            execSync('npm install', { stdio: 'inherit' });
            log.success('Dependencies installed');
        } catch (error) {
            log.error('Failed to install dependencies');
            log.info('Please run ./setup.sh instead for complete environment setup.');
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
        
        log.warning('Note: ./setup.sh is the recommended way to set up UEMCP.');
        log.info('It handles Node.js, Python, virtual environments, and all dependencies.');
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
            }
            
            if (shouldInstallPlugin) {
                // Ask about symlink vs copy if not specified
                let useSymlink = options.symlink;
                if (useSymlink === null && options.interactive) {
                    console.log('');
                    log.info('Choose installation method:');
                    console.log('  1. Symlink (recommended for development - changes reflect immediately)');
                    console.log('  2. Copy (recommended for production - isolated from source)');
                    const method = await question('Select [1-2] (default: 1): ');
                    useSymlink = method !== '2';
                } else if (useSymlink === null) {
                    useSymlink = true; // Default to symlink in non-interactive
                }
                
                await installPlugin(validProjectPath, useSymlink);
            }
        } else {
            log.warning(`Project path not found: ${expandedPath}`);
        }
    }
    
    // Configure Claude Desktop
    if (!options.skipClaude) {
        log.section('Configuring Claude Desktop...');
        
        const configDir = getClaudeConfigDir();
        const configFile = path.join(configDir, 'claude_desktop_config.json');
        
        // Create config directory if it doesn't exist
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        let config = {};
        if (fs.existsSync(configFile)) {
            try {
                config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            } catch (error) {
                log.warning('Could not parse existing config, creating new one');
            }
        }
        
        // Add or update UEMCP server configuration
        if (!config.mcpServers) {
            config.mcpServers = {};
        }
        
        const serverPath = path.join(projectRoot, 'server', 'dist', 'index.js').replace(/\\/g, '/');
        config.mcpServers.uemcp = {
            command: 'node',
            args: [serverPath]
        };
        
        // Add project path environment variable if available
        if (validProjectPath) {
            config.mcpServers.uemcp.env = {
                UE_PROJECT_PATH: validProjectPath
            };
        }
        
        // Write config
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
    
    // Verify test script exists
    const testScriptPath = path.join(projectRoot, 'test-connection.js');
    if (!fs.existsSync(testScriptPath)) {
        log.warning('test-connection.js not found in repository');
    } else {
        log.success('Test script available: test-connection.js');
    }
    
    // Summary (suppress if called from setup.sh to avoid duplicate messages)
    if (!isCalledFromSetup) {
        console.log('');
        log.success('════════════════════════════════════════');
        log.success('✨ UEMCP Configuration Complete! ✨');
        log.success('════════════════════════════════════════');
        console.log('');
        
        log.info('Configuration Summary:');
        console.log(`  • Server: ${options.skipDeps ? 'Ready' : 'Built and ready'}`);
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
        log.info('Next steps:');
        console.log('1. Start Unreal Engine with your project');
        console.log('2. Restart Claude Desktop or Claude Code');
        console.log('3. Test the connection: node test-connection.js');
        console.log('4. Try in Claude: "List available UEMCP tools"');
        
        if (!options.skipDeps) {
            console.log('');
            log.info('For complete setup with Python environment:');
            console.log('  ./setup.sh');
        }
    }
    
    rl.close();
}

// Run initialization
init().catch(error => {
    log.error(`Initialization failed: ${error.message}`);
    process.exit(1);
});