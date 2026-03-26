const os = require('os');
const AgentCore = require('./agent-core');
const config = require('./config');

const agent = new AgentCore(config);

function printBanner() {
    console.log('============================================================');
    console.log('  Internet Cafe Monitoring System - Client Agent');
    console.log('============================================================');
    console.log(`  PC Name      : ${config.pcName || os.hostname()}`);
    console.log(`  Server       : ${config.serverUrl}`);
    console.log(`  Heartbeat    : Every ${config.heartbeatInterval / 1000}s`);
    console.log(`  Command Poll : Every ${config.commandPollInterval / 1000}s`);
    console.log(`  Screenshots  : ${config.enableScreenshot ? 'Enabled' : 'Disabled'}`);
    console.log(`  Live Stream  : ${config.enableLiveStream ? 'Enabled' : 'Disabled'}`);
    console.log('============================================================');
    console.log('  Agent started. Press Ctrl+C to stop.');
    console.log('============================================================\n');
}

function shutdown(label) {
    console.log(`\n[Agent] ${label}`);
    try {
        agent.stop();
    } finally {
        setTimeout(() => process.exit(0), 800);
    }
}

process.on('SIGINT', () => shutdown('Shutting down gracefully...'));
process.on('SIGTERM', () => shutdown('Terminated.'));

try {
    printBanner();
    agent.start();
} catch (err) {
    console.error('[Agent] Fatal error:', err);
    process.exit(1);
}
