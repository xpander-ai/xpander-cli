# Xpander CLI

A command-line interface for interacting with the Xpander.ai platform.

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
```

## Commands

### View Available Commands

```bash
xpander --help
```

### Agent Management

List your agents:

```bash
xpander agent list
```

Get details about a specific agent:

```bash
xpander agent get --id AGENT_ID
```

If no ID is provided, the CLI will prompt you to select from your available agents.

## Output Formats

By default, the CLI outputs data in table format. You can switch to JSON format:

```bash
xpander --output json agent list
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