import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

let verboseMode = false;

export function setVerbose(v: boolean) {
  verboseMode = v;
}

export const log = {
  debug(msg: string, ...args: unknown[]) {
    if (verboseMode) console.log(chalk.gray(`  ${msg}`), ...args);
  },
  info(msg: string, ...args: unknown[]) {
    console.log(chalk.blue('ℹ'), msg, ...args);
  },
  warn(msg: string, ...args: unknown[]) {
    console.log(chalk.yellow('⚠'), msg, ...args);
  },
  error(msg: string, ...args: unknown[]) {
    console.error(chalk.red('✖'), msg, ...args);
  },
  success(msg: string, ...args: unknown[]) {
    console.log(chalk.green('✔'), msg, ...args);
  },
  asset(id: string, status: string) {
    const icon = status === 'cached' ? chalk.gray('○') :
                 status === 'generated' ? chalk.green('●') :
                 status === 'failed' ? chalk.red('●') :
                 status === 'skipped' ? chalk.yellow('○') : '?';
    console.log(`  ${icon} ${id} ${chalk.dim(status)}`);
  },
  cost(amount: number) {
    console.log(chalk.cyan('$'), `${amount.toFixed(4)}`);
  },
  header(msg: string) {
    console.log();
    console.log(chalk.bold(msg));
    console.log(chalk.dim('─'.repeat(msg.length)));
  },
};
