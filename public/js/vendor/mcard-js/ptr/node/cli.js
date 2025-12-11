#!/usr/bin/env npx tsx
import { CLMLoader } from './CLMLoader.js';
import { CLMRunner } from './CLMRunner.js';
import { RuntimeFactory } from './Runtimes.js';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Constants
const PROJECT_ROOT = path.resolve(__dirname, '../../../../');
// Colors
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
};
function log(msg) {
    console.log(msg);
}
function printHeader(title) {
    log(`\n${colors.bright}${colors.blue}${title}${colors.reset}`);
    log('='.repeat(60));
}
// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────
async function runCommand(args) {
    // python -m mcard.ptr.cli run <file> [--context '{}'] [--test] [--verbose]
    let file = null;
    let contextStr = '{}';
    let isTest = false;
    let verbose = false;
    // Simple arg parsing
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--context' || arg === '-c') {
            contextStr = args[++i];
        }
        else if (arg === '--test' || arg === '-t') {
            isTest = true;
        }
        else if (arg === '--verbose' || arg === '-v') {
            verbose = true;
        }
        else if (!arg.startsWith('-')) {
            file = arg;
        }
    }
    if (!file) {
        console.error(`${colors.red}Error: No CLM file specified.${colors.reset}`);
        console.log('Usage: node cli.js run <file.yaml> [--context "{}"] [--test]');
        process.exit(1);
    }
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
        console.error(`${colors.red}Error: File not found: ${file}${colors.reset}`);
        process.exit(1);
    }
    let context = {};
    try {
        context = JSON.parse(contextStr);
    }
    catch (e) {
        console.error(`${colors.red}Error parsing context JSON: ${e}${colors.reset}`);
        process.exit(1);
    }
    const chapterDir = path.dirname(fullPath);
    if (verbose) {
        console.log(`📄 Loading CLM from: ${file}`);
        if (Object.keys(context).length > 0)
            console.log(`Context: ${JSON.stringify(context)}`);
    }
    else {
        console.log(`📄 Loading CLM from: ${file}`);
    }
    const loader = new CLMLoader(PROJECT_ROOT);
    const runner = new CLMRunner(PROJECT_ROOT);
    try {
        const clm = loader.load(fullPath);
        // If --test is on, run examples if present, or single run otherwise
        // The Python CLI logic:
        // - loads CLM
        // - runs runner.run_file
        // - if --test, displays formatted results
        // - else prints JSON
        // Our JS Runner is slightly different. We need to decide whether to run examples or single execution.
        // Python's runner handles both unified. JS has explicit executeCLM vs runExamples.
        if (isTest) {
            const banner = runner.buildCLMBanner(clm);
            console.log('');
            banner.header.forEach(line => console.log(line));
            if (clm.examples && clm.examples.length > 0) {
                console.log(`Log: ['Running ${clm.examples.length} test cases...']`);
                const runResults = await runner.runExamples(clm, chapterDir);
                const summary = runner.summarizeExampleRuns(clm, runResults);
                summary.results.forEach((res, index) => {
                    const statusIcon = res.match ? '✅' : '❌';
                    console.log(`Test ${index + 1} [${JSON.stringify(res.input)}]: ${statusIcon} Got ${JSON.stringify(res.result)} (Expected ${JSON.stringify(res.expected)})`);
                });
                console.log(`\n${'='.repeat(60)}`);
                console.log(`📊 Test Results: ${clm.chapter.title}`);
                console.log(`${'='.repeat(60)}`);
                if (summary.passed === summary.total) {
                    console.log(`Result: ✅ PASSED`);
                }
                else {
                    console.log(`Result: ❌ FAILED`);
                }
            }
            else {
                const res = await runner.executeCLM(clm, chapterDir, context);
                const status = res.success ? '✅ PASSED' : '❌ FAILED';
                console.log(`Result: ${status}`);
                if (res.success)
                    console.log(`Output: ${JSON.stringify(res.result)}`);
                else
                    console.error(`Error: ${res.error}`);
            }
        }
        else {
            if (clm.examples && clm.examples.length > 0 && Object.keys(context).length === 0) {
                const runResults = await runner.runExamples(clm, chapterDir);
                const summary = runner.summarizeExampleRuns(clm, runResults);
                const payload = runner.buildSummaryReport(clm, summary);
                console.log(JSON.stringify(payload, null, 2));
            }
            else {
                const res = await runner.executeCLM(clm, chapterDir, context);
                const report = runner.buildExecutionReport(clm, res);
                console.log(JSON.stringify(report, null, 2));
                if (!res.success)
                    process.exit(1);
            }
        }
    }
    catch (e) {
        console.error(`${colors.red}❌ Execution failed: ${e.message}${colors.reset}`);
        if (verbose)
            console.error(e);
        process.exit(1);
    }
}
async function statusCommand(args) {
    printHeader('🌐 Polyglot Runtime Status (Node.js)');
    try {
        const status = await RuntimeFactory.getAvailableRuntimes();
        const runtimes = Object.keys(status).sort();
        let availableCount = 0;
        for (const r of runtimes) {
            const isAvailable = status[r];
            const icon = isAvailable ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
            const name = r.charAt(0).toUpperCase() + r.slice(1);
            console.log(`${icon} ${name}`);
            if (isAvailable)
                availableCount++;
        }
        console.log(`\nAvailable: ${availableCount}/${runtimes.length} runtimes`);
    }
    catch (e) {
        console.error('Error checking status:', e);
    }
    console.log();
}
async function listCommand(args) {
    printHeader('📚 Available CLM Files (Node.js)');
    // Search paths relative to PROJECT_ROOT
    const searchPaths = ['chapters', 'sample_pcards'];
    let found = false;
    // Simple recursive search
    function scanDir(dir) {
        const full = path.join(PROJECT_ROOT, dir);
        if (!fs.existsSync(full))
            return;
        const files = fs.readdirSync(full);
        const yamlFiles = [];
        for (const f of files) {
            const fPath = path.join(dir, f);
            const stats = fs.statSync(path.join(PROJECT_ROOT, fPath));
            if (stats.isDirectory()) {
                scanDir(fPath);
            }
            else if (f.endsWith('.yaml') || f.endsWith('.clm') || f.endsWith('.yml')) {
                yamlFiles.push(fPath);
            }
        }
        if (yamlFiles.length > 0) {
            found = true;
            // Only print if we haven't printed this dir header? 
            // Just print files with relative paths
            for (const f of yamlFiles) {
                console.log(`   • ${f}`);
            }
        }
    }
    console.log(`📁 Project Root: ${PROJECT_ROOT}/`);
    for (const d of searchPaths) {
        scanDir(d);
    }
    if (!found) {
        console.log("❌ No CLM files found in chapters/ or sample_pcards/");
    }
    console.log(`\n💡 Usage: npx tsx mcard-js/src/ptr/node/cli.ts run <file>`);
    console.log();
}
// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        printHelp();
        process.exit(1);
    }
    const command = args[0];
    const commandArgs = args.slice(1);
    switch (command) {
        case 'run':
            await runCommand(commandArgs);
            break;
        case 'status':
            await statusCommand(commandArgs);
            break;
        case 'list':
            await listCommand(commandArgs);
            break;
        case '--help':
        case '-h':
        case 'help':
            printHelp();
            break;
        default:
            console.error(`${colors.red}Unknown command: ${command}${colors.reset}`);
            printHelp();
            process.exit(1);
    }
}
function printHelp() {
    console.log(`
${colors.bright}MCard PTR CLI (Node.js)${colors.reset}

Usage:
  node cli.ts <command> [options]

Commands:
  run <file>      Execute a CLM Chapter/PCard
                  Options:
                    --context, -c <json>   Context for execution
                    --test, -t             Display results in test format
                    --verbose, -v          Enable verbose output

  status          Show polyglot runtime status
  list            List available CLM files

Examples:
  node cli.ts run chapters/chapter_01_arithmetic/addition_js.yaml --test
  node cli.ts status
`);
}
main().catch(console.error);
//# sourceMappingURL=cli.js.map