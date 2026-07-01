import {
    applyRuleToEvent,
    evaluateRules,
    validateRule,
    type RuleMatchOperator,
} from "@finance/finance-core";

import { RuleRepository } from "../repositories/RuleRepository";

import type { Database } from "../lib/database.types";

type Rule = Awaited<
    ReturnType<typeof RuleRepository.list>
>[number];

type RuleInput = Omit<
    Database["public"]["Tables"]["financial_rules"]["Insert"],
    "user_id"
>;

type RuleUpdate =
    Database["public"]["Tables"]["financial_rules"]["Update"];

type FinancialEventInput = Omit<
    Database["public"]["Tables"]["financial_events"]["Insert"],
    "user_id"
>;

export type { RuleMatchOperator };

export class RuleEngineService {
    static async list() {
        return RuleRepository.list();
    }

    static async create(rule: RuleInput) {
        validateRule(rule);

        return RuleRepository.create({
            ...rule,
            name: rule.name.trim(),
            match_value:
                rule.match_value.trim(),
        });
    }

    static async update(
        id: string,
        updates: RuleUpdate
    ) {
        validateRule(updates);

        return RuleRepository.update(id, {
            ...updates,
            name:
                typeof updates.name === "string"
                    ? updates.name.trim()
                    : updates.name,
            match_value:
                typeof updates.match_value ===
                "string"
                    ? updates.match_value.trim()
                    : updates.match_value,
        });
    }

    static async delete(id: string) {
        await RuleRepository.delete(id);
    }

    static async evaluate(
        event: FinancialEventInput
    ) {
        const rules =
            await RuleRepository.enabled();

        return evaluateRules(event, rules);
    }

    static async applyToEvent(
        event: FinancialEventInput
    ): Promise<FinancialEventInput> {
        const result =
            await this.applyToEventWithResult(
                event
            );

        return result.event;
    }

    static async applyToEventWithResult(
        event: FinancialEventInput
    ): Promise<{
        event: FinancialEventInput;
        rule: Rule | null;
    }> {
        const rule = await this.evaluate(event);
        const result = applyRuleToEvent(
            event,
            rule
        );

        return {
            event: result.event,
            rule,
        };
    }
}
