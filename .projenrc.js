'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
var projen_1 = require('projen');
var project = new projen_1.typescript.TypeScriptProject({
  name: 'xpander-cli',
  description: 'Command Line Interface for Xpander',
  // Author information
  authorName: 'xpander.ai',
  authorEmail: 'opensource@xpander.ai',
  // Repository information
  defaultReleaseBranch: 'main',
  repository: 'git@github.com:xpander-ai/xpander-cli.git',
  // Binary entry point for the CLI
  bin: {
    xpander: 'lib/index.js',
  },
  // TypeScript configuration
  tsconfig: {
    compilerOptions: {
      esModuleInterop: true,
    },
  },
  // Disable noUnusedLocals to fix the compilation errors
  tsconfigDev: {
    compilerOptions: {
      noUnusedLocals: false,
      noUnusedParameters: false,
    },
  },
  prettier: true,
  prettierOptions: { settings: { singleQuote: true } },
  dependabot: true,
  deps: [
    'boxen@^5.1.2',
    'chalk@^4.1.2',
    'cli-table3',
    'commander',
    'conf',
    'fs-extra',
    'inquirer@^8.2.5',
    'ora@^5.4.1',
    'yargs',
    'axios',
  ],
  // Development dependencies
  devDeps: [
    '@types/fs-extra',
    '@types/inquirer',
    '@types/node',
    '@types/yargs',
    'esbuild',
    'ts-node',
  ],
});
// Synth the project
project.synth();
