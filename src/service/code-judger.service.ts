import { pistonJudger, CompareMode, JudgeResult } from "piston-judger";
import JudgerConfig from "../constants/piston.config";
import { ExecutionRequest, PistonSubtaskReply } from "../types/judger.type";
import { ErrorHandler } from "../middlewares/error-handler";
import systemSettingsService from "./sys-settings.service";
import codeStorage from "./code-storage";
import { getZipFilePath, normalizeFilePath } from "../utils/file-operator.util";
import { ExamConfig, SubTask, TestCase } from "../schemas/config.schemas";
import {
  ScoreBoardFormat,
  JudgeResultSocreBoard,
  TestCaseRecord,
} from "../types/scoreboard.type";
import { Puzzle } from "../types/config.type.js";
import pLimit from "p-limit";
import { Index } from "sequelize-typescript";
import { get } from "axios";

const MAX_CONCURRENT_JUDGES = 20;

const client = pistonJudger({ server: JudgerConfig.url });

function getCorrectPistonLanguage(language: string): string {
  return (
    JudgerConfig.languages[language as keyof typeof JudgerConfig.languages]
      ?.name || language
  );
}
export function getJudgeRequest(
  config: ExamConfig,
  puzzle: Puzzle,
): ExecutionRequest {
  return {
    language: getCorrectPistonLanguage(puzzle.language),
    version: JudgerConfig.languages[puzzle.language].version,
    run_timeout: puzzle.timeLimit || config.judgerSettings.timeLimit,
    run_memory_limit:
      (puzzle.memoryLimit || config.judgerSettings.memoryLimit) * 1000, // Convert byte to kilobyte
    compare_mode: puzzle.compareMode || "loose",
  };
}

function getSubTasks(config: ExamConfig, questionIndex: number): SubTask[] {
  const puzzles = config.puzzles;
  return puzzles[questionIndex].subtasks as SubTask[];
}

function getPuzzles(config: ExamConfig, questionIndex: number): Puzzle {
  const puzzles = config.puzzles;
  const puzzle: Puzzle = puzzles[questionIndex];
  return puzzle;
}

async function testOnce() {
  const result = await client.execute({
    language: "c",
    version: "10.2.0",
    stdin: "2 3",
    files: [
      {
        name: "main.c",
        content: `#include <stdio.h>
int main() {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}`,
      },
    ],
  });
  console.log("Test execute result:", result);
}

async function judgeTestCases(
  testCases: TestCase[],
  options: ExecutionRequest,
  codeString: string,
): Promise<JudgeResult[]> {
  const promises = testCases.map((tc) =>
    client
      .execute({
        ...options,
        stdin: tc.input,
        files: [
          {
            content: codeString,
          },
        ],
      })
      .then((res) => {
        return client.judge(res, {
          expectedOutput: tc.output ?? "",
          compareMode: options.compare_mode || "loose",
        });
      }),
  );

  const results = await Promise.allSettled(promises);

  return results.map((r) => {
    if (r.status === "fulfilled") {
      return r.value;
    } else {
      return {
        status: "CE",
        message:
          (r as PromiseRejectedResult).reason?.message ||
          "Failed to judge test case, internal error.",
        actualOutput: "",
      } as JudgeResult;
    }
  });
}

export async function judgePuzzle(
  subTasks: SubTask[],
  request: ExecutionRequest,
  codeString: string,
): Promise<PistonSubtaskReply[]> {
  const promises = subTasks.map(async (st) => {
    if (!Array.isArray(st.visible) || !Array.isArray(st.hidden)) {
      throw new ErrorHandler(500, "SubTask 的 visible 和 hidden 必須是陣列");
    }

    const [visibleResults, hiddenResults] = await Promise.all([
      judgeTestCases(st.visible, request, codeString),
      judgeTestCases(st.hidden, request, codeString),
    ]);

    return {
      title: st.title,
      visible: visibleResults,
      hidden: hiddenResults,
    };
  });

  return Promise.all(promises);
}

export async function judgeAllSubmittedPuzzles(
  studentID: string,
  fileNames: string[],
): Promise<JudgeResultSocreBoard> {
  if (fileNames.length === 0) return {};

  const config = await systemSettingsService.getConfig();
  if (!config) throw new ErrorHandler(500, "No system config found");

  const limit = pLimit(MAX_CONCURRENT_JUDGES);
  const judgeTasks = fileNames.map((problemID) => {
    // 使用 limit 包裝異步邏輯
    return limit(async () => {
      // 1. 讀取程式碼
      const codeString = await codeStorage.unzipGetFileAsString(
        getZipFilePath(studentID),
        problemID,
      );
      // 2. 取得題目索引與配置
      const questionIndex = codeStorage.getFileNameWithoutExt(problemID);
      const subTasks = getSubTasks(config, Number(questionIndex));
      const puzzle = getPuzzles(config, Number(questionIndex));

      // 3. 執行評測
      const result = await judgePuzzle(
        subTasks,
        getJudgeRequest(config, puzzle),
        codeString,
      );
      return { problemID, result };
    });
  });

  // 這裡的 Promise.all 會同時啟動所有 task，但 p-limit 會確保同一時間只有 15 個在跑
  const completedTasks = await Promise.all(judgeTasks);

  const allResults: JudgeResultSocreBoard = {};
  for (const task of completedTasks) {
    allResults[codeStorage.getFileNameWithoutExt(task.problemID)] = task.result;
  }
  return allResults;
}

export async function judgeAllSubmissionsForPath(
  filePath: string,
  fileNames: string[],
): Promise<JudgeResultSocreBoard> {
  if (fileNames.length === 0) return {};

  const config = await systemSettingsService.getConfig();
  if (!config) throw new ErrorHandler(500, "No system config found");

  const limit = pLimit(MAX_CONCURRENT_JUDGES);
  const judgeTasks = fileNames.map((problemID) => {
    // 使用 limit 包裝異步邏輯
    return limit(async () => {
      // 1. 讀取程式碼
      const codeString = await codeStorage.unzipGetFileAsString(
        await normalizeFilePath(filePath),
        problemID,
      );
      // 2. 取得題目索引與配置
      const questionIndex = codeStorage.getFileNameWithoutExt(problemID);
      const subTasks = getSubTasks(config, Number(questionIndex));
      const puzzle = getPuzzles(config, Number(questionIndex));

      // 3. 執行評測
      const result = await judgePuzzle(
        subTasks,
        getJudgeRequest(config, puzzle),
        codeString,
      );
      return { problemID, result };
    });
  });

  // 這裡的 Promise.all 會同時啟動所有 task，但 p-limit 會確保同一時間只有 15 個在跑
  const completedTasks = await Promise.all(judgeTasks);

  const allResults: JudgeResultSocreBoard = {};
  for (const task of completedTasks) {
    allResults[codeStorage.getFileNameWithoutExt(task.problemID)] = task.result;
  }
  return allResults;
}
