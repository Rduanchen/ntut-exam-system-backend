import systemSettingsService from "./sys-settings.service";
import {
  ExamConfig,
  verifyExamConfig,
  examConfigSchema,
} from "../schemas/config.schemas";
import { ErrorHandler } from "../middlewares/error-handler";

const isExamStarted = async (): Promise<boolean> => {
  return (await systemSettingsService.getExamStatus()) === true;
};

const createConfig = async (config: ExamConfig): Promise<void> => {
  if (await isExamStarted()) {
    throw new ErrorHandler(
      400,
      "Cannot update config after the exam has started",
    );
  }
  // type check
  const { examConfig, isCorrect, errors } = verifyExamConfig(config);
  if (!isCorrect || examConfig === null) {
    throw new ErrorHandler(
      400,
      `Invalid exam config: ${JSON.stringify(errors)}`,
    );
  }
  await systemSettingsService.saveConfig(examConfig);
};

const updateConfig = async (config: ExamConfig): Promise<void> => {
  if (await isExamStarted()) {
    throw new ErrorHandler(
      400,
      "Cannot update config after the exam has started",
    );
  }
  // type check
  const { examConfig, isCorrect, errors } = verifyExamConfig(config);
  if (!isCorrect || examConfig === null) {
    throw new ErrorHandler(
      400,
      `Invalid exam config: ${JSON.stringify(errors)}`,
    );
  }
  await systemSettingsService.saveConfig(examConfig);
};

interface UpdateResult {
  success: boolean;
  message: string;
  updatedConfig?: ExamConfig;
  error?: any;
}

/**
 * 更新考試配置 - 僅允許修改測試資料的輸入輸出
 * @param newConfig 前端傳送的完整 ExamConfig
 * @returns 更新結果
 */
const updateTestCase = async (newConfig: ExamConfig): Promise<UpdateResult> => {
  try {
    // 考試如果沒有開始，這個功能不可以使用
    if (!(await isExamStarted())) {
      throw new ErrorHandler(400, "The test has not started yet");
    }

    // 1. 驗證新配置格式
    const validationResult = examConfigSchema.safeParse(newConfig);
    if (!validationResult.success) {
      return {
        success: false,
        message: "新配置格式錯誤",
        error: validationResult.error.issues,
      };
    }

    // 2. 獲取當前配置
    const currentConfig = await systemSettingsService.getConfig();

    // 3. 驗證當前配置
    const currentValidation = examConfigSchema.safeParse(currentConfig);
    if (!currentValidation.success) {
      return {
        success: false,
        message: "當前考試配置格式錯誤",
        error: currentValidation.error.issues,
      };
    }

    const validCurrentConfig = currentValidation.data;
    const validNewConfig = validationResult.data;

    // 4. 檢查是否只修改了測試資料
    const configDiff = checkOnlyTestDataChanged(
      validCurrentConfig,
      validNewConfig,
    );

    if (!configDiff.valid) {
      return {
        success: false,
        message: configDiff.message || "只允許修改測試資料的 input 和 output",
        error: configDiff.details,
      };
    }

    // 5. 保存更新後的配置
    await systemSettingsService.saveConfig(validNewConfig);

    return {
      success: true,
      message: "考試配置更新成功",
      updatedConfig: validNewConfig,
    };
  } catch (error) {
    return {
      success: false,
      message: "更新失敗",
      error: error,
    };
  }
};

/**
 * 檢查兩個配置是否只有測試資料不同
 */
function checkOnlyTestDataChanged(
  oldConfig: ExamConfig,
  newConfig: ExamConfig,
): { valid: boolean; message?: string; details?: any } {
  // 檢查基本資訊是否相同
  if (oldConfig.testTitle !== newConfig.testTitle) {
    return {
      valid: false,
      message: "不允許修改考試標題",
      details: { field: "testTitle" },
    };
  }

  if (oldConfig.description !== newConfig.description) {
    return {
      valid: false,
      message: "不允許修改考試描述",
      details: { field: "description" },
    };
  }

  // 檢查 judgerSettings
  if (
    oldConfig.judgerSettings.timeLimit !== newConfig.judgerSettings.timeLimit ||
    oldConfig.judgerSettings.memoryLimit !==
    newConfig.judgerSettings.memoryLimit
  ) {
    return {
      valid: false,
      message: "不允許修改評測系統設定",
      details: { field: "judgerSettings" },
    };
  }

  // 檢查 accessibleUsers
  if (
    JSON.stringify(oldConfig.accessibleUsers) !==
    JSON.stringify(newConfig.accessibleUsers)
  ) {
    return {
      valid: false,
      message: "不允許修改可存取使用者列表",
      details: { field: "accessibleUsers" },
    };
  }

  // 檢查題目數量
  if (oldConfig.puzzles.length !== newConfig.puzzles.length) {
    return {
      valid: false,
      message: "不允許修改題目數量",
      details: {
        field: "puzzles",
        oldLength: oldConfig.puzzles.length,
        newLength: newConfig.puzzles.length,
      },
    };
  }

  // 檢查每一題
  for (let i = 0; i < oldConfig.puzzles.length; i++) {
    const oldPuzzle = oldConfig.puzzles[i];
    const newPuzzle = newConfig.puzzles[i];

    // 檢查題目標題
    if (oldPuzzle.title !== newPuzzle.title) {
      return {
        valid: false,
        message: `不允許修改題目 ${i + 1} 的標題`,
        details: { field: `puzzles[${i}].title` },
      };
    }

    // 檢查語言
    if (oldPuzzle.language !== newPuzzle.language) {
      return {
        valid: false,
        message: `不允許修改題目 ${i + 1} 的程式語言`,
        details: { field: `puzzles[${i}].language` },
      };
    }

    // 檢查時間限制
    if (oldPuzzle.timeLimit !== newPuzzle.timeLimit) {
      return {
        valid: false,
        message: `不允許修改題目 ${i + 1} 的時間限制`,
        details: { field: `puzzles[${i}].timeLimit` },
      };
    }

    // 檢查記憶體限制
    if (oldPuzzle.memoryLimit !== newPuzzle.memoryLimit) {
      return {
        valid: false,
        message: `不允許修改題目 ${i + 1} 的記憶體限制`,
        details: { field: `puzzles[${i}].memoryLimit` },
      };
    }

    // 檢查子任務數量
    if (oldPuzzle.subtasks.length !== newPuzzle.subtasks.length) {
      return {
        valid: false,
        message: `不允許修改題目 ${i + 1} 的子任務數量`,
        details: {
          field: `puzzles[${i}].subtasks`,
          oldLength: oldPuzzle.subtasks.length,
          newLength: newPuzzle.subtasks.length,
        },
      };
    }

    // 檢查每個子任務
    for (let j = 0; j < oldPuzzle.subtasks.length; j++) {
      const oldSubtask = oldPuzzle.subtasks[j];
      const newSubtask = newPuzzle.subtasks[j];

      // 檢查子任務標題
      if (oldSubtask.title !== newSubtask.title) {
        return {
          valid: false,
          message: `不允許修改題目 ${i + 1} 子任務 ${j + 1} 的標題`,
          details: { field: `puzzles[${i}].subtasks[${j}].title` },
        };
      }

      // 檢查 visible 測試資料數量
      if (oldSubtask.visible.length !== newSubtask.visible.length) {
        return {
          valid: false,
          message: `不允許修改題目 ${i + 1} 子任務 ${j + 1} 的 visible 測試資料數量`,
          details: {
            field: `puzzles[${i}].subtasks[${j}].visible`,
            oldLength: oldSubtask.visible.length,
            newLength: newSubtask.visible.length,
          },
        };
      }

      // 檢查 hidden 測試資料數量
      if (oldSubtask.hidden.length !== newSubtask.hidden.length) {
        return {
          valid: false,
          message: `不允許修改題目 ${i + 1} 子任務 ${j + 1} 的 hidden 測試資料數量`,
          details: {
            field: `puzzles[${i}].subtasks[${j}].hidden`,
            oldLength: oldSubtask.hidden.length,
            newLength: newSubtask.hidden.length,
          },
        };
      }

      // ✅ 測試資料的 input 和 output 可以不同，這是允許的變更
      // 所以這裡不需要檢查測試資料的內容
    }
  }

  // 所有檢查都通過，表示只有測試資料被修改
  return { valid: true };
}

export { createConfig, updateConfig, updateTestCase };
