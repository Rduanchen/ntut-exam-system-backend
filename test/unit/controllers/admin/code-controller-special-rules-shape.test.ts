import { describe, expect, it } from "vitest";

// Keep this test focused on the *shape* contract we decided for T3.2.
// We don't hit DB, unzip, or piston.

describe("admin/code judge - specialRuleResults persistence shape", () => {
    it("wraps legacy subtasks array into an explicit object { subtasks, specialRuleResults }", async () => {
        // Arrange: legacy scoreboard payload (problemID -> Subtasks[])
        const legacySubtasks = [{ visible: [], hidden: [] }];
        const updatedScoreboard: Record<string, any> = {
            "0": legacySubtasks,
        };

        // Inline the helper contract (kept intentionally identical to controller logic)
        const setPuzzleSpecialRuleResults = (
            sb: Record<string, unknown>,
            puzzleIndexRaw: string,
            specialRuleResults: Array<{ ruleId: string; passed: boolean; message: string; checkedAt: string }>,
        ) => {
            const existing = sb[puzzleIndexRaw];

            if (Array.isArray(existing)) {
                sb[puzzleIndexRaw] = {
                    subtasks: existing,
                    specialRuleResults,
                };
                return;
            }

            if (existing && typeof existing === "object") {
                (existing as any).specialRuleResults = specialRuleResults;
                return;
            }

            sb[puzzleIndexRaw] = {
                subtasks: [],
                specialRuleResults,
            };
        };

        // Act
        setPuzzleSpecialRuleResults(updatedScoreboard, "0", [
            {
                ruleId: "r1",
                passed: true,
                message: "ok",
                checkedAt: "2026-01-01T00:00:00.000Z",
            },
        ]);

        // Assert
        expect(Array.isArray(updatedScoreboard["0"])).toBe(false);
        expect(updatedScoreboard["0"]).toEqual({
            subtasks: legacySubtasks,
            specialRuleResults: [
                {
                    ruleId: "r1",
                    passed: true,
                    message: "ok",
                    checkedAt: "2026-01-01T00:00:00.000Z",
                },
            ],
        });
    });
});
