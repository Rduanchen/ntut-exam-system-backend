import { JudgeResult } from "piston-judger";
import {
  TestCaseRecord,
  ClientTestCaseRecord,
  JudgeResultSocreBoard,
  ScoreBoardFormat,
  ClientResultFormat,
  PuzzleResultPayload,
} from "../types/scoreboard.type";

function mapPistonJudgeResultsToScoreBoardFormat(
  pistonResults: JudgeResult,
): TestCaseRecord {
  return {
    status: pistonResults.status,
    userOutput: pistonResults.actualOutput || "",
    expectedOutput: pistonResults.expectedOutput || "",
    time: pistonResults.details?.runInfo.cpuTime.toString() || "0",
  };
}

function mapClientJudgeResultsToScoreBoardFormat(
  clientResults: ClientTestCaseRecord,
): TestCaseRecord {
  return {
    status: clientResults.statusCode,
    userOutput: clientResults.userOutput,
    expectedOutput: clientResults.expectingOutput,
    time: clientResults.time,
  };
}

function overwriteScoreBoardWithPistonResults(
  pistonSubtaskReply: JudgeResultSocreBoard,
): ScoreBoardFormat {
  let updatedScoreboard: ScoreBoardFormat = {};

  for (let problemID in pistonSubtaskReply) {
    let subtaskReplies = pistonSubtaskReply[problemID];
    let subtaskResult = [];

    for (let subtaskReply of subtaskReplies) {
      let hiddenStatus: TestCaseRecord[] = [];
      let visibleStatus: TestCaseRecord[] = [];
      for (let hiddenResult of subtaskReply.hidden) {
        hiddenStatus.push(
          mapPistonJudgeResultsToScoreBoardFormat(hiddenResult),
        );
      }
      for (let visibleResult of subtaskReply.visible) {
        visibleStatus.push(
          mapPistonJudgeResultsToScoreBoardFormat(visibleResult),
        );
      }

      subtaskResult.push({
        hidden: hiddenStatus,
        visible: visibleStatus,
      });
    }
    updatedScoreboard[problemID] = {
      subtasks: subtaskResult,
    };
  }

  return updatedScoreboard;
}


function updatePistonJudgeResultToScoreBoardFormat(
  pistonSubtaskReply: JudgeResultSocreBoard,
  originalScoreboard: ScoreBoardFormat,
): ScoreBoardFormat {
  let updatedScoreboard: ScoreBoardFormat = { ...originalScoreboard };

  for (let problemID in pistonSubtaskReply) {
    let subtaskReplies = pistonSubtaskReply[problemID];
    let subtaskResult = [];

    for (let subtaskReply of subtaskReplies) {
      let hiddenStatus: TestCaseRecord[] = [];
      let visibleStatus: TestCaseRecord[] = [];
      for (let hiddenResult of subtaskReply.hidden) {
        hiddenStatus.push(
          mapPistonJudgeResultsToScoreBoardFormat(hiddenResult),
        );
      }
      for (let visibleResult of subtaskReply.visible) {
        visibleStatus.push(
          mapPistonJudgeResultsToScoreBoardFormat(visibleResult),
        );
      }

      subtaskResult.push({
        hidden: hiddenStatus,
        visible: visibleStatus,
      });
    }
    const existing = updatedScoreboard[problemID];
    updatedScoreboard[problemID] = {
      ...(existing ?? ({} as PuzzleResultPayload)),
      subtasks: subtaskResult,
    };
  }

  return updatedScoreboard;
}

function updateClientJudgeResultToScoreBoardFormat(
  clientResults: ClientResultFormat,
  originalScoreboard: ScoreBoardFormat,
): ScoreBoardFormat {
  let updatedScoreboard: ScoreBoardFormat = { ...originalScoreboard };
  for (let problemID in clientResults) {
    let testCaseRecords = clientResults[problemID];
    let subtaskResult = [];

    for (let subtasks of testCaseRecords) {
      let hiddenStatus: TestCaseRecord[] = [];
      let visibleStatus: TestCaseRecord[] = [];
      for (let hiddenResult of subtasks.hidden) {
        hiddenStatus.push(
          mapClientJudgeResultsToScoreBoardFormat(hiddenResult),
        );
      }
      for (let visibleResult of subtasks.visible) {
        visibleStatus.push(
          mapClientJudgeResultsToScoreBoardFormat(visibleResult),
        );
      }
      subtaskResult.push({
        hidden: hiddenStatus,
        visible: visibleStatus,
      });
    }
    const existing = updatedScoreboard[problemID];
    updatedScoreboard[problemID] = {
      ...(existing ?? ({} as PuzzleResultPayload)),
      subtasks: subtaskResult,
    };
  }

  return updatedScoreboard;
}

export {
  updatePistonJudgeResultToScoreBoardFormat as updatePistonSubtaskReplyToScoreBoardFormat,
  updateClientJudgeResultToScoreBoardFormat,
  overwriteScoreBoardWithPistonResults,
};
