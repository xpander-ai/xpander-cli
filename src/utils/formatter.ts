import chalk from 'chalk';
import Table from 'cli-table3';
import { getPreferredFormat } from './config';

/**
 * Format data for output based on preferred format (table or JSON)
 */
export function formatOutput(
  data: any,
  options: {
    headers?: string[];
    columns?: string[];
    title?: string;
    format?: string;
  } = {},
): void {
  // Check if --output json is in the command line arguments
  const hasJsonFlag =
    process.argv.includes('--output') &&
    process.argv.indexOf('--output') < process.argv.length - 1 &&
    process.argv[process.argv.indexOf('--output') + 1] === 'json';

  // Prioritize command line arguments over options
  const format = hasJsonFlag ? 'json' : options.format || getPreferredFormat();

  // Check if format is explicitly set to json
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  // Default to table format
  if (Array.isArray(data) && data.length > 0) {
    formatTableOutput(data, options);
  } else if (typeof data === 'object' && data !== null) {
    formatObjectOutput(data, options);
  } else {
    // If data is not an array or object, just stringify it
    console.log(data);
  }
}

/**
 * Format an array of objects as a table
 */
function formatTableOutput(
  data: any[],
  options: {
    headers?: string[];
    columns?: string[];
    title?: string;
  },
): void {
  if (data.length === 0) {
    if (options.title) {
      console.log(chalk.blue(`${options.title}:`));
    }
    console.log(chalk.yellow('No data found.'));
    return;
  }

  // Get column names either from options or from the first object
  const columns = options.columns || Object.keys(data[0]);

  // Use provided headers or capitalize column names
  const headers =
    options.headers ||
    columns.map(
      (col) => col.charAt(0).toUpperCase() + col.slice(1).replace(/_/g, ' '),
    );

  // Create the table
  const table = new Table({
    head: headers.map((header) => chalk.bold(header)),
    style: { head: [] },
  });

  // Add rows to the table
  for (const item of data) {
    const row = columns.map((col) => {
      const value = item[col];
      if (value === undefined || value === null) return '';
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
    table.push(row);
  }

  // Print the table with optional title
  if (options.title) {
    console.log(chalk.blue(`${options.title}:`));
  }
  console.log(table.toString());
}

/**
 * Format a single object
 */
function formatObjectOutput(
  data: Record<string, any>,
  options: { title?: string },
): void {
  if (Object.keys(data).length === 0) {
    if (options.title) {
      console.log(chalk.blue(`${options.title}:`));
    }
    console.log(chalk.yellow('No data found.'));
    return;
  }

  // Create a table with key-value pairs
  const table = new Table({
    style: { head: [] },
  });

  // Add rows for each property
  for (const [key, value] of Object.entries(data)) {
    const formattedKey = chalk.bold(
      key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
    );
    const formattedValue =
      typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : String(value);

    table.push([formattedKey, formattedValue]);
  }

  // Print the table with optional title
  if (options.title) {
    console.log(chalk.blue(`${options.title}:`));
  }
  console.log(table.toString());
}

/**
 * Parse output format from command line arguments
 */
export function parseOutputFormat(args: any): string | undefined {
  if (args.json) return 'json';
  if (args.table) return 'table';
  if (args.output) return args.output;
  return undefined;
}
