import chalk from 'chalk';
import inquirer from 'inquirer';
import {
  AgentTemplate,
  TemplateCategory,
  getVisibleTemplates,
  getTemplatesByCategory,
} from '../types/templates';

interface TemplateChoice {
  name: string;
  value: AgentTemplate;
  short: string;
}

/**
 * Create formatted template choices for inquirer
 */
function createTemplateChoices(templates: AgentTemplate[]): TemplateChoice[] {
  return templates.map((template) => ({
    name: `${template.icon || '📦'} ${chalk.bold(template.name)} - ${chalk.dim(template.description)}`,
    value: template,
    short: template.name,
  }));
}

/**
 * Create categorized template choices with separators
 */
function createCategorizedChoices(): (TemplateChoice | inquirer.Separator)[] {
  const choices: (TemplateChoice | inquirer.Separator)[] = [];

  // Add Base Template category
  const baseTemplates = getTemplatesByCategory(TemplateCategory.BASE);
  if (baseTemplates.length > 0) {
    choices.push(
      new inquirer.Separator(chalk.cyan.bold('━━━ Base Templates ━━━')),
    );
    choices.push(...createTemplateChoices(baseTemplates));
  }

  // Add LLM Provider category
  const llmProviders = getTemplatesByCategory(TemplateCategory.LLM_PROVIDER);
  if (llmProviders.length > 0) {
    choices.push(new inquirer.Separator());
    choices.push(
      new inquirer.Separator(chalk.green.bold('━━━ LLM Providers ━━━')),
    );
    choices.push(...createTemplateChoices(llmProviders));
  }

  // Add AI Framework category
  const aiFrameworks = getTemplatesByCategory(TemplateCategory.AI_FRAMEWORK);
  if (aiFrameworks.length > 0) {
    choices.push(new inquirer.Separator());
    choices.push(
      new inquirer.Separator(chalk.magenta.bold('━━━ AI Frameworks ━━━')),
    );
    choices.push(...createTemplateChoices(aiFrameworks));
  }

  return choices;
}

/**
 * Interactive template selection
 */
export async function selectTemplate(): Promise<AgentTemplate> {
  const visibleTemplates = getVisibleTemplates();

  if (visibleTemplates.length === 0) {
    throw new Error('No templates are currently available');
  }

  // If only one template is visible, return it directly
  if (visibleTemplates.length === 1) {
    console.log(
      chalk.blue(
        `Using the only available template: ${visibleTemplates[0].name}`,
      ),
    );
    return visibleTemplates[0];
  }

  console.log('\n');
  console.log(chalk.bold.blue('📋 Select Agent Template'));
  console.log(chalk.dim('─'.repeat(60)));
  console.log(
    chalk.yellow('Choose a template as the foundation for your new agent'),
  );
  console.log(chalk.dim('─'.repeat(60)));

  const choices = createCategorizedChoices();

  const { selectedTemplate } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedTemplate',
      message: 'Select a template:',
      choices,
      pageSize: 15,
    },
  ]);

  return selectedTemplate;
}

/**
 * Display template information
 */
export function displayTemplateInfo(template: AgentTemplate): void {
  console.log('\n');
  console.log(chalk.bold.blue('📋 Selected Template'));
  console.log(chalk.dim('─'.repeat(50)));
  console.log(chalk.bold('Name:        ') + chalk.cyan(template.name));
  console.log(chalk.bold('Category:    ') + chalk.yellow(template.category));
  console.log(chalk.bold('Description: ') + template.description);
  if (template.repositoryUrl) {
    console.log(
      chalk.bold('Repository:  ') + chalk.dim(template.repositoryUrl),
    );
  }
  console.log(chalk.dim('─'.repeat(50)));
}
