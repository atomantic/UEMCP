const fetch = require('node-fetch');

async function executeCommand(command) {
  const response = await fetch('http://localhost:8765', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  return await response.json();
}

async function main() {
  // Get recent UE logs
  const logsResult = await executeCommand({
    type: 'ue.logs',
    params: {
      lines: 50
    }
  });
  
  if (logsResult.success && logsResult.logs) {
    console.log('Recent UE logs:');
    console.log(logsResult.logs);
  } else {
    console.log('Could not retrieve logs');
  }
}

main().catch(console.error);
