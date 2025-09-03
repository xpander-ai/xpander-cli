import { typescript } from 'projen';

const project = new typescript.TypeScriptProject({
  name: 'xpander-cli',
  description: 'Command Line Interface for Xpander',

  // Author information
  authorName: 'xpander.ai',
  authorEmail: 'opensource@xpander.ai',

  gitignore: ['.projenrc.js', 'lib'],

  // Repository information
  defaultReleaseBranch: 'main',
  repository: 'git@github.com:xpander-ai/xpander-cli.git',

  release: true,
  releaseToNpm: true,

  minNodeVersion: '20.18.1',

  // Binary entry point for the CLI
  bin: {
    xpander: 'lib/index.js',
    x: 'lib/index.js',
  },

  // TypeScript configuration
  tsconfig: {
    exclude: ['.env', '.env.template'],
    compilerOptions: {
      esModuleInterop: true,
      typeRoots: ['./node_modules/@types'],
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
    'commander@^10.0.1',
    'conf',
    'fs-extra',
    'inquirer@^8.2.5',
    'ora@^5.4.1',
    'yargs',
    'axios',
    'progress-stream',
    'form-data',
    'express',
    'open',
    'undici',
    'eventsource-parser',
    'js-yaml',
  ],

  // Development dependencies
  devDeps: [
    '@types/fs-extra',
    '@types/inquirer',
    '@types/node',
    '@types/yargs',
    '@types/express',
    '@types/open',
    '@types/js-yaml',
    'esbuild',
    'ts-node',
    '@types/progress-stream',
  ],
  jestOptions: {
    jestConfig: {
      detectOpenHandles: true,
    },
  },
  projenrcTs: true,
});

// Synth the project
project.synth();
