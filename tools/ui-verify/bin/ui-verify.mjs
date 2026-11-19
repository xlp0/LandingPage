#!/usr/bin/env node
import { runCli } from '../src/cli.ts';

process.exit(runCli(process.argv.slice(2)));
