import { describe, expect, it } from "vitest";
import { examConfigSchema } from "../../../src/schemas/config.schemas";

describe("examConfigSchema - special rules", () => {
    it("should accept config without special rules (backwards compatible)", () => {
        const minimalConfig = {
            testTitle: "T",
            description: "D",
            judgerSettings: { timeLimit: 1, memoryLimit: 1 },
            accessibleUsers: [{ id: "A123", name: "Alice" }],
            puzzles: [
                {
                    title: "P1",
                    language: "C",
                    subtasks: [
                        {
                            title: "S1",
                            visible: [{ input: "1", output: "1" }],
                            hidden: [{ input: "2", output: "2" }],
                        },
                    ],
                },
            ],
        };

        const parsed = examConfigSchema.parse(minimalConfig);
        expect(parsed.globalSpecialRules).toBeUndefined();
        expect(parsed.puzzles[0].specialRules).toBeUndefined();
    });

    it("should accept globalSpecialRules and puzzles[].specialRules", () => {
        const config = {
            testTitle: "T",
            description: "D",
            judgerSettings: { timeLimit: 1, memoryLimit: 1 },
            accessibleUsers: [{ id: "A123", name: "Alice" }],
            globalSpecialRules: [
                {
                    id: "g1",
                    type: "regex",
                    constraint: "MUST_HAVE",
                    message: "Must include main",
                    params: { pattern: "\\bmain\\b" },
                },
            ],
            puzzles: [
                {
                    title: "P1",
                    language: "C",
                    specialRules: [
                        {
                            id: "p1",
                            type: "use",
                            constraint: "MUST_NOT_HAVE",
                            message: "Must not include goto",
                            params: { target: "goto", caseSensitive: false },
                        },
                    ],
                    subtasks: [
                        {
                            title: "S1",
                            visible: [{ input: "1", output: "1" }],
                            hidden: [{ input: "2", output: "2" }],
                        },
                    ],
                },
            ],
        };

        const parsed = examConfigSchema.parse(config);
        expect(parsed.globalSpecialRules?.length).toBe(1);
        expect(parsed.puzzles[0].specialRules?.length).toBe(1);
    });
});
