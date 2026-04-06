import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { ScoreBoardService } from "../../../src/service/scoreboard.service";
import { ScoreBoard } from "../../../src/models/ScoreBoard";
import {
  createTestDatabase,
  closeTestDatabase,
  clearTestDatabase,
} from "../../setup/test-database";
import { ScoreBoardFormat } from "../../../src/types/scoreboard.type";
import { StatusCode } from "piston-judger";

describe("ScoreBoard Service - Unit Tests", () => {
  let scoreBoardService: ScoreBoardService;

  beforeAll(async () => {
    await createTestDatabase();
    scoreBoardService = new ScoreBoardService();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe("updateStudentScore", () => {
    it("應該成功更新學生分數", async () => {
      // 先創建一個學生記錄
      await ScoreBoard.create({
        student_ID: "A12345678",
        student_name: "Alice",
        passed_puzzle_amount: 0,
        puzzle_amount: 0,
        subtask_amount: 0,
        passed_subtask_amount: 0,
        last_submit_time: new Date(),
        puzzle_results: {},
      });

      const testResults: ScoreBoardFormat = {
        problem1: [
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
      };

      const result = await scoreBoardService.updateStudentScore(
        testResults,
        "A12345678",
      );

      expect(result).toBe(true);

      const updatedScore = await ScoreBoard.findOne({
        where: { student_ID: "A12345678" },
      });

      expect(updatedScore).not.toBeNull();
      expect(updatedScore?.passed_puzzle_amount).toBe(1);
      expect(updatedScore?.puzzle_amount).toBe(1);
    });

    it("應該在學生不存在時返回 false", async () => {
      const testResults: ScoreBoardFormat = {};

      const result = await scoreBoardService.updateStudentScore(
        testResults,
        "NONEXISTENT",
      );

      expect(result).toBe(false);
    });

    it("應該更新最後提交時間", async () => {
      const oldDate = new Date("2024-01-01");
      await ScoreBoard.create({
        student_ID: "B98765432",
        student_name: "Bob",
        passed_puzzle_amount: 0,
        puzzle_amount: 0,
        subtask_amount: 0,
        passed_subtask_amount: 0,
        last_submit_time: oldDate,
        puzzle_results: {},
      });

      const testResults: ScoreBoardFormat = {};

      await scoreBoardService.updateStudentScore(testResults, "B98765432");

      const updatedScore = await ScoreBoard.findOne({
        where: { student_ID: "B98765432" },
      });

      expect(updatedScore).not.toBeNull();
      if (!updatedScore || !updatedScore.last_submit_time) {
        throw new Error("Expected updatedScore.last_submit_time to be set");
      }
      expect(updatedScore.last_submit_time.getTime()).toBeGreaterThan(
        oldDate.getTime(),
      );
    });
  });

  describe("getScoreByStudentId", () => {
    it("應該成功取得學生分數", async () => {
      await ScoreBoard.create({
        student_ID: "C11111111",
        student_name: "Carol",
        passed_puzzle_amount: 5,
        puzzle_amount: 10,
        subtask_amount: 20,
        passed_subtask_amount: 15,
        last_submit_time: new Date(),
        puzzle_results: {},
      });

      const result = await scoreBoardService.getScoreByStudentId("C11111111");

      expect(result).not.toBeNull();
      expect(result?.student_ID).toBe("C11111111");
      expect(result?.passed_puzzle_amount).toBe(5);
      expect(result?.puzzle_amount).toBe(10);
    });

    it("應該在學生不存在時返回 null", async () => {
      const result = await scoreBoardService.getScoreByStudentId("NONEXISTENT");

      expect(result).toBeNull();
    });
  });

  describe("getAllScores", () => {
    it("應該取得所有學生分數並按學號排序", async () => {
      await ScoreBoard.bulkCreate([
        {
          student_ID: "C33333333",
          student_name: "Cathy",
          passed_puzzle_amount: 3,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 10,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
        {
          student_ID: "A11111111",
          student_name: "Amy",
          passed_puzzle_amount: 5,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 15,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
        {
          student_ID: "B22222222",
          student_name: "Ben",
          passed_puzzle_amount: 2,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 8,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
      ]);

      const results = await scoreBoardService.getAllScores();

      expect(results).toHaveLength(3);
      expect(results[0].student_ID).toBe("A11111111");
      expect(results[1].student_ID).toBe("B22222222");
      expect(results[2].student_ID).toBe("C33333333");
    });

    it("應該在沒有資料時返回空陣列", async () => {
      const results = await scoreBoardService.getAllScores();

      expect(results).toHaveLength(0);
    });
  });

  describe("isStudentExist", () => {
    it("應該在學生存在時返回 true", async () => {
      await ScoreBoard.create({
        student_ID: "D44444444",
        student_name: "Dan",
        passed_puzzle_amount: 0,
        puzzle_amount: 0,
        subtask_amount: 0,
        passed_subtask_amount: 0,
        last_submit_time: new Date(),
        puzzle_results: {},
      });

      const result = await scoreBoardService.isStudentExist("D44444444");

      expect(result).toBe(true);
    });

    it("應該在學生不存在時返回 false", async () => {
      const result = await scoreBoardService.isStudentExist("NONEXISTENT");

      expect(result).toBe(false);
    });
  });
});
