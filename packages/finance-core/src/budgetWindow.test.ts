import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    buildBudgetOverview,
    getBudgetWindow,
    isBudgetActiveOn,
} from "./index.ts";

function day(value: string) {
    return new Date(`${value}T12:00:00`);
}

describe("getBudgetWindow", () => {
    it("treats a legacy monthly row as a repeating monthly template", () => {
        const budget = {
            amount: 8000,
            category_id: "c-food",
            starts_on: "2026-05-01",
        };

        assert.deepEqual(
            getBudgetWindow(budget, day("2026-05-15")),
            { start: "2026-05-01", end: "2026-06-01" }
        );
        assert.deepEqual(
            getBudgetWindow(budget, day("2026-08-03")),
            { start: "2026-08-01", end: "2026-09-01" }
        );
    });

    it("is inactive before the start date", () => {
        const budget = {
            amount: 8000,
            category_id: "c-food",
            starts_on: "2026-09-01",
        };

        assert.equal(getBudgetWindow(budget, day("2026-08-31")), null);
        assert.equal(isBudgetActiveOn(budget, day("2026-08-31")), false);
    });

    it("steps weekly windows from the anchor day", () => {
        const budget = {
            amount: 1500,
            auto_renew: true,
            category_id: "c-coffee",
            period: "weekly" as const,
            starts_on: "2026-08-03",
        };

        assert.deepEqual(
            getBudgetWindow(budget, day("2026-08-05")),
            { start: "2026-08-03", end: "2026-08-10" }
        );
        assert.deepEqual(
            getBudgetWindow(budget, day("2026-08-10")),
            { start: "2026-08-10", end: "2026-08-17" }
        );
    });

    it("ends a non-renewing budget after its first period", () => {
        const budget = {
            amount: 8000,
            auto_renew: false,
            category_id: "c-food",
            period: "monthly" as const,
            starts_on: "2026-07-01",
        };

        assert.notEqual(getBudgetWindow(budget, day("2026-07-20")), null);
        assert.equal(getBudgetWindow(budget, day("2026-08-02")), null);
    });

    it("respects ends_on", () => {
        const budget = {
            amount: 8000,
            category_id: "c-food",
            ends_on: "2026-07-31",
            starts_on: "2026-05-01",
        };

        assert.notEqual(getBudgetWindow(budget, day("2026-07-15")), null);
        assert.equal(getBudgetWindow(budget, day("2026-08-01")), null);
    });

    it("clamps month-end anchors instead of drifting", () => {
        const budget = {
            amount: 9000,
            category_id: "c-rent",
            period: "quarterly" as const,
            starts_on: "2026-01-31",
        };

        assert.deepEqual(
            getBudgetWindow(budget, day("2026-05-01")),
            { start: "2026-04-30", end: "2026-07-31" }
        );
    });
});

describe("buildBudgetOverview", () => {
    const budget = {
        id: "b-food",
        amount: 8000,
        category_id: "c-food",
        starts_on: "2026-05-01",
    };
    const transactions = [
        {
            amount: 3000,
            category_id: "c-food",
            occurred_at: "2026-07-10T10:00:00Z",
            transaction_type: "expense" as const,
        },
        {
            amount: 1200,
            category_id: "c-food",
            occurred_at: "2026-08-02T10:00:00Z",
            transaction_type: "expense" as const,
        },
    ];

    it("resets progress on period rollover without new rows", () => {
        const july = buildBudgetOverview(
            [budget],
            transactions,
            day("2026-07-20")
        );
        const august = buildBudgetOverview(
            [budget],
            transactions,
            day("2026-08-03")
        );

        assert.equal(july.budgets[0].spent, 3000);
        assert.equal(august.budgets[0].spent, 1200);
        assert.equal(august.budgets[0].window.start, "2026-08-01");
    });

    it("excludes inactive budgets from totals", () => {
        const ended = {
            id: "b-old",
            amount: 5000,
            category_id: "c-travel",
            ends_on: "2026-06-30",
            starts_on: "2026-06-01",
        };
        const overview = buildBudgetOverview(
            [budget, ended],
            transactions,
            day("2026-08-03")
        );

        assert.equal(overview.budgets.length, 1);
        assert.equal(overview.totalBudgeted, 8000);
    });
});
