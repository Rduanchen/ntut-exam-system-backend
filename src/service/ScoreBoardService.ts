import { group } from "console";
import { ScoreBoard } from "../models/ScoreBoard";
import { combineTableNames } from "sequelize/types/utils";
import { JudgeAllResult } from "./CodeJudger";

// 定義更新分數的輸入介面
interface UpdateScoreInput {
  student_ID: string;
  score: Record<string, RunTestsResult>; // 對應資料庫的 puzzle_results
  passed_amount: number; // 對應資料庫的 passed_puzzle_amount
}

interface TestResult {
  id: string;
  correct: boolean;
  userOutput: string;
}

interface GroupResult {
  title: string;
  id: number;
  testCasesResults: TestResult[];
  testCaseAmount: number;
  correctCount: number;
}

/** 整個測試批次執行的最終結果 */
interface RunTestsResult {
  groupResults: GroupResult[];
  testCaseAmount: number;
  correctCount: number;
}

export class ScoreBoardService {
  /**
   * 1. 更新學生分數
   * 依據 student_ID 更新測資結果與通過數量，並自動更新最後提交時間
   */
  async updateStudentScore(input: UpdateScoreInput) {
    let studentID = input.student_ID;
    let studentOriginalData = await this.getScoreByStudentId(studentID);
    let result = await this.mapResultToScoreBoardFormat(
      input.score,
      studentOriginalData.puzzle_results
    );
    try {
      // 使用 Sequelize 的 update 方法
      // update 回傳一個陣列: [affectedCount]
      const [affectedCount] = await ScoreBoard.update(
        {
          puzzle_results: result,
          passed_puzzle_amount: input.passed_amount,
          last_submit_time: new Date(), // 自動更新為當下時間
        },
        {
          where: { student_ID: input.student_ID },
        }
      );

      if (affectedCount === 0) {
        console.warn(`⚠️ 更新失敗: 找不到學號 ${input.student_ID}`);
        return false;
      }

      console.log(`✅ 學號 ${input.student_ID} 分數更新成功`);
      return true;
    } catch (error) {
      console.error("❌ Update score failed:", error);
      throw error;
    }
  }
  async updateStudentScoreFromJudgeResults(
    studentID: string,
    judgeResults: JudgeAllResult[],
    passed_amount: number
  ) {
    try {
      const isStudentExist = await this.getScoreByStudentId(studentID);
      if (!isStudentExist) {
        console.warn(`⚠️ 學號 ${studentID} 不存在，無法更新分數`);
        return false;
      }
      const [affectedCount] = await ScoreBoard.update(
        {
          puzzle_results: judgeResults,
          passed_puzzle_amount: passed_amount,
          last_submit_time: new Date(), // 自動更新為當下時間
        },
        {
          where: { student_ID: studentID },
        }
      );

      console.log(`✅ 學號 ${studentID} 分數更新成功`);
      const updatedScore = await this.getScoreByStudentId(studentID);
      return true;
    } catch (error) {
      console.error("❌ Update score from judge results failed:", error);
      throw error;
    }
  }
  /**
   * 2. 取得單一學生分數 by student_ID
   */
  async getScoreByStudentId(studentID: string) {
    try {
      const studentScore = await ScoreBoard.findOne({
        where: { student_ID: studentID },
        // 若只需要特定欄位，可以使用 attributes: [...]
      });

      if (!studentScore) {
        console.warn(`⚠️ 查無學號 ${studentID} 的資料`);
        return null;
      }

      return studentScore;
    } catch (error) {
      console.error("❌ Get student score failed:", error);
      throw error;
    }
  }

  /**
   * 3. 取得所有學生分數，依照學號由小到大排序
   */
  async getAllScores() {
    try {
      const allScores = await ScoreBoard.findAll({
        order: [
          ["student_ID", "ASC"], // 依照學號升冪排序 (小 -> 大)
        ],
        // raw: true, // 如果你只想要純 JSON 物件而不是 Sequelize Instance，可以打開這個
      });

      console.log(`✅ 取得 ${allScores.length} 筆學生成績`);
      return allScores;
    } catch (error) {
      console.error("❌ Get all scores failed:", error);
      throw error;
    }
  }
  async mapResultToScoreBoardFormat(
    data: Record<string, RunTestsResult>,
    baseScoreboard: any
  ) {
    // 複製基底，保留未提供題目的原狀
    const result = { ...baseScoreboard };
    if (!data || typeof data !== "object") return result;

    for (const [puzzleId, puzzleData] of Object.entries(data)) {
      if (!puzzleData || typeof puzzleData !== "object") continue;

      // 更新 puzzleX_status（僅當該鍵存在於基底時才更新，以避免非預期新增鍵）
      const statusKey = `puzzle${puzzleId}_status`;
      if (statusKey in result) {
        const allCorrect =
          typeof puzzleData.correctCount === "number" &&
          typeof puzzleData.testCaseAmount === "number" &&
          puzzleData.correctCount === puzzleData.testCaseAmount;
        result[statusKey] = allCorrect;
      }

      // 逐一更新 test case 鍵：puzzle{p}-{groupId}-{testIndex}
      const groups = Array.isArray(puzzleData.groupResults)
        ? puzzleData.groupResults
        : [];
      for (const group of groups) {
        if (!group || typeof group !== "object") continue;

        const groupId = group.id; // 如 1, 2
        const tcs = Array.isArray(group.testCasesResults)
          ? group.testCasesResults
          : [];
        for (const tc of tcs) {
          if (!tc || typeof tc !== "object") continue;

          // tc.id 格式為 "groupIndex-testIndex"（例如 "1-3"）
          const parts = String(tc.id || "").split("-");
          const testIndex = parts[1]; // 取第二段作為 testIndex
          if (!testIndex) continue;

          const key = `puzzle${puzzleId}-${groupId}-${testIndex}`;
          // 僅當基底存在該鍵時才更新（保留未提供題目的原狀）
          if (key in result) {
            result[key] = Boolean(tc.correct);
          }
        }
      }
    }
    console.log("Mapped result to ScoreBoard format:");
    console.dir(result, { depth: null, colors: true });
    return result;
  }
}
const scoreBoardService = new ScoreBoardService();
export default scoreBoardService;
