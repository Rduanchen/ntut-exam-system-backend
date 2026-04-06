import { PistonSubtaskReply } from "./judger.type.js";
import { StatusCode } from "piston-judger";

export interface ScoreBoardFormat {
  // Canonical shape: always a wrapper object.
  [problemID: string]: PuzzleResultPayload;
}

export type SpecialRuleResultRecord = {
  ruleId: string;
  passed: boolean;
  message: string;
  reason?: string;
  checkedAt: string; // ISO
};

export type PuzzleResultPayload = {
  subtasks: Subtasks[];
  specialRuleResults?: SpecialRuleResultRecord[];
};

export interface Subtasks {
  hidden: TestCaseRecord[];
  visible: TestCaseRecord[];
}

export interface TestCaseRecord {
  status: StatusCode;
  userOutput: string;
  expectedOutput: string;
  time: string;
}

export interface JudgeResultSocreBoard {
  [problemID: string]: PistonSubtaskReply[];
}

export interface ClientTestCaseRecord {
  statusCode: StatusCode;
  input: string;
  expectingOutput: string;
  userOutput: string;
  time: string;
}

export interface ClientResultFormat {
  [problemID: string]: {
    hidden: ClientTestCaseRecord[];
    visible: ClientTestCaseRecord[];
  }[];
}
