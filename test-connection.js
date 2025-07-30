#!/usr/bin/env node
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
