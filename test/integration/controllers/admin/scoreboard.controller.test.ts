import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import { Request, Response, NextFunction } from "express";
import * as scoreboardController from "../../../../src/controllers/admin/scoreboard.controller";
import { ScoreBoard } from "../../../../src/models/ScoreBoard";
import {
  createTestDatabase,
  closeTestDatabase,
  clearTestDatabase,
} from "../../../setup/test-database";

describe("Scoreboard Controller - Integration Tests", () => {
  beforeAll(async () => {
    await createTestDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe("getAllScores", () => {
    it("應該成功取得所有學生分數", async () => {
      // 建立測試資料
      await ScoreBoard.bulkCreate([
        {
          student_ID: "A12345678",
          student_name: "Test Student",
          passed_puzzle_amount: 5,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 15,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
        {
          student_ID: "B98765432",
          student_name: "Test Student",
          passed_puzzle_amount: 3,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 10,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
      ]);

      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await scoreboardController.getAllScores(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          scores: expect.arrayContaining([
            expect.objectContaining({ student_ID: "A12345678" }),
            expect.objectContaining({ student_ID: "B98765432" }),
          ]),
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("應該在發生錯誤時呼叫 next", async () => {
      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      // 關閉資料庫以觸發錯誤
      await closeTestDatabase();

      await scoreboardController.getAllScores(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));

      // 重新建立資料庫
      await createTestDatabase();
    });
  });

  describe("getScoreByStudentId", () => {
    it("應該成功取得指定學生的分數", async () => {
      await ScoreBoard.create({
        student_ID: "C11111111",
        student_name: "Test Student",
        passed_puzzle_amount: 7,
        puzzle_amount: 10,
        subtask_amount: 20,
        passed_subtask_amount: 18,
        last_submit_time: new Date(),
        puzzle_results: {},
      });

      const req = {
        query: { studentID: "C11111111" },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await scoreboardController.getScoreByStudentId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          score: expect.objectContaining({
            student_ID: "C11111111",
            passed_puzzle_amount: 7,
          }),
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("應該在缺少 studentID 時返回 400 錯誤", async () => {
      const req = {
        query: {},
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await scoreboardController.getScoreByStudentId(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: "Missing required parameter: studentID",
        }),
      );
    });

    it("應該在學生不存在時返回 404 錯誤", async () => {
      const req = {
        query: { studentID: "NONEXISTENT" },
      } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      await scoreboardController.getScoreByStudentId(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: "Student score not found",
        }),
      );
    });
  });

  describe("broadcastScores", () => {
    it("應該成功取得並廣播分數", async () => {
      await ScoreBoard.bulkCreate([
        {
          student_ID: "D22222222",
          student_name: "Test Student",
          passed_puzzle_amount: 2,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 8,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
      ]);

      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      // Mock SocketService
      const { SocketService } =
        await import("../../../../src/socket/SocketService");
      vi.spyOn(SocketService, "triggerScoreUpdateEvent").mockImplementation(
        () => { },
      );

      await scoreboardController.broadcastScores(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Score update broadcast sent successfully",
        data: {
          scores: expect.arrayContaining([
            expect.objectContaining({
              student_ID: "D22222222",
              student_name: "Test Student",
            }),
          ]),
        },
      });
      expect(SocketService.triggerScoreUpdateEvent).toHaveBeenCalled();
    });

    it("應該在發生錯誤時呼叫 next", async () => {
      const req = {} as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;

      // 關閉資料庫以觸發錯誤
      await closeTestDatabase();

      await scoreboardController.broadcastScores(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));

      // 重新建立資料庫
      await createTestDatabase();
    });
  });
});
