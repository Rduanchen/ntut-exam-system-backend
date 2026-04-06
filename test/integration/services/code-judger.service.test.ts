import { describe, it, expect, beforeAll, vi } from "vitest";
import { pistonJudger } from "piston-judger";
import {
  getJudgeRequest,
  judgePuzzle,
} from "../../../src/service/code-judger.service";
import { ExamConfig, SubTask } from "../../../src/schemas/config.schemas";
import { Puzzle } from "../../../src/types/config.type";

// 這個測試需要 Piston Judger 服務運行
// 設置環境變數 TEST_WITH_PISTON=true 來啟用這些測試
const shouldRunPistonTests = process.env.TEST_WITH_PISTON === "true";

describe.skipIf(!shouldRunPistonTests)(
  "Code Judger Service - Integration Tests with Piston",
  () => {
    beforeAll(() => {
      if (!shouldRunPistonTests) {
        console.log(
          "⏭️  跳過 Piston 集成測試。設置 TEST_WITH_PISTON=true 來啟用。",
        );
      }
    });

    describe("getJudgeRequest", () => {
      it("應該生成正確的判題請求配置", () => {
        const config: ExamConfig = {
          testTitle: "測試考試",
          description: "這是一個測試考試",
          judgerSettings: {
            timeLimit: 5000,
            memoryLimit: 51200,
          },
          accessibleUsers: [],
          puzzles: [],
        };

        const puzzle: Puzzle = {
          title: "測試題目",
          language: "Python",
          timeLimit: 3000,
          memoryLimit: 102400,
          compareMode: "strict",
          subtasks: [],
        };

        const request = getJudgeRequest(config, puzzle);

        expect(request.language).toBe("python3");
        expect(request.run_timeout).toBe(3000);
        expect(request.run_memory_limit).toBe(102400);
        expect(request.compare_mode).toBe("strict");
      });

      it("應該使用預設值當題目未指定限制時", () => {
        const config: ExamConfig = {
          testTitle: "測試考試",
          description: "描述",
          judgerSettings: {
            timeLimit: 5000,
            memoryLimit: 51200,
          },
          accessibleUsers: [],
          puzzles: [],
        };

        const puzzle: Puzzle = {
          title: "測試題目2",
          language: "Cpp",
          subtasks: [],
        };

        const request = getJudgeRequest(config, puzzle);

        expect(request.language).toBe("gcc");
        expect(request.run_timeout).toBe(5000);
        expect(request.run_memory_limit).toBe(51200);
      });
    });

    describe("judgePuzzle - 需要真實的 Piston 服務", () => {
      it("應該正確判定 AC (Accepted) 的程式碼", async () => {
        const subTasks: SubTask[] = [
          {
            title: "子任務 1",
            visible: [
              { input: "1 2", output: "3" },
              { input: "5 10", output: "15" },
            ],
            hidden: [{ input: "100 200", output: "300" }],
          },
        ];

        const request = {
          language: "python3",
          version: "3.12.0",
          run_timeout: 5000,
          run_memory_limit: 51200,
          compare_mode: "loose" as const,
        };

        const correctCode = `a, b = map(int, input().split())
print(a + b)`;

        const results = await judgePuzzle(subTasks, request, correctCode);

        expect(results).toHaveLength(1);
        expect(results[0].visible).toHaveLength(2);
        expect(results[0].hidden).toHaveLength(1);
        expect(results[0].visible[0].status).toBe("AC");
        expect(results[0].visible[1].status).toBe("AC");
        expect(results[0].hidden[0].status).toBe("AC");
      }, 30000); // 增加超時時間因為需要連接外部服務

      it("應該正確判定 WA (Wrong Answer) 的程式碼", async () => {
        const subTasks: SubTask[] = [
          {
            title: "子任務 1",
            visible: [{ input: "1 2", output: "3" }],
            hidden: [],
          },
        ];

        const request = {
          language: "python3",
          version: "3.12.0",
          run_timeout: 5000,
          run_memory_limit: 51200,
          compare_mode: "loose" as const,
        };

        const wrongCode = `a, b = map(int, input().split())
print(a * b)  # 錯誤：應該是加法不是乘法`;

        const results = await judgePuzzle(subTasks, request, wrongCode);

        expect(results).toHaveLength(1);
        expect(results[0].visible[0].status).toBe("WA");
      }, 30000);

      it("應該正確處理多個子任務", async () => {
        const subTasks: SubTask[] = [
          {
            title: "子任務 1 - 小數據",
            visible: [{ input: "1 1", output: "2" }],
            hidden: [{ input: "2 2", output: "4" }],
          },
          {
            title: "子任務 2 - 大數據",
            visible: [{ input: "1000 2000", output: "3000" }],
            hidden: [{ input: "5000 5000", output: "10000" }],
          },
        ];

        const request = {
          language: "python3",
          version: "3.12.0",
          run_timeout: 5000,
          run_memory_limit: 51200,
          compare_mode: "loose" as const,
        };

        const correctCode = `a, b = map(int, input().split())
print(a + b)`;

        const results = await judgePuzzle(subTasks, request, correctCode);

        expect(results).toHaveLength(2);
        expect(results[0].title).toBe("子任務 1 - 小數據");
        expect(results[1].title).toBe("子任務 2 - 大數據");
        results.forEach((subtaskResult) => {
          subtaskResult.visible.forEach((testCase) => {
            expect(testCase.status).toBe("AC");
          });
          subtaskResult.hidden.forEach((testCase) => {
            expect(testCase.status).toBe("AC");
          });
        });
      }, 30000);

      it("應該處理編譯錯誤", async () => {
        const subTasks: SubTask[] = [
          {
            title: "子任務 1",
            visible: [{ input: "1 2", output: "3" }],
            hidden: [],
          },
        ];

        const request = {
          language: "python3",
          version: "3.12.0",
          run_timeout: 5000,
          run_memory_limit: 51200,
          compare_mode: "loose" as const,
        };

        const brokenCode = `this is not valid python code!@#$%`;

        const results = await judgePuzzle(subTasks, request, brokenCode);

        expect(results).toHaveLength(1);
        // CE (Compilation Error) 或 RE (Runtime Error)
        expect(["CE", "RE"]).toContain(results[0].visible[0].status);
      }, 30000);
    });
  },
);

// Mock 版本的 Piston 測試（不需要真實服務）
describe("Code Judger Service - Unit Tests with Mock", () => {
  describe("getJudgeRequest", () => {
    it("應該正確處理 C 語言", () => {
      const config: ExamConfig = {
        testTitle: "測試考試",
        description: "描述",
        judgerSettings: {
          timeLimit: 5000,
          memoryLimit: 51200,
        },
        accessibleUsers: [],
        puzzles: [],
      };

      const puzzle: Puzzle = {
        title: "C 題目",
        language: "C",
        subtasks: [],
      };

      const request = getJudgeRequest(config, puzzle);

      expect(request.language).toBe("gcc");
      expect(request.version).toBe("10.2.0");
    });
  });
});
