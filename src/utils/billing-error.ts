import chalk from 'chalk';

/**
 * Handles 429 billing errors with professional formatting and pricing links
 */
export class BillingErrorHandler {
  /**
   * Check if an error is a 429 billing error
   */
  public static isBillingError(error: any): boolean {
    return error?.status === 429;
  }

  /**
   * Handle billing error if it's a 429, returns true if handled, false otherwise
   */
  public static handleIfBillingError(
    error: any,
    _isStaging: boolean = false,
  ): boolean {
    if (this.isBillingError(error)) {
      // Extract message from the API response
      const errorMessage = this.extractBillingErrorMessage(
        JSON.stringify(error?.response?.data?.detail || {}),
      );

      // Display the formatted error box with API message
      this.displayFormattedError(errorMessage);
      return true;
    }
    return false;
  }

  /**
   * Create an axios response interceptor for billing errors
   */
  public static createAxiosInterceptor(isStaging: boolean = false) {
    return (error: any) => {
      if (this.handleIfBillingError(error, isStaging)) {
        // Return a rejected promise to stop further processing
        return Promise.reject(new Error('Billing limit reached'));
      }
      // Return the original error if not a billing error
      return Promise.reject(error);
    };
  }

  /**
   * Display a professionally formatted billing error message
   */
  private static displayFormattedError(errorMessage: string): void {
    console.log('\n');
    console.log(
      chalk.red.bold(
        '┌─────────────────────────────────────────────────────────────┐',
      ),
    );
    console.log(
      chalk.red.bold('│') +
        chalk.white.bold(
          '                    BILLING LIMIT REACHED                   ',
        ) +
        chalk.red.bold('│'),
    );
    console.log(
      chalk.red.bold(
        '├─────────────────────────────────────────────────────────────┤',
      ),
    );
    console.log(
      chalk.red.bold('│') +
        chalk.white(
          '                                                             ',
        ) +
        chalk.red.bold('│'),
    );

    // Display the extracted error message from the API
    if (errorMessage) {
      // Wrap error message to fit in the box
      const maxWidth = 59; // Box width minus borders and padding
      const wrappedMessage = this.wrapText(errorMessage, maxWidth);
      wrappedMessage.forEach((line) => {
        const paddedLine = line.padEnd(maxWidth);
        console.log(
          chalk.red.bold('│') +
            chalk.yellow(' ' + paddedLine + ' ') +
            chalk.red.bold('│'),
        );
      });
    } else {
      // Default message if no API error message is extracted
      console.log(
        chalk.red.bold('│') +
          chalk.white(
            " You have reached your current plan's usage limit.          ",
          ) +
          chalk.red.bold('│'),
      );
    }

    console.log(
      chalk.red.bold('│') +
        chalk.white(
          '                                                             ',
        ) +
        chalk.red.bold('│'),
    );
    console.log(
      chalk.red.bold('│') +
        chalk.white(
          ' 💡 For more information, contact our support team.          ',
        ) +
        chalk.red.bold('│'),
    );
    console.log(
      chalk.red.bold('│') +
        chalk.white(
          '                                                             ',
        ) +
        chalk.red.bold('│'),
    );
    console.log(
      chalk.red.bold(
        '└─────────────────────────────────────────────────────────────┘',
      ),
    );
    console.log('\n');
  }

  /**
   * Extract the billing error message from the API response
   */
  private static extractBillingErrorMessage(data: any): string {
    try {
      if (!data) {
        return 'Rate limit exceeded. Please try again later.';
      }

      // Handle string format with status code prefix
      if (typeof data === 'string') {
        const extracted = this.extractLastDetailFromResponse(data);
        if (extracted) {
          return extracted;
        }
        // If extraction failed, return the original string
        return data;
      }

      // For object data, find the deepest detail
      const extracted = this.getLastDetail(data);
      if (extracted) {
        return extracted;
      }

      // If no detail found, return the object as JSON string
      return JSON.stringify(data, null, 2);
    } catch (e) {
      // Fallback message if extraction fails
      return 'Rate limit exceeded. Please try again later.';
    }
  }

  /**
   * Extract the last detail from a response string like "429: {'detail': {'detail': {'detail': 'message'}}}"
   */
  private static extractLastDetailFromResponse(
    response: string,
  ): string | undefined {
    try {
      // Remove the prefix of "429: " and prefix & suffix of ""
      const cleaned = response.replace('429: ', '').replace(/^"+|"+$/g, '');

      // Parse into an object (convert single quotes to double quotes if needed)
      const obj = JSON.parse(cleaned.replace(/'/g, '"'));

      // Get the last detail recursively
      return this.getLastDetail(obj);
    } catch (e) {
      // If parsing fails, return undefined to fall back to other methods
      return undefined;
    }
  }

  /**
   * Recursive helper to get the last detail from nested objects
   */
  private static getLastDetail(value: any): string | undefined {
    if (typeof value === 'string') {
      return value;
    }
    if (value && typeof value === 'object' && 'detail' in value) {
      return this.getLastDetail(value.detail);
    }
    // Also check other common error message fields
    if (value && typeof value === 'object') {
      if (typeof value.message === 'string') {
        return value.message;
      }
      if (typeof value.error === 'string') {
        return value.error;
      }
    }
    return undefined;
  }

  /**
   * Wrap text to fit within specified width
   */
  private static wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          // Word is too long, truncate it
          lines.push(word.substring(0, maxWidth - 3) + '...');
          currentLine = '';
        }
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
}

/**
 * Convenience function to handle billing errors
 */
export const handleBillingError = (
  error: any,
  isStaging: boolean = false,
): boolean => {
  return BillingErrorHandler.handleIfBillingError(error, isStaging);
};
