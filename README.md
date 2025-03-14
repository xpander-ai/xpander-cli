# Xpander CLI

A command-line interface for interacting with the Xpander.ai platform, allowing you to manage AI agents, interfaces, operations, and more.

## Installation

You can install the Xpander CLI via npm:

```bash
npm install -g @xpander-ai/cli
```

Or using Yarn:

```bash
yarn global add @xpander-ai/cli
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

## Commands Overview

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

### Get Agent Details

```bash
xpander agent get --id AGENT_ID
```

If no ID is provided, the CLI will prompt you to select from your available agents.

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

## Agent Graph Management

Manage the agent's decision graph:

```bash
xpander agent graph --id AGENT_ID
```

This provides tools for visualizing and modifying the agent's decision flow.

## Agent Tools and Operations

Connect agentic operations to your agents:

```bash
xpander agent tools --id AGENT_ID
```

This allows you to add, remove, and configure operations that your agent can use.

## Interface Management

Xpander CLI provides tools for working with agentic interfaces.

### Interface Explorer

The enhanced interface explorer helps you discover and interact with available interfaces:

```bash
xpander interfaces
```

This interactive tool allows you to:
- Browse available interfaces
- View operations for each interface
- Select and examine operation schemas
- Save operation schemas to files for reference

### List Interfaces

List all available interfaces:

```bash
xpander interfaces list
```

### View Interface Operations

List operations for a specific interface:

```bash
xpander interfaces operations --interface INTERFACE_ID
```

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

## Project Structure

This project uses [projen](https://github.com/projen/projen) for project configuration and build management. The main configuration is in `.projenrc.ts`:

```bash
# Edit the project configuration
nano .projenrc.ts

# Compile the configuration
tsc .projenrc.ts

# Apply changes to the project
npx projen
```

## Common Build Issues and Solutions

### Module Import Errors

If you encounter module import errors related to CommonJS modules (like chalk, ora, etc.), make sure you have the proper TypeScript configuration:

```typescript
// In .projenrc.ts
tsconfig: {
  compilerOptions: {
    esModuleInterop: true,
  },
},
```

### Unused Variables

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

### CLI Binary Configuration

Ensure the package.json includes the proper `bin` entry for the CLI:

```typescript
// In .projenrc.ts
bin: {
  xpander: 'lib/index.js',
},
```

## License

Apache-2.0