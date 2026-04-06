import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import express, { Express } from "express";
import request from "supertest";
import scoreboardRouter from "../../../../src/routes/admin/scoreboard.route";
import { ScoreBoard } from "../../../../src/models/ScoreBoard";
import {
  createTestDatabase,
  closeTestDatabase,
  clearTestDatabase,
} from "../../../setup/test-database";
import {
  ErrorHandler,
  errorMiddleware,
} from "../../../../src/middlewares/error-handler";

// Avoid requiring a live socket server during tests
import { vi } from "vitest";

vi.mock("../../../../src/socket/SocketService", async () => {
  return {
    SocketService: {
      triggerScoreUpdateEvent: vi.fn(),
    },
  };
});

describe("Scoreboard Route - Integration Tests", () => {
  let app: Express;

  beforeAll(async () => {
    await createTestDatabase();

    // 建立測試用的 Express App
    app = express();
    app.use(express.json());
    app.use("/admin/scoreboard", scoreboardRouter);
    app.use(errorMiddleware);
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe("GET /admin/scoreboard", () => {
    it("應該成功取得所有學生分數", async () => {
      // 建立測試資料
      await ScoreBoard.bulkCreate([
        {
          student_ID: "A12345678",
          student_name: "Test Student A",
          passed_puzzle_amount: 5,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 15,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
        {
          student_ID: "B98765432",
          student_name: "Test Student B",
          passed_puzzle_amount: 3,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 10,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
      ]);

      const response = await request(app).get("/admin/scoreboard");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scores).toHaveLength(2);
      expect(response.body.data.scores[0].student_ID).toBe("A12345678");
      expect(response.body.data.scores[1].student_ID).toBe("B98765432");
    });

    it("應該在沒有資料時返回空陣列", async () => {
      const response = await request(app).get("/admin/scoreboard");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scores).toHaveLength(0);
    });
  });

  describe("GET /admin/scoreboard/student", () => {
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

      const response = await request(app)
        .get("/admin/scoreboard/student")
        .query({ studentID: "C11111111" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.score.student_ID).toBe("C11111111");
      expect(response.body.data.score.passed_puzzle_amount).toBe(7);
    });

    it("應該在學生不存在時返回 404", async () => {
      const response = await request(app)
        .get("/admin/scoreboard/student")
        .query({ studentID: "NONEXISTENT" });

      expect(response.status).toBe(404);
    });

    it("應該在缺少 studentID 時返回 400", async () => {
      const response = await request(app).get("/admin/scoreboard/student");

      expect(response.status).toBe(400);
    });
  });

  describe("POST /admin/scoreboard/broadcast", () => {
    it("應該成功廣播分數更新", async () => {
      await ScoreBoard.create({
        student_ID: "D22222222",
        student_name: "Test Student",
        passed_puzzle_amount: 2,
        puzzle_amount: 10,
        subtask_amount: 20,
        passed_subtask_amount: 8,
        last_submit_time: new Date(),
        puzzle_results: {},
      });

      const response = await request(app).post("/admin/scoreboard/broadcast");
      console.log(response.body);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Score update broadcast sent successfully",
      );
      expect(response.body.data.scores).toBeDefined();
    });
  });

  describe("分數排序測試", () => {
    it("應該按學號升冪排序返回所有分數", async () => {
      await ScoreBoard.bulkCreate([
        {
          student_ID: "Z99999999",
          student_name: "Test Student",
          passed_puzzle_amount: 1,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 5,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
        {
          student_ID: "A11111111",
          student_name: "Test Student",
          passed_puzzle_amount: 10,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 20,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
        {
          student_ID: "M55555555",
          student_name: "Test Student",
          passed_puzzle_amount: 5,
          puzzle_amount: 10,
          subtask_amount: 20,
          passed_subtask_amount: 12,
          last_submit_time: new Date(),
          puzzle_results: {},
        },
      ]);

      const response = await request(app).get("/admin/scoreboard");

      expect(response.status).toBe(200);
      expect(response.body.data.scores).toHaveLength(3);
      expect(response.body.data.scores[0].student_ID).toBe("A11111111");
      expect(response.body.data.scores[1].student_ID).toBe("M55555555");
      expect(response.body.data.scores[2].student_ID).toBe("Z99999999");
    });
  });
});
