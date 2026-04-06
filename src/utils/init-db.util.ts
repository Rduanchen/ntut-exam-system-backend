import { StatusCode } from "piston-judger/dist/judger.js";
import { AccessUser, Puzzle } from "../schemas/config.schemas.js";
import {
  JudgeResultSocreBoard,
  ScoreBoardFormat,
  Subtasks,
  TestCaseRecord,
} from "../types/scoreboard.type.js";

const emptyTestCaseRecord: TestCaseRecord = {
  status: StatusCode.WA,
  userOutput: "",
  expectedOutput: "",
  time: "0",
};

export function getDefaultScoreboard(puzzle: Puzzle[]): ScoreBoardFormat {
  let defaultScoreBoard: ScoreBoardFormat = {};
  for (let problemIndex in puzzle) {
    const problem = puzzle[problemIndex];
    let defaultPuzzle: Subtasks[] = [];
    for (let subtaskIndex in problem.subtasks) {
      const subtask = problem.subtasks[subtaskIndex];
      let visibleTestCases: TestCaseRecord[] = [];
      let hiddenTestCases: TestCaseRecord[] = [];
      for (let _ of subtask.visible) {
        visibleTestCases.push({ ...emptyTestCaseRecord });
      }
      for (let _ of subtask.hidden) {
        hiddenTestCases.push({ ...emptyTestCaseRecord });
      }
      defaultPuzzle.push({
        visible: visibleTestCases,
        hidden: hiddenTestCases,
      });
    }
    defaultScoreBoard[problemIndex] = {
      subtasks: defaultPuzzle,
      specialRuleResults: [],
    };
  }
  return defaultScoreBoard;
}
