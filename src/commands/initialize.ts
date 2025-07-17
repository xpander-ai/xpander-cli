import { Command } from 'commander';
import { CommandType } from '../types';
import { getTemplateById } from '../types/templates';
import { createClient } from '../utils/client';
import { initializeAgentWithTemplate } from '../utils/template-cloner';
import {
  displayTemplateInfo,
  selectTemplate,
} from '../utils/template-selector';
import { initializeAgent } from './agent/interactive/initialize';

/**
 * Register init command
 */
export function configureInitializeCommand(program: Command): Command {
  const operationsCmd = program
    .command(`${CommandType.Initialize}`)
    .description('Initialize AI Agent into current workdir')
    .option('--profile <n>', 'Profile to use')
    .argument('[agent-id]', 'Agent ID to initialize')
    .option('--agno', 'Use Agno template')
    .option('--base', 'Use Base template')
    .option('--template', 'Use template selection for initialization')
    .action(async (agentId, options) => {
      const client = createClient(options.profile);

      // Determine if we should use template-based initialization
      const shouldUseTemplate =
        options.template || options.agno || options.base;

      if (shouldUseTemplate) {
        let selectedTemplate;

        if (options.agno) {
          selectedTemplate = getTemplateById('agno');
        } else if (options.base) {
          selectedTemplate = getTemplateById('base');
        } else {
          // Interactive template selection
          selectedTemplate = await selectTemplate();
        }

        if (!selectedTemplate) {
          console.error('Template not found or not available');
          process.exit(1);
        }

        displayTemplateInfo(selectedTemplate);
        await initializeAgentWithTemplate(client, agentId, selectedTemplate);
      } else {
        // Standard initialization - will prompt for template if agentId is provided
        await initializeAgent(client, agentId);
      }
    });

  return operationsCmd;
}
