import boxen from 'boxen';
import chalk from 'chalk';
import { version } from '../../package.json';

/**
 * Displays the Xpander CLI banner
 */
export function displayBanner(): void {
  // ASCII art banner
  const xpanderText = `
                                 _                    _ 
                                | |                  (_)
 __  __ _ __    __ _  _ __    __| |  ___  _ __  __ _  _ 
 \\ \\/ /| '_ \\  / _\` || '_ \\  / _\` | / _ \\| '__|/ _\` || |
  >  < | |_) || (_| || | | || (_| ||  __/| | _| (_| || |
 /_/\\_\\| .__/  \\__,_||_| |_| \\__,_| \\___||_|(_)\\__,_||_|
       | |                                              
       |_|                                              
  `;

  const tagline = 'Build Better AI Agents faster';

  const bannerText = `
${chalk.blue(xpanderText)}

       ${tagline}
       ${chalk.gray(`v${version}`)}
  `;

  console.log(
    boxen(bannerText, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'blue',
    }),
  );
}
