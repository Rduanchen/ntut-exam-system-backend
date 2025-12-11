import { ScoreBoard } from "../models/ScoreBoard";
import { Sequelize } from "sequelize-typescript";
import { sequelize } from "../config/database"; // 引入我們建立的連線實例
import { UserActionLog } from "../models/UserActionLog";
import { SystemSettings } from "../models/SystemSettings";
import { AlertLog } from "../models/AlertLog";
import {
  TestConfig,
  ClientStudentInformation,
  PuzzleConfig,
  StudentInfo,
} from "../types/InitService";
import { SystemSettingsService } from "./SystemSettingsServices";

export class InitService {
  async initialize(
    config: TestConfig,
    studentList: ClientStudentInformation[]
  ) {
    const puzzles: PuzzleConfig[] = config.puzzles;
    const students: StudentInfo[] = studentList.map((student) => ({
      student_ID: student.id,
      name: student.name,
    }));
    const response1 = await this.initializeTheDatabase(puzzles, students);
    const response2 = await new SystemSettingsService().saveConfig(config);
    const response3 = await new SystemSettingsService().saveStudentList(
      students
    );
    return response1 && response2 && response3;
  }

  async initializeTheDatabase(
    puzzles: PuzzleConfig[],
    students: StudentInfo[]
  ) {
    console.log(
      `正在初始化 ${students.length} 位學生，共 ${puzzles.length} 題...`
    );

    // 1. 建立 Default Results Template (所有狀態皆為 false)
    const defaultResults: Record<string, boolean> = {};

    puzzles.forEach((puzzle) => {
      // 大題狀態
      defaultResults[`puzzle${puzzle.id}_status`] = false;

      puzzle.testCases.forEach((group) => {
        // Open Test Cases -> puzzle1-1-1
        group.openTestCases.forEach((tc) => {
          defaultResults[`puzzle${puzzle.id}-${tc.id}`] = false;
        });
        // Hidden Test Cases -> puzzle1-1-3
        group.hiddenTestCases.forEach((tc) => {
          defaultResults[`puzzle${puzzle.id}-${tc.id}`] = false;
        });
      });
    });

    // 2. 準備寫入資料
    const records = students.map((student) => ({
      student_ID: student.student_ID,
      student_name: student.name,
      puzzle_amount: puzzles.length,
      passed_puzzle_amount: 0,
      last_submit_time: null,
      puzzle_results: defaultResults, // 這裡存入 JSON
    }));

    // 3. 寫入 DB
    try {
      await ScoreBoard.bulkCreate(records, {
        updateOnDuplicate: [
          "puzzle_amount",
          "passed_puzzle_amount",
          "puzzle_results",
          "student_name",
        ],
      });
      console.log("✅ 初始化完成！");
      return true;
    } catch (error) {
      console.error("❌ 初始化失敗:", error);
      return false;
    }
  }

  async resetDatabase(clearSettings: boolean = false) {
    console.log("⚠️ 正在清除資料庫資料...");

    const t = await sequelize.transaction();

    try {
      // 1. 清除計分板 (truncate: true 會快速清空並重置 ID)
      // cascade: true 用於 Postgres，如果有關聯表會一併清除，雖然目前沒有 FK 但加上比較保險
      await ScoreBoard.destroy({
        where: {},
        truncate: true,
        cascade: true,
        transaction: t,
      });

      // 2. 清除操作 Log (考試重來，Log 通常也要清空)
      await UserActionLog.destroy({
        where: {},
        truncate: true,
        cascade: true,
        transaction: t,
      });

      // 3. (選用) 清除系統設定
      // 通常系統設定(如考試名稱、全域變數)可能想保留，所以設為選用
      if (clearSettings) {
        await SystemSettings.destroy({
          where: {},
          truncate: true,
          cascade: true,
          transaction: t,
        });
      }

      // 4. 清除警示日誌
      await AlertLog.destroy({
        where: {},
        truncate: true,
        cascade: true,
        transaction: t,
      });

      await t.commit();
      console.log("✅ 資料庫已重置完畢 (Tables truncated)");
    } catch (error) {
      await t.rollback();
      console.error("❌ 重置失敗，資料已回滾:", error);
      throw error;
    }
  }
}
