[![Version](https://img.shields.io/npm/v/xpander-cli.svg)](https://www.npmjs.com/package/xpander-cli)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](https://github.com/xpander-ai/xpander-cli/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/node-16.x%20%7C%2018.x%20%7C%2020.x-brightgreen.svg)](https://nodejs.org/)

# Xpander CLI

## Table of Contents

- [Xpander CLI](#xpander-cli)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Managing Profiles](#managing-profiles)
  - [Command Reference](#command-reference)
    - [View All Available Commands](#view-all-available-commands)
  - [Agent Management](#agent-management)
    - [Interactive Mode](#interactive-mode)
    - [List Your Agents](#list-your-agents)
    - [Get Agent Details](#get-agent-details)
    - [Create a New Agent](#create-a-new-agent)
    - [Update an Agent](#update-an-agent)
    - [Delete an Agent](#delete-an-agent)
    - [Agent Graph Management](#agent-graph-management)
    - [Agent Tools and Operations](#agent-tools-and-operations)
  - [Interface Operations](#interface-operations)
    - [Interface Explorer](#interface-explorer)
    - [List Interfaces](#list-interfaces)
    - [View Interface Operations](#view-interface-operations)
  - [Operation Management](#operation-management)
  - [File Export Capabilities](#file-export-capabilities)
  - [Output Formats](#output-formats)
  - [Authentication and Login](#authentication-and-login)
  - [Development](#development)
    - [Project Structure](#project-structure)
    - [Common Build Issues and Solutions](#common-build-issues-and-solutions)
      - [Module Import Errors](#module-import-errors)
      - [Unused Variables](#unused-variables)
      - [CLI Binary Configuration](#cli-binary-configuration)
  - [License](#license)

## Quick Start

```bash
# Install the CLI
npm install -g xpander-cli

# Configure with your API key
xpander configure

# Create a new agent (interactive mode)
xpander agent new

# Test your agent with a message
xpander agent invoke "Hello, what can you do?"

# Explore available interfaces
xpander interfaces

# Connect operations to your agent
xpander agent tools --id YOUR_AGENT_ID
```

## Installation

You can install the Xpander CLI via npm:

```bash
npm install -g xpander-cli
```

Or using Yarn:

```bash
yarn global add xpander-cli
```

After installation, you can use the `xpander` command from anywhere.

## Configuration

Before using the CLI, you need to configure it with your API credentials:

```bash
xpander configure
```

You'll be prompted to enter your Xpander API key and organization ID. You can find these in your account settings on the Xpander platform.

Alternatively, you can provide these directly:

```bash
xpander configure --key YOUR_API_KEY --org YOUR_ORG_ID
```

## Managing Profiles

The CLI supports multiple profiles for different API credentials:

```bash
# Create a new profile
xpander configure --profile dev

# List available profiles
xpander profile --list

# Switch between profiles
xpander profile --switch prod

# Set a default profile
xpander profile --set-default prod
```

## Command Reference

### View All Available Commands

```bash
xpander --help
```

## Agent Management

The CLI provides a full suite of agent management capabilities.

### Interactive Mode

The easiest way to manage agents is through the interactive mode:

```bash
xpander agent
# or
xpander agent interactive
```

This provides a guided menu-based interface for all agent operations.

### List Your Agents

```bash
xpander agent list
```

<details>
<summary>Example output</summary>

```
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│    __  __ _ __    __ _  _ __    __| |  ___  _ __  __ _  _    │
│    \ \/ /| '_ \  / _` || '_ \  / _` | / _ \| '__|/ _` || |   │
│     >  < | |_) || (_| || | | || (_| ||  __/| | _| (_| || |   │
│    /_/\_\| .__/  \__,_||_| |_| \__,_| \___||_|(_)\__,_||_|   │
│          | |                                                 │
│                                                              │
│    Build Better AI Agents faster                             │
│    v0.0.0   Profile: personal                                │
│                                                              │
╰──────────────────────────────────────────────────────────────╯

✅ Found 3 agents:

┌─────────┬────────────────────────┬────────────────────────────────┬────────────┐
│ Name    │ ID                     │ Description                     │ Type       │
├─────────┼────────────────────────┼────────────────────────────────┼────────────┤
│ TestBot │ 647a8d4c52e83a07d9e3b5 │ A test agent for documentation  │ chat       │
│ DocBot  │ 647a8d4c52e83a07d9e3b7 │ Documentation assistant         │ structured │
│ AnalyzeX│ 647a8d4c52e83a07d9e3c1 │ Data analysis helper            │ chat       │
└─────────┴────────────────────────┴────────────────────────────────┴────────────┘
```
</details>

### Get Agent Details

```bash
xpander agent get --id AGENT_ID
```

<details>
<summary>Example output</summary>

```
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│    __  __ _ __    __ _  _ __    __| |  ___  _ __  __ _  _    │
│    \ \/ /| '_ \  / _` || '_ \  / _` | / _ \| '__|/ _` || |   │
│     >  < | |_) || (_| || | | || (_| ||  __/| | _| (_| || |   │
│    /_/\_\| .__/  \__,_||_| |_| \__,_| \___||_|(_)\__,_||_|   │
│          | |                                                 │
│                                                              │
│    Build Better AI Agents faster                             │
│    v0.0.0   Profile: personal                                │
│                                                              │
╰──────────────────────────────────────────────────────────────╯

📋 Agent Details:

Name: TestBot
ID: 647a8d4c52e83a07d9e3b5
Type: chat
Model: gpt-4
Description: A test agent for documentation

📊 Statistics:
- Created: 2023-07-15
- Last Updated: 2023-08-20
- Message Count: 156
- Connected Operations: 3
```
</details>

### Create a New Agent

```bash
xpander agent new
```

You'll be guided through the process of creating a new agent interactively.

For non-interactive creation:

```bash
xpander agent new --name "My Agent" --description "Agent description" --type "chat" --model "gpt-4"
```

### Update an Agent

```bash
xpander agent update --id AGENT_ID
```

You can update various properties of an existing agent.

### Delete an Agent

```bash
xpander agent delete --id AGENT_ID
```

### Agent Graph Management

Manage the agent's decision graph:

```bash
xpander agent graph --id AGENT_ID
```

This provides tools for visualizing and modifying the agent's decision flow.

### Agent Tools and Operations

Connect agentic operations to your agents:

```bash
xpander agent tools --id AGENT_ID
```

<details>
<summary>Example output</summary>

```
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│    __  __ _ __    __ _  _ __    __| |  ___  _ __  __ _  _    │
│    \ \/ /| '_ \  / _` || '_ \  / _` | / _ \| '__|/ _` || |   │
│     >  < | |_) || (_| || | | || (_| ||  __/| | _| (_| || |   │
│    /_/\_\| .__/  \__,_||_| |_| \__,_| \___||_|(_)\__,_||_|   │
│          | |                                                 │
│                                                              │
│    Build Better AI Agents faster                             │
│    v0.0.0   Profile: personal                                │
│                                                              │
╰──────────────────────────────────────────────────────────────╯

🔧 Xpander Agent Tools Manager
════════════════════════════════════════════════════════════
Configuring Tools for Agent: TestBot (647a8d4c52e83a07d9e3b5)
════════════════════════════════════════════════════════════

? What would you like to do? › 
❯ Connect interface operations to this agent
  View connected operations
  Remove operations from this agent
  Back to main menu
  Exit
```
</details>

## Interface Operations

Xpander CLI provides tools for working with agentic interfaces.

### Interface Explorer

The enhanced interface explorer helps you discover and interact with available interfaces:

```bash
xpander interfaces
```

<details>
<summary>Example output</summary>

```
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│    __  __ _ __    __ _  _ __    __| |  ___  _ __  __ _  _    │
│    \ \/ /| '_ \  / _` || '_ \  / _` | / _ \| '__|/ _` || |   │
│     >  < | |_) || (_| || | | || (_| ||  __/| | _| (_| || |   │
│    /_/\_\| .__/  \__,_||_| |_| \__,_| \___||_|(_)\__,_||_|   │
│          | |                                                 │
│                                                              │
│    Build Better AI Agents faster                             │
│    v0.0.0   Profile: personal                                │
│                                                              │
╰──────────────────────────────────────────────────────────────╯

🚀 Xpander Tools Explorer
════════════════════════════════════════════════════════════
Discover, Connect, and Manage your AI Agent Operations
════════════════════════════════════════════════════════════
✔ Interfaces loaded successfully
? Select an interface: ›
❯ Reddit (7b925b25...)
  arXiv (1ec81aa7...)
  Movie Database (49c3130c...)
  Weather (c6d57ee2...)
  Perplexity (33bd2a1a...)
  Crunchbase (825b3405...)
  x.com (475019c2...)
  xpanderAI Tools (794f532f...)
```
</details>

### List Interfaces

List all available interfaces:

```bash
xpander interfaces list
```

<details>
<summary>Example output</summary>

```
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│    __  __ _ __    __ _  _ __    __| |  ___  _ __  __ _  _    │
│    \ \/ /| '_ \  / _` || '_ \  / _` | / _ \| '__|/ _` || |   │
│     >  < | |_) || (_| || | | || (_| ||  __/| | _| (_| || |   │
│    /_/\_\| .__/  \__,_||_| |_| \__,_| \___||_|(_)\__,_||_|   │
│          | |                                                 │
│                                                              │
│    Build Better AI Agents faster                             │
│    v0.0.0   Profile: personal                                │
│                                                              │
╰──────────────────────────────────────────────────────────────╯

Available Interfaces:

Reddit (7b925b25-9a0f-41df-a7ab-2a09bef334a7)
Access Reddit posts, comments, and search capabilities

arXiv (1ec81aa7-3aee-460d-a5a6-492dd05242ad)
Search and retrieve scientific papers from arXiv repository

Movie Database (49c3130c-23c8-490f-9511-9b136880061e)
Query information about movies, actors, and TV shows

Weather (c6d57ee2-a749-46d1-820a-2b9d7745ae14)
Get current weather and forecasts for locations worldwide
```
</details>

### View Interface Operations

List operations for a specific interface:

```bash
xpander interfaces operations --interface INTERFACE_ID
```

<details>
<summary>Example output</summary>

```
╭──────────────────────────────────────────────────────────────╮
│                                                              │
│    __  __ _ __    __ _  _ __    __| |  ___  _ __  __ _  _    │
│    \ \/ /| '_ \  / _` || '_ \  / _` | / _ \| '__|/ _` || |   │
│     >  < | |_) || (_| || | | || (_| ||  __/| | _| (_| || |   │
│    /_/\_\| .__/  \__,_||_| |_| \__,_| \___||_|(_)\__,_||_|   │
│          | |                                                 │
│                                                              │
│    Build Better AI Agents faster                             │
│    v0.0.0   Profile: personal                                │
│                                                              │
╰──────────────────────────────────────────────────────────────╯

Found 7 operation(s):

1. Get Comments by Post ID
   Summary: Retrieve comments for a specific Reddit post. Workflow: SearchPostsByQuery to get post_id -> GetCommentsByPostId for detailed comments. Returns comment depth, score, and nested post/author details.
   Endpoint: GET /post_comments
   ID: 6730dafddbeac5e67e4cbd77

2. Search Comments by Query
   Summary: Search Reddit comments by keyword or phrase. Workflow: SearchCommentsByQuery to find relevant comments -> GetCommentsByPostId for full context.
   Endpoint: GET /search_comments
   ID: 6730dafddbeac5e67e4cbd78

[Additional operations...]
```
</details>

## Operation Management

Work directly with agentic operations:

```bash
xpander operations
```

This launches an interactive mode for browsing and working with operations.

To list operations for a specific interface:

```bash
xpander operations INTERFACE_ID
```

## File Export Capabilities

The CLI allows you to export various schemas and configurations:

```bash
# Export operation schemas (through the interfaces explorer)
xpander interfaces
```

When using the interfaces explorer, you can select operations and save their schemas to JSON files for reference or integration with your applications.

## Output Formats

By default, the CLI outputs data in table format. You can switch to JSON format:

```bash
xpander --output json agent list
```

## Authentication and Login

Login to the Xpander platform:

```bash
xpander login
```

Check your login status:

```bash
xpander login --status
```

## Development

To build the CLI from source:

```bash
# Clone the repository
git clone https://github.com/xpander-ai/xpander-cli.git
cd xpander-cli

# Install dependencies
yarn install

# Build
yarn build

# Run locally
yarn cli
```

For local development and testing:

```bash
# Make code changes
# Then build and run locally
npm run build
node ./lib/index.js [command]
```

### Project Structure

This project uses [projen](https://github.com/projen/projen) for project configuration and build management. The main configuration is in `.projenrc.ts`:

```bash
# Edit the project configuration
nano .projenrc.ts

# Compile the configuration
tsc .projenrc.ts

# Apply changes to the project
npx projen
```

Key directories:
- `src/`: Source code
  - `src/commands/`: CLI command implementations
  - `src/utils/`: Utility functions and API client
  - `src/types/`: TypeScript type definitions
- `lib/`: Compiled JavaScript output
- `test/`: Test files

### Common Build Issues and Solutions

#### Module Import Errors

If you encounter module import errors related to CommonJS modules (like chalk, ora, etc.), make sure you have the proper TypeScript configuration:

```typescript
// In .projenrc.ts
tsconfig: {
  compilerOptions: {
    esModuleInterop: true,
  },
},
```

#### Unused Variables

Unused imports or variables can cause TypeScript compilation errors. You can either:

1. Comment out unused imports and variables
2. Configure TypeScript to ignore these warnings:

```typescript
// In .projenrc.ts
tsconfigDev: {
  compilerOptions: {
    noUnusedLocals: false,
    noUnusedParameters: false,
  },
},
```

#### CLI Binary Configuration

Ensure the package.json includes the proper `bin` entry for the CLI:

```typescript
// In .projenrc.ts
bin: {
  xpander: 'lib/index.js',
},
```

## License

Apache-2.0