import { Command } from 'commander';
import { createClient } from '../../../utils/client';
import { initializeAgentWithTemplate } from '../../../utils/template-cloner';
import {
  selectTemplate,
  displayTemplateInfo,
} from '../../../utils/template-selector';
import { initializeAgent } from '../interactive/initialize';

/**
 * Register init command for agents
 */
export function registerInitCommand(parentCommand: Command): void {
  parentCommand
    .command('init [agent-id]')
    .description(
      "Initialize existing agent locally (downloads base template + syncs agent's config/instructions from backend)",
    )
    .option('--profile <n>', 'Profile to use')
    .option('--template', 'Use template selection for initialization')
    .action(async (agentId, options) => {
      const client = createClient(options.profile);

      if (options.template) {
        // Template-based initialization
        if (!agentId) {
          console.error('Agent ID is required when using --template option');
          process.exit(1);
        }

        try {
          const selectedTemplate = await selectTemplate();
          displayTemplateInfo(selectedTemplate);
          await initializeAgentWithTemplate(client, agentId, selectedTemplate);
        } catch (error: any) {
          console.error('Template initialization failed:', error.message);
          process.exit(1);
        }
      } else {
        // Standard initialization
        await initializeAgent(client, agentId);
      }
    });
}
