import type { ExamConfig } from "../../schemas/config.schemas";
import type { SpecialRule } from "../../schemas/config.schemas";

/**
 * Compute the effective special rules for a specific puzzle index.
 *
 * Ordering is stable:
 * 1) globalSpecialRules (config order)
 * 2) puzzles[puzzleIndex].specialRules (config order)
 */
export function getEffectiveSpecialRules(input: {
    examConfig: ExamConfig;
    puzzleIndex: number;
}): SpecialRule[] {
    const { examConfig, puzzleIndex } = input;

    const globalRules = examConfig.globalSpecialRules ?? [];
    const puzzleRules = examConfig.puzzles?.[puzzleIndex]?.specialRules ?? [];

    return [...globalRules, ...puzzleRules];
}
