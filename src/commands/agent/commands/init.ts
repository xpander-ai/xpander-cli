import { Command } from 'commander';
import { getTemplateById } from '../../../types/templates';
import { getAgentIdFromEnvOrSelection } from '../../../utils/agent-resolver';
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
    .alias('i')
    .description(
      "Initialize existing agent locally (downloads base template + syncs agent's config/instructions from backend)",
    )
    .option('--profile <n>', 'Profile to use')
    .option(
      '--framework <framework>',
      'Framework template to use (agno, agno-team, base)',
    )
    .option(
      '--folder <folder>',
      'Folder to initialize agent in (enables non-interactive mode)',
    )
    .option('--template', 'Use template selection for initialization')
    .action(async (agentIdOrName, options) => {
      const client = createClient(options.profile);
      const { framework, folder } = options;
      const isNonInteractive = !!folder;

      // Resolve agent name/ID to actual agent ID
      const agentId = await getAgentIdFromEnvOrSelection(client, agentIdOrName);

      if (!agentId) {
        if (isNonInteractive) {
          console.error('Agent ID is required when using --folder');
          process.exit(1);
        }
        // Standard initialization without agent ID
        await initializeAgent(client, undefined);
        return;
      }

      if (framework || options.template || folder) {
        // Template-based initialization
        let selectedTemplate;

        if (framework) {
          // Non-interactive mode: use specified framework
          selectedTemplate = getTemplateById(framework);
          if (!selectedTemplate) {
            console.error(
              `Invalid framework: ${framework}. Available: agno, agno-team, base`,
            );
            process.exit(1);
          }
          if (!folder) {
            displayTemplateInfo(selectedTemplate);
          }
        } else if (folder) {
          // Auto-detect template when only folder is specified - default to agno
          selectedTemplate = getTemplateById('agno');
          if (!selectedTemplate) {
            console.error(
              'Failed to determine template. Please specify --framework',
            );
            process.exit(1);
          }
        } else {
          // Interactive template selection
          selectedTemplate = await selectTemplate();
          displayTemplateInfo(selectedTemplate);
        }

        try {
          await initializeAgentWithTemplate(
            client,
            agentId,
            selectedTemplate,
            isNonInteractive,
            folder,
          );
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
