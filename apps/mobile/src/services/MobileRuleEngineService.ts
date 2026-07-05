import {
  applyRuleToEvent,
  evaluateRules,
} from "@finance/finance-core";
import type {
  FinancialEventInput,
  FinancialRule,
} from "@finance/shared-types";

import { RemoteRuleRepository } from "../repositories/RemoteRuleRepository";
import { LocalRuleRepository } from "../repositories/LocalDatabaseRepository";

export class MobileRuleEngineService {
  static async evaluate(event: FinancialEventInput) {
    const rules = await RemoteRuleRepository.enabled();

    return evaluateRules(event, rules);
  }

  static async evaluateLocal(event: FinancialEventInput) {
    const rules = (await LocalRuleRepository.list()).filter(
      (rule) => rule.enabled
    );

    return evaluateRules(event, rules);
  }

  static async applyToEventWithResult(
    event: FinancialEventInput
  ): Promise<{
    event: FinancialEventInput;
    rule: FinancialRule | null;
  }> {
    const rule = await this.evaluate(event);
    const result = applyRuleToEvent(event, rule);

    return {
      event: result.event,
      rule,
    };
  }

  static async applyLocalRulesToEventWithResult(
    event: FinancialEventInput
  ): Promise<{
    event: FinancialEventInput;
    rule: FinancialRule | null;
  }> {
    const rule = await this.evaluateLocal(event);
    const result = applyRuleToEvent(event, rule);

    return {
      event: result.event,
      rule,
    };
  }
}
