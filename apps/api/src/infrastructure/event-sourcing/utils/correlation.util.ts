import { randomUUID } from "crypto";

export class CorrelationUtil {
  static generate(prefix?: string): string {
    const uuid = randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
  }

  static propagateOrGenerate(existing?: string, prefix?: string): string {
    return existing || this.generate(prefix);
  }
}
