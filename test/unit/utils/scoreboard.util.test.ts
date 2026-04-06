import { describe, it, expect } from "vitest";
import { getPassedPuzzleAmount } from "../../../src/utils/scoreboard.util";
import { ScoreBoardFormat } from "../../../src/types/scoreboard.type";
import { StatusCode } from "piston-judger";

describe("Scoreboard Util - Unit Tests", () => {
  describe("getPassedPuzzleAmount", () => {
    it("應該正確計算完全通過的題目數量", () => {
      const scoreboard: ScoreBoardFormat = {
        problem1: {
          subtasks: [
            {
              hidden: [
                {
                  status: StatusCode.AC,
                  userOutput: "1",
                  expectedOutput: "1",
                  time: "10",
                },
                {
                  status: StatusCode.AC,
                  userOutput: "2",
                  expectedOutput: "2",
                  time: "12",
                },
              ],
              visible: [
                {
                  status: StatusCode.AC,
                  userOutput: "3",
                  expectedOutput: "3",
                  time: "15",
                },
              ],
            },
          ],
        },
        problem2: {
          subtasks: [
            {
              hidden: [
                {
                  status: StatusCode.AC,
                  userOutput: "4",
                  expectedOutput: "4",
                  time: "20",
                },
              ],
              visible: [
                {
                  status: StatusCode.AC,
                  userOutput: "5",
                  expectedOutput: "5",
                  time: "18",
                },
              ],
            },
          ],
        },
      };

      const result = getPassedPuzzleAmount(scoreboard);

      expect(result.passedPuzzleAmount).toBe(2);
      expect(result.puzzleAmount).toBe(2);
      expect(result.subtaskAmount).toBe(2);
      expect(result.passedSubtaskAmount).toBe(2);
    });

    it("應該正確處理部分通過的情況", () => {
      const scoreboard: ScoreBoardFormat = {
        problem1: {
          subtasks: [
            {
              hidden: [
                {
                  status: StatusCode.AC,
                  userOutput: "1",
                  expectedOutput: "1",
                  time: "10",
                },
              ],
              visible: [
                {
                  status: StatusCode.WA,
                  userOutput: "2",
                  expectedOutput: "3",
                  time: "15",
                },
              ],
            },
          ],
        },
      };

      const result = getPassedPuzzleAmount(scoreboard);

      expect(result.passedPuzzleAmount).toBe(0);
      expect(result.puzzleAmount).toBe(1);
      expect(result.subtaskAmount).toBe(1);
      expect(result.passedSubtaskAmount).toBe(0);
    });

    it("應該正確處理多個子任務", () => {
      const scoreboard: ScoreBoardFormat = {
        problem1: {
          subtasks: [
            {
              hidden: [
                {
                  status: StatusCode.AC,
                  userOutput: "1",
                  expectedOutput: "1",
                  time: "10",
                },
              ],
              visible: [
                {
                  status: StatusCode.AC,
                  userOutput: "2",
                  expectedOutput: "2",
                  time: "12",
                },
              ],
            },
            {
              hidden: [
                {
                  status: StatusCode.WA,
                  userOutput: "3",
                  expectedOutput: "4",
                  time: "15",
                },
              ],
              visible: [
                {
                  status: StatusCode.AC,
                  userOutput: "5",
                  expectedOutput: "5",
                  time: "18",
                },
              ],
            },
          ],
        },
      };

      const result = getPassedPuzzleAmount(scoreboard);

      expect(result.passedPuzzleAmount).toBe(0);
      expect(result.puzzleAmount).toBe(1);
      expect(result.subtaskAmount).toBe(2);
      expect(result.passedSubtaskAmount).toBe(1);
    });

    it("應該處理空的 scoreboard", () => {
      const scoreboard: ScoreBoardFormat = {};

      const result = getPassedPuzzleAmount(scoreboard);

      expect(result.passedPuzzleAmount).toBe(0);
      expect(result.puzzleAmount).toBe(0);
      expect(result.subtaskAmount).toBe(0);
      expect(result.passedSubtaskAmount).toBe(0);
    });

    it("應該正確處理混合狀態的多題目", () => {
      const scoreboard: ScoreBoardFormat = {
        problem1: {
          subtasks: [
            {
              hidden: [
                {
                  status: StatusCode.AC,
                  userOutput: "1",
                  expectedOutput: "1",
                  time: "10",
                },
              ],
              visible: [
                {
                  status: StatusCode.AC,
                  userOutput: "2",
                  expectedOutput: "2",
                  time: "12",
                },
              ],
            },
          ],
        },
        problem2: {
          subtasks: [
            {
              hidden: [
                {
                  status: StatusCode.TLE,
                  userOutput: "",
                  expectedOutput: "3",
                  time: "5000",
                },
              ],
              visible: [
                {
                  status: StatusCode.AC,
                  userOutput: "4",
                  expectedOutput: "4",
                  time: "15",
                },
              ],
            },
          ],
        },
        problem3: {
          subtasks: [
            {
              hidden: [
                {
                  status: StatusCode.AC,
                  userOutput: "5",
                  expectedOutput: "5",
                  time: "20",
                },
              ],
              visible: [
                {
                  status: StatusCode.AC,
                  userOutput: "6",
                  expectedOutput: "6",
                  time: "22",
                },
              ],
            },
          ],
        },
      };

      const result = getPassedPuzzleAmount(scoreboard);

      expect(result.passedPuzzleAmount).toBe(2);
      expect(result.puzzleAmount).toBe(3);
      expect(result.subtaskAmount).toBe(3);
      expect(result.passedSubtaskAmount).toBe(2);
    });
  });
});
