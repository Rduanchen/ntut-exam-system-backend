import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import express, { Express } from "express";
import request from "supertest";

import codeRouter from "../../../../src/routes/admin/code.route";
import { errorMiddleware } from "../../../../src/middlewares/error-handler";
import { ScoreBoard } from "../../../../src/models/ScoreBoard";
import {
    createTestDatabase,
    closeTestDatabase,
    clearTestDatabase,
} from "../../../setup/test-database";

// Mock only the external-ish dependencies so we can still verify DB persistence.
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

// Avoid requiring a live socket server during tests
vi.mock("../../../../src/socket/SocketService", async () => {
    return {
        SocketService: {
            triggerScoreUpdateEvent: vi.fn(),
        },
    };
});

// Make the "submission zip exists" check pass.
vi.mock("node:fs/promises", async () => {
    return {
        default: {
            access: vi.fn(async () => undefined),
        },
    };
});

describe("Admin Code Route - Persistence (specialRuleResults)", () => {
    let app: Express;

    beforeAll(async () => {
        await createTestDatabase();

        app = express();
        app.use(express.json());
        app.use("/admin/code", codeRouter);
        app.use(errorMiddleware);
    });

    afterAll(async () => {
        await closeTestDatabase();
    });

    beforeEach(async () => {
        await clearTestDatabase();

        // Seed the scoreboard row so updateStudentScore has something to update.
        await ScoreBoard.create({
            student_ID: "A123",
            student_name: "Test Student",
            puzzle_results: {},
        } as any);
    });

    it("POST /admin/code/judge persists specialRuleResults into ScoreBoard.puzzle_results", async () => {
        const res = await request(app)
            .post("/admin/code/judge")
            .send({ studentID: "A123" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const updated = await ScoreBoard.findOne({ where: { student_ID: "A123" } });
        expect(updated).toBeTruthy();

        const puzzle0 = (updated as any)?.puzzle_results?.["0"];
        expect(puzzle0).toBeTruthy();

        // Persistence contract: specialRuleResults exists and contains the evaluated result.
        // (HTTP response shape is covered by code.route.test.ts)
        expect(puzzle0).toMatchObject({
            specialRuleResults: [
                expect.objectContaining({
                    ruleId: "r1",
                    passed: true,
                }),
            ],
        });
    });
});
