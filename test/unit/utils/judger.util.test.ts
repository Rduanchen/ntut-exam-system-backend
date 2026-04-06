import { describe, it, expect } from "vitest";
import {
  updatePistonSubtaskReplyToScoreBoardFormat,
  updateClientJudgeResultToScoreBoardFormat,
} from "../../../src/utils/judger.util";
import {
  ScoreBoardFormat,
  JudgeResultSocreBoard,
  ClientResultFormat,
} from "../../../src/types/scoreboard.type";
import { mockPistonJudgeResult } from "../../mocks/piston.mock";
import { StatusCode } from "piston-judger";

describe("Judger Util - Unit Tests", () => {
  describe("updatePistonSubtaskReplyToScoreBoardFormat", () => {
    it("應該正確將 Piston 結果轉換為 ScoreBoard 格式", () => {
      const originalScoreboard: ScoreBoardFormat = {};
      const pistonReply: JudgeResultSocreBoard = {
        problem1: [
          {
            title: "Problem 1",
            hidden: [mockPistonJudgeResult("AC"), mockPistonJudgeResult("AC")],
            visible: [mockPistonJudgeResult("AC")],
          },
        ],
      };

      const result = updatePistonSubtaskReplyToScoreBoardFormat(
        pistonReply,
        originalScoreboard,
      );

      expect(result.problem1).toBeDefined();
      expect(result.problem1.subtasks[0].hidden).toHaveLength(2);
      expect(result.problem1.subtasks[0].visible).toHaveLength(1);
      expect(result.problem1.subtasks[0].hidden[0].status).toBe("AC");
    });

    it("應該正確處理 WA 狀態", () => {
      const originalScoreboard: ScoreBoardFormat = {};
      const pistonReply: JudgeResultSocreBoard = {
        problem1: [
          {
            title: "Problem 1",
            hidden: [mockPistonJudgeResult("WA")],
            visible: [mockPistonJudgeResult("AC")],
          },
        ],
      };

      const result = updatePistonSubtaskReplyToScoreBoardFormat(
        pistonReply,
        originalScoreboard,
      );

      expect(result.problem1.subtasks[0].hidden[0].status).toBe("WA");
      expect(result.problem1.subtasks[0].visible[0].status).toBe("AC");
    });

    it("應該保留原有的 scoreboard 並更新指定問題", () => {
      const originalScoreboard: ScoreBoardFormat = {
        problem0: {
          subtasks: [
            {
              hidden: [
                {
                  status: StatusCode.AC,
                  userOutput: "old",
                  expectedOutput: "old",
                  time: "50",
                },
              ],
              visible: [],
            },
          ],
        },
      };
      const pistonReply: JudgeResultSocreBoard = {
        problem1: [
          {
            title: "Problem 1",
            hidden: [mockPistonJudgeResult("AC")],
            visible: [],
          },
        ],
      };

      const result = updatePistonSubtaskReplyToScoreBoardFormat(
        pistonReply,
        originalScoreboard,
      );

      expect(result.problem0).toBeDefined();
      expect(result.problem1).toBeDefined();
      expect(result.problem0.subtasks[0].hidden[0].userOutput).toBe("old");
    });

    it("應該正確處理多個子任務", () => {
      const originalScoreboard: ScoreBoardFormat = {};
      const pistonReply: JudgeResultSocreBoard = {
        problem1: [
          {
            title: "Problem 1",
            hidden: [mockPistonJudgeResult("AC")],
            visible: [mockPistonJudgeResult("AC")],
          },
          {
            title: "Problem 1",
            hidden: [mockPistonJudgeResult("WA")],
            visible: [mockPistonJudgeResult("TLE")],
          },
        ],
      };

      const result = updatePistonSubtaskReplyToScoreBoardFormat(
        pistonReply,
        originalScoreboard,
      );

      expect(result.problem1.subtasks).toHaveLength(2);
      expect(result.problem1.subtasks[0].hidden[0].status).toBe("AC");
      expect(result.problem1.subtasks[1].hidden[0].status).toBe("WA");
      expect(result.problem1.subtasks[1].visible[0].status).toBe("TLE");
    });
  });

  describe("updateClientJudgeResultToScoreBoardFormat", () => {
    it("應該正確將 Client 結果轉換為 ScoreBoard 格式", () => {
      const originalScoreboard: ScoreBoardFormat = {};
      const clientResults: ClientResultFormat = {
        problem1: [
          {
            hidden: [
              {
                statusCode: StatusCode.AC,
                input: "1 2",
                expectingOutput: "3",
                userOutput: "3",
                time: "10",
              },
            ],
            visible: [
              {
                statusCode: StatusCode.AC,
                input: "5 10",
                expectingOutput: "15",
                userOutput: "15",
                time: "12",
              },
            ],
          },
        ],
      };

      const result = updateClientJudgeResultToScoreBoardFormat(
        clientResults,
        originalScoreboard,
      );

      expect(result.problem1).toBeDefined();
      expect(result.problem1.subtasks[0].hidden[0].status).toBe(StatusCode.AC);
      expect(result.problem1.subtasks[0].hidden[0].userOutput).toBe("3");
      expect(result.problem1.subtasks[0].visible[0].status).toBe(StatusCode.AC);
    });

    it("應該正確處理 WA 狀態", () => {
      const originalScoreboard: ScoreBoardFormat = {};
      const clientResults: ClientResultFormat = {
        problem1: [
          {
            hidden: [
              {
                statusCode: StatusCode.WA,
                input: "1 2",
                expectingOutput: "3",
                userOutput: "wrong",
                time: "10",
              },
            ],
            visible: [],
          },
        ],
      };

      const result = updateClientJudgeResultToScoreBoardFormat(
        clientResults,
        originalScoreboard,
      );

      expect(result.problem1.subtasks[0].hidden[0].status).toBe(StatusCode.WA);
      expect(result.problem1.subtasks[0].hidden[0].userOutput).toBe("wrong");
      expect(result.problem1.subtasks[0].hidden[0].expectedOutput).toBe("3");
    });

    it("應該保留原有的 scoreboard 並更新指定問題", () => {
      const originalScoreboard: ScoreBoardFormat = {
        problem0: {
          subtasks: [
            {
              hidden: [
                {
                  status: StatusCode.AC,
                  userOutput: "preserved",
                  expectedOutput: "preserved",
                  time: "10",
                },
              ],
              visible: [],
            },
          ],
        },
      };
      const clientResults: ClientResultFormat = {
        problem1: [
          {
            hidden: [
              {
                statusCode: StatusCode.AC,
                input: "1 2",
                expectingOutput: "3",
                userOutput: "new",
                time: "10",
              },
            ],
            visible: [],
          },
        ],
      };

      const result = updateClientJudgeResultToScoreBoardFormat(
        clientResults,
        originalScoreboard,
      );

      expect(result.problem0).toBeDefined();
      expect(result.problem1).toBeDefined();
      expect(result.problem0.subtasks[0].hidden[0].userOutput).toBe("preserved");
      expect(result.problem1.subtasks[0].hidden[0].userOutput).toBe("new");
    });
  });
});
