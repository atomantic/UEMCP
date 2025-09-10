#!/usr/bin/env node

// Test direct MCP connection
const http = require('http');

async function testConnection() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      type: 'test_connection',
      params: {}
    });

    const options = {
      hostname: 'localhost',
      port: 8765,
      path: '/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('Testing direct Python bridge connection...');
    const result = await testConnection();
    console.log('Connection result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

main();