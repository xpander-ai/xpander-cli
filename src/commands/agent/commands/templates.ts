import chalk from 'chalk';
import Table from 'cli-table3';
import { Command } from 'commander';
import {
  getAllTemplates,
  getVisibleTemplates,
  TemplateCategory,
} from '../../../types/templates';

/**
 * Register templates command for agents (development/debug)
 */
export function registerTemplatesCommand(parentCommand: Command): void {
  const templatesCmd = parentCommand
    .command('templates')
    .description('Manage agent templates (development)');

  // List all templates
  templatesCmd
    .command('list')
    .description('List all available templates')
    .option('--all', 'Show all templates including hidden ones')
    .action(async (options) => {
      const templates = options.all ? getAllTemplates() : getVisibleTemplates();

      if (templates.length === 0) {
        console.log(chalk.yellow('No templates found.'));
        return;
      }

      console.log('\n');
      console.log(chalk.bold.blue('📋 Agent Templates'));
      console.log(chalk.dim('─'.repeat(60)));

      const table = new Table({
        head: ['ID', 'Name', 'Category', 'Visible', 'Description'],
        colWidths: [12, 18, 15, 8, 40],
        wordWrap: true,
      });

      templates.forEach((template) => {
        table.push([
          template.id,
          `${template.icon || '📦'} ${template.name}`,
          template.category,
          template.visible ? chalk.green('✓') : chalk.red('✗'),
          template.description,
        ]);
      });

      console.log(table.toString());
      console.log(chalk.dim(`\nShowing ${templates.length} template(s)`));

      if (!options.all) {
        const hiddenCount =
          getAllTemplates().length - getVisibleTemplates().length;
        if (hiddenCount > 0) {
          console.log(
            chalk.dim(`Use --all to show ${hiddenCount} hidden template(s)`),
          );
        }
      }
    });

  // Show template categories
  templatesCmd
    .command('categories')
    .description('List template categories')
    .action(async () => {
      console.log('\n');
      console.log(chalk.bold.blue('📂 Template Categories'));
      console.log(chalk.dim('─'.repeat(40)));

      Object.values(TemplateCategory).forEach((category) => {
        const templates = getAllTemplates().filter(
          (t) => t.category === category,
        );
        const visibleCount = templates.filter((t) => t.visible).length;
        const totalCount = templates.length;

        console.log(
          `${chalk.bold(category)}: ${chalk.green(visibleCount)}/${totalCount} visible`,
        );

        templates.forEach((template) => {
          const status = template.visible ? chalk.green('✓') : chalk.dim('✗');
          console.log(`  ${status} ${template.icon || '📦'} ${template.name}`);
        });
        console.log('');
      });
    });
}
