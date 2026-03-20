import { log } from '../logger.js';
import { readJson, writeJson } from '../utils.js';
import { join } from 'path';

interface CostEntry {
  assetId: string;
  cost: number;
  timestamp: string;
  provider: string;
}

export class CostTracker {
  private limit: number;
  private sessionCost: number = 0;
  private entries: CostEntry[] = [];
  private historyEntries: CostEntry[] = [];

  constructor(limit: number) {
    this.limit = limit;
  }

  add(assetId: string, cost: number, provider: string): void {
    this.sessionCost += cost;
    this.entries.push({
      assetId,
      cost,
      timestamp: new Date().toISOString(),
      provider,
    });
  }

  isOverLimit(): boolean {
    return this.sessionCost >= this.limit;
  }

  getSessionCost(): number {
    return this.sessionCost;
  }

  getRemaining(): number {
    return Math.max(0, this.limit - this.sessionCost);
  }

  async loadHistory(outputPath: string): Promise<void> {
    const historyPath = join(outputPath, 'cost-history.json');
    this.historyEntries = await readJson<CostEntry[]>(historyPath) || [];
  }

  async saveHistory(outputPath: string): Promise<void> {
    const historyPath = join(outputPath, 'cost-history.json');
    const allEntries = [...this.historyEntries, ...this.entries];
    await writeJson(historyPath, allEntries);
  }

  printSummary(): void {
    log.info(`Session cost: $${this.sessionCost.toFixed(4)}`);
    log.info(`Cost limit:   $${this.limit.toFixed(2)}`);
    log.info(`Remaining:    $${this.getRemaining().toFixed(4)}`);
    log.info(`API calls:    ${this.entries.length}`);

    if (this.historyEntries.length > 0) {
      const totalHistory = this.historyEntries.reduce((sum, e) => sum + e.cost, 0);
      log.info(`Total all-time: $${(totalHistory + this.sessionCost).toFixed(4)}`);
    }
  }
}
