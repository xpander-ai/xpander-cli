# Xpander.ai CLI

A command-line interface for managing Xpander.ai agents.

## Installation

You can install the CLI globally:

```bash
npm install -g xpander-cli
```

## Usage

### Authentication

To authenticate with the Xpander.ai API, you need to provide your API key:

```bash
xpander login --key YOUR_API_KEY
```

Alternatively, you can run the login command without the `--key` flag to be prompted for your API key:

```bash
xpander login
```

### Managing Agents

#### List Agents

To list all available agents:

```bash
xpander agent list
```

#### Get Agent Details

To get details about a specific agent:

```bash
xpander agent get AGENT_ID
```

#### Create a New Agent

To create a new agent:

```bash
xpander agent create
```

You will be prompted for the agent name and description.

#### Delete an Agent

To delete an agent:

```bash
xpander agent delete AGENT_ID
```

You will be asked to confirm the deletion.

## Development

### Building the CLI

```bash
npm run build
```

### Running the CLI Locally

```bash
node lib/index.js [command]
```

## Publishing

To publish the CLI package to npm:

```bash
npm run prepublishOnly
npm publish
```

This will allow users to install the CLI globally. 