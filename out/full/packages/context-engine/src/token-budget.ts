export interface TokenBudget {
  total: number;
  reserved: number;
  available: number;
  allocations: Record<string, number>;
}

export class TokenBudgetManager {
  private budget: TokenBudget;

  constructor(totalTokens: number = 32768) {
    this.budget = {
      total: totalTokens,
      reserved: 4096,
      available: totalTokens - 4096,
      allocations: {}
    };
  }

  allocate(category: string, tokens: number): boolean {
    if (this.budget.available >= tokens) {
      this.budget.allocations[category] = (this.budget.allocations[category] || 0) + tokens;
      this.budget.available -= tokens;
      return true;
    }
    return false;
  }

  release(category: string): number {
    const released = this.budget.allocations[category] || 0;
    this.budget.available += released;
    delete this.budget.allocations[category];
    return released;
  }

  getAvailable(): number {
    return this.budget.available;
  }

  getTotal(): number {
    return this.budget.total;
  }

  getUsed(): number {
    return this.budget.total - this.budget.reserved - this.budget.available;
  }

  getAllocations(): Record<string, number> {
    return { ...this.budget.allocations };
  }

  reset(): void {
    this.budget.available = this.budget.total - this.budget.reserved;
    this.budget.allocations = {};
  }
}

export const tokenBudget = new TokenBudgetManager();