import {
  AccessUser,
  ExamConfig,
  verifyExamConfig,
} from "../schemas/config.schemas";
import { StatusCode } from "piston-judger";
import { ScoreBoardFormat, TestCaseRecord } from "../types/scoreboard.type";
import { getDefaultScoreboard } from "../utils/init-db.util";
import { ScoreBoard } from "../models/ScoreBoard";
import { UserActionLog } from "../models/UserActionLog";
import { SystemSettings } from "../models/SystemSettings";
import { ViolationLog } from "../models/ViolationLog";
import { StudentNetwork } from "../models/StudentNetwork";
import { ErrorHandler } from "../middlewares/error-handler";
import systemSettingsService from "./sys-settings.service";
import { sequelize } from "../config/database";
import studentNetworkService from "./student-network.service";
import { Message } from "../models/Message";
import { UserCryptoKey } from "../models/UserCryptoKey";
async function initClientScoreBoard(
  accessibleUsers: AccessUser[],
  defaultScoreboard: ScoreBoardFormat,
): Promise<void> {
  console.log("⚠️ Initializing scoreboard for users:", accessibleUsers);
  const records = accessibleUsers.map((user, index) => {
    return {
      student_ID: user.id,
      student_name: user.name,
      last_submit_time: null,
      puzzle_results: defaultScoreboard,
    };
  });
  try {
    await ScoreBoard.bulkCreate(records, {
      updateOnDuplicate: ["student_name", "puzzle_results"],
    });
  } catch (error) {
    throw new ErrorHandler(500, "Fail to initialize scoreboard");
  }
}

export async function init(
  config: ExamConfig,
  users: AccessUser[],
): Promise<boolean> {
  try {
    console.log("⚠️ 正在初始化考試系統...");
    const { examConfig, isCorrect, errors } = verifyExamConfig(config);
    console.log("⚠️ Exam config verification result:", {
      examConfig,
      isCorrect,
      errors,
    });
    if (!isCorrect || examConfig === null) {
      throw new ErrorHandler(
        400,
        `Invalid exam config: ${JSON.stringify(errors)}`,
      );
    }
    const defaultScoreboard = getDefaultScoreboard(examConfig.puzzles);
    await initClientScoreBoard(users, defaultScoreboard);
    await systemSettingsService.saveConfig(examConfig);
    await systemSettingsService.updateConfigAvailability(true);
    await systemSettingsService.updateExamStatus(false);
    await systemSettingsService.saveStudentList(users);
    await studentNetworkService.initializeStudents(users);
    console.log("✅ Exam system initialized successfully");
    return true;
  } catch (error) {
    throw new ErrorHandler(
      500,
      error instanceof Error
        ? error.message
        : "Unknown error during initialization",
    );
  }
  return false;
}

export async function reset(clearSettings: boolean = false) {
  console.log("⚠️ 正在清除資料庫資料...");
  const t = await sequelize.transaction();

  try {
    // 1. 清除計分板
    await ScoreBoard.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction: t,
    });

    // 2. 清除操作 Log
    await UserActionLog.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction: t,
    });

    // 3. (選用) 清除系統設定
    if (clearSettings) {
      await SystemSettings.destroy({
        where: {},
        truncate: true,
        cascade: true,
        transaction: t,
      });
    }

    // 4. 清除警示日誌
    await ViolationLog.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction: t,
    });

    // 5. 清除學生網路資料
    await StudentNetwork.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction: t,
    });

    await Message.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction: t,
    });

    await UserCryptoKey.destroy({
      where: {},
      truncate: true,
      cascade: true,
      transaction: t,
    });

    await t.commit();
    console.log("✅ 資料庫已重置完畢");
  } catch (error) {
    await t.rollback();
    console.error("❌ 重置失敗:", error);
    throw new ErrorHandler(
      500,
      error instanceof Error ? error.message : "Unknown error during reset",
    );
  }
}
