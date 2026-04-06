import { z } from "zod";
import CONFIG, { LanguageKey } from "../constants/piston.config";

const supportedLanguages = Object.keys(CONFIG.languages) as [
  LanguageKey,
  ...LanguageKey[],
];

const languageSchema = z.enum(supportedLanguages);

// Special rules (static checks on source code; evaluated by client and/or during TA rejudge)
const ruleConstraintSchema = z.enum(["MUST_HAVE", "MUST_NOT_HAVE"]);

// We support a small set of rule types in v1 (no AST). Params are solver-specific.
// Keep `params` flexible so we can add new solvers without changing the config structure.
const specialRuleSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.enum(["regex", "use", "composite"]),
    constraint: ruleConstraintSchema,
    message: z.string(),
    severity: z.enum(["info", "warn"]).optional(),
    params: z.unknown(),
  }),
);

// 單一測資的格式
const testCaseSchema = z.object({
  input: z.string(),
  output: z.string(),
});

// 子任務 (subtask) 的格式
const subtaskSchema = z.object({
  title: z.string(),
  visible: z.array(testCaseSchema),
  hidden: z.array(testCaseSchema),
});

// 每一題 (puzzle) 的格式
const puzzleSchema = z.object({
  title: z.string(),
  language: languageSchema,
  timeLimit: z.number().optional(), // 只有某些題目有，故設為 optional
  memoryLimit: z.number().optional(), // 同上
  subtasks: z.array(subtaskSchema),
  specialRules: z.array(specialRuleSchema).optional(),
});

// 可以存取考試的使用者
const accessUserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

// 整體 midterm_test_config.json 的 schema
export const examConfigSchema = z.object({
  testTitle: z.string(),
  description: z.string(),
  judgerSettings: z.object({
    timeLimit: z.number(),
    memoryLimit: z.number(),
  }),
  accessibleUsers: z.array(accessUserSchema),
  globalSpecialRules: z.array(specialRuleSchema).optional(),
  puzzles: z.array(puzzleSchema),
});

// 對應的 TypeScript 型別
export type ExamConfig = z.infer<typeof examConfigSchema>;
export type Puzzle = z.infer<typeof puzzleSchema>;
export type SubTask = z.infer<typeof subtaskSchema>;
export type TestCase = z.infer<typeof testCaseSchema>;
export type AccessUser = z.infer<typeof accessUserSchema>;

export type SpecialRule = z.infer<typeof specialRuleSchema>;
export type RuleConstraint = z.infer<typeof ruleConstraintSchema>;

import { ZodError } from "zod";

export const verifyExamConfig = (config: any) => {
  try {
    return {
      examConfig: examConfigSchema.parse(config),
      isCorrect: true,
      errors: null,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        examConfig: null,
        isCorrect: false,
        errors: error.issues,
      };
    }

    return {
      examConfig: null,
      isCorrect: false,
      errors: [{ message: "Unknown error" }],
    };
  }
};
