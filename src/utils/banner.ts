import boxen from 'boxen';
import chalk from 'chalk';
import { getCurrentProfile } from './config';
import { version } from '../../package.json';

/**
 * Displays the Xpander CLI banner
 */
export function displayBanner(): void {
  // Get the current profile - use environment variable if set for this command
  const currentProfile =
    process.env.XPANDER_CURRENT_PROFILE || getCurrentProfile();

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
  const profileInfo = currentProfile
    ? `Profile: ${chalk.cyan(currentProfile)}`
    : '';

  const bannerText = `${chalk.blue(xpanderText)}
 ${tagline}
 ${chalk.gray(`v${version}`)}   ${profileInfo}`;

  console.log(
    boxen(bannerText, {
      padding: 1,
      margin: 0,
      borderStyle: 'round',
      borderColor: 'blue',
    }),
  );
}
