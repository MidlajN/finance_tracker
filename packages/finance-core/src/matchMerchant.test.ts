import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { matchMerchantFromRaw } from "./index.ts";

const merchants = [
    { id: "m-swiggy", name: "Swiggy", normalized_name: "swiggy" },
    { id: "m-blooms", name: "The Blooms", normalized_name: "the blooms" },
    { id: "m-uber", name: "Uber", normalized_name: "uber" },
    { id: "m-ub", name: "UB", normalized_name: "ub" },
];

const aliases = [
    { merchant_id: "m-blooms", alias: "THEBLOOMSCOCHINPREMI" },
];

describe("matchMerchantFromRaw", () => {
    it("matches exact normalized names case-insensitively", () => {
        assert.equal(
            matchMerchantFromRaw("  SWIGGY ", merchants)?.id,
            "m-swiggy"
        );
    });

    it("matches through stored aliases", () => {
        assert.equal(
            matchMerchantFromRaw(
                "thebloomscochinpremi",
                merchants,
                aliases
            )?.id,
            "m-blooms"
        );
    });

    it("alias pointing at an unknown merchant returns null", () => {
        assert.equal(
            matchMerchantFromRaw("ghost alias", merchants, [
                { merchant_id: "m-missing", alias: "ghost alias" },
            ]),
            null
        );
    });

    it("matches a single contained merchant name", () => {
        assert.equal(
            matchMerchantFromRaw("swiggy*order8837", merchants)?.id,
            "m-swiggy"
        );
    });

    it("ignores contained names shorter than four characters", () => {
        assert.equal(matchMerchantFromRaw("club house", merchants), null);
    });

    it("returns null when containment is ambiguous", () => {
        const ambiguous = [
            ...merchants,
            {
                id: "m-swiggy-inst",
                name: "Swiggy Instamart",
                normalized_name: "swiggy instamart",
            },
        ];

        assert.equal(
            matchMerchantFromRaw(
                "swiggy instamart bangalore",
                ambiguous
            ),
            null
        );
    });

    it("falls back to name when normalized_name is missing", () => {
        assert.equal(
            matchMerchantFromRaw("Uber", [
                { id: "m-x", name: "Uber" },
            ])?.id,
            "m-x"
        );
    });

    it("returns null for empty or blank input", () => {
        assert.equal(matchMerchantFromRaw("", merchants), null);
        assert.equal(matchMerchantFromRaw("   ", merchants), null);
        assert.equal(matchMerchantFromRaw(null, merchants), null);
        assert.equal(matchMerchantFromRaw(undefined, merchants), null);
    });

    it("prefers exact match over containment", () => {
        assert.equal(
            matchMerchantFromRaw("ub", merchants)?.id,
            "m-ub"
        );
    });
});
