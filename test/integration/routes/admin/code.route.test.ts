import { describe, it, expect, vi, beforeAll } from "vitest";
import express, { Express } from "express";
import request from "supertest";

import codeRouter from "../../../../src/routes/admin/code.route";
import { errorMiddleware } from "../../../../src/middlewares/error-handler";

// We mock dependencies so this test stays deterministic and doesn't require real zip files or Piston.
vi.mock("../../../../src/service/code-storage", async () => {
    return {
        default: {
            listFilesInZip: vi.fn(async () => ["0.cpp"]),
            getFileNameWithoutExt: vi.fn((p: string) => p.split(".")[0]),
            unzipGetFileAsString: vi.fn(async () => "int main(){return 0;}")
        },
    };
});

vi.mock("../../../../src/service/code-judger.service", async () => {
    return {
        judgeAllSubmittedPuzzles: vi.fn(async () => ({})),
    };
});

vi.mock("../../../../src/service/sys-settings.service", async () => {
    return {
        default: {
            getConfig: vi.fn(async () => ({
                puzzles: [{ language: "cpp", subtasks: [] }],
                globalSpecialRules: [
                    { id: "r1", type: "use", constraint: "MUST_HAVE", message: "must include main", params: { target: "main" } },
                ],
            })),
        },
    };
});

vi.mock("../../../../src/utils/init-db.util", async () => {
    return {
        getDefaultScoreboard: vi.fn(() => ({ "0": { subtasks: [], specialRuleResults: [] } })),
    };
});

vi.mock("../../../../src/utils/judger.util", async () => {
    return {
        overwriteScoreBoardWithPistonResults: vi.fn(() => ({ "0": { subtasks: [], specialRuleResults: [] } })),
    };
});

vi.mock("../../../../src/service/scoreboard.service", async () => {
    return {
        default: {
            updateStudentScore: vi.fn(async () => undefined),
            getAllScores: vi.fn(async () => []),
        },
    };
});

vi.mock("../../../../src/socket/SocketService", async () => {
    return {
        SocketService: {
            triggerScoreUpdateEvent: vi.fn(),
        },
    };
});

vi.mock("node:fs/promises", async () => {
    return {
        default: {
            access: vi.fn(async () => undefined),
        },
    };
});

describe("Admin Code Route - Integration", () => {
    let app: Express;

    beforeAll(async () => {
        app = express();
        app.use(express.json());
        app.use("/admin/code", codeRouter);
        app.use(errorMiddleware);
    });

    it("POST /admin/code/judge returns scoreboard with specialRuleResults", async () => {
        const res = await request(app)
            .post("/admin/code/judge")
            .send({ studentID: "A123" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.result["0"]).toBeTruthy();

        const puzzleResult = res.body.data.result["0"];
        // Canonical shape: always the wrapper payload.
        expect(puzzleResult.specialRuleResults).toBeDefined();
        expect(Array.isArray(puzzleResult.specialRuleResults)).toBe(true);
        expect(puzzleResult.specialRuleResults[0]).toMatchObject({
            ruleId: "r1",
            passed: true,
        });
    });
});
