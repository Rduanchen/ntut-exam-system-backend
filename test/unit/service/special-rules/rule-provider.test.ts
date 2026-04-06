import { describe, expect, it } from "vitest";
import { getEffectiveSpecialRules } from "../../../../src/service/special-rules/rule-provider";
import type { ExamConfig } from "../../../../src/schemas/config.schemas";

describe("special rules - getEffectiveSpecialRules", () => {
    it("merges global + puzzle rules with stable ordering", () => {
        const config = {
            testTitle: "t",
            description: "d",
            judgerSettings: { timeLimit: 1, memoryLimit: 1 },
            accessibleUsers: [],
            globalSpecialRules: [
                {
                    id: "g1",
                    type: "use",
                    constraint: "MUST_HAVE",
                    message: "g1",
                    params: { target: "aaa" },
                },
            ],
            puzzles: [
                {
                    title: "p0",
                    language: "c",
                    subtasks: [],
                    specialRules: [
                        {
                            id: "p1",
                            type: "regex",
                            constraint: "MUST_NOT_HAVE",
                            message: "p1",
                            params: { pattern: "\\bfor\\b" },
                        },
                    ],
                },
            ],
        } as unknown as ExamConfig;

        const rules = getEffectiveSpecialRules({ examConfig: config, puzzleIndex: 0 });
        expect(rules.map((r) => r.id)).toEqual(["g1", "p1"]);
    });

    it("handles missing lists as empty", () => {
        const config = {
            testTitle: "t",
            description: "d",
            judgerSettings: { timeLimit: 1, memoryLimit: 1 },
            accessibleUsers: [],
            puzzles: [
                {
                    title: "p0",
                    language: "c",
                    subtasks: [],
                },
            ],
        } as unknown as ExamConfig;

        const rules = getEffectiveSpecialRules({ examConfig: config, puzzleIndex: 0 });
        expect(rules).toEqual([]);
    });
});
