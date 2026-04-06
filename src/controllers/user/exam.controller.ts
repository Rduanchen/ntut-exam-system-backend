import { Request, Response, NextFunction } from "express";
import systemSettingsService from "../../service/sys-settings.service";
import scoreBoardService from "../../service/scoreboard.service";
import userLogService from "../../service/user-log.service";
import { SocketService } from "../../socket/SocketService";
import { ErrorHandler } from "../../middlewares/error-handler";
import { encryptDataWithUserAES } from "../../service/user-crypto.service";
import { updateClientJudgeResultToScoreBoardFormat } from "../../utils/judger.util";
import { sanitizeStudentID } from "../../utils/guard.util";
import antiCheatService from "../../service/anticheat.service";
import path from "path";
import fs from "fs/promises";
import codeStorage from "../../service/code-storage";
import { getEffectiveSpecialRules } from "../../service/special-rules/rule-provider";
import { evaluateSpecialRules } from "../../service/special-rules/engine";
import { getPassedPuzzleAmount } from "../../utils/scoreboard.util";

/**
 * Get exam config (before exam starts)
 * GET /user/exam/config
 */
export const getConfig = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const examStatus = await systemSettingsService.getExamStatus();

    if (examStatus) {
      throw new ErrorHandler(
        403,
        "Exam has already started. Config is no longer available.",
      );
    }

    // const configAvailability =
    //   await systemSettingsService.getConfigAvailability();

    // if (!configAvailability) {
    //   throw new ErrorHandler(403, "Config is not available at the moment");
    // }

    const config = await systemSettingsService.getConfig();

    if (!config) {
      throw new ErrorHandler(404, "Config not found");
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get exam config with token (after exam starts, encrypted with user's AES key)
 * POST /user/exam/config-secure
 * Headers: x-user-token
 * Body: { studentID: string }
 */
export const getConfigSecure = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { studentID } = req.body;

    if (!studentID) {
      throw new ErrorHandler(400, "Missing required field: studentID");
    }

    const config = await systemSettingsService.getConfig();

    if (!config) {
      throw new ErrorHandler(404, "Config not found");
    }

    // Encrypt config with user's AES key
    const configStr = JSON.stringify(config);
    const encryptedConfig = await encryptDataWithUserAES(configStr, studentID);

    antiCheatService.logWithAntiCheat({
      student_ID: studentID,
      ip_address: req.ip || req.socket.remoteAddress || "unknown",
      mac_address: req.body?.macAddress ?? "",
      action_type: "get_encrypted_config",
      details: "Requested encrypted exam config",
    });

    res.status(200).json({
      success: true,
      data: {
        encryptedConfig,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload local test results
 * POST /user/exam/result
 * Headers: x-user-token
 * Body: { studentID: string, testResult: ClientResultFormat }
 */
export const uploadResult = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { studentID, testResult } = req.body;

    console.dir(req.body, { depth: null });
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const mac = req.body?.macAddress ?? "";

    if (!studentID) {
      throw new ErrorHandler(400, "Missing required field: studentID");
    }

    if (!testResult) {
      throw new ErrorHandler(400, "Missing required field: testResult");
    }

    // Get current student scoreboard
    const currentScore = await scoreBoardService.getScoreByStudentId(studentID);
    const originalScoreboard = (currentScore?.puzzle_results || {}) as any;

    // Convert client result to scoreboard format
    const updatedScoreboard = updateClientJudgeResultToScoreBoardFormat(
      testResult,
      originalScoreboard,
    );

    // Don't allow a lower score upload to overwrite the server scoreboard.
    // We grade on groups/subtasks, so compare by passed_subtask_amount.
    const originalSummary = getPassedPuzzleAmount(originalScoreboard);
    const updatedSummary = getPassedPuzzleAmount(updatedScoreboard as any);
    if (updatedSummary.passedSubtaskAmount < originalSummary.passedSubtaskAmount) {
      res.status(200).json({
        success: true,
        message: "Ignored lower-score upload",
      });
      return;
    }

    // Update student score
    await scoreBoardService.updateStudentScore(updatedScoreboard, studentID);

    // Also refresh special-rule results on backend so TA view updates immediately.
    // Source of truth is the uploaded program zip in /upload/{studentID}.zip.
    try {
      const config = await systemSettingsService.getConfig();
      if (config) {
        const PROJECT_ROOT = path.join(__dirname, "..", "..");
        const UPLOAD_DIR = path.join(PROJECT_ROOT, "upload");
        const ZIP_EXTENSION = ".zip";
        const safeStudentID = path.basename(studentID);
        const zipPath = path.join(UPLOAD_DIR, `${safeStudentID}${ZIP_EXTENSION}`);

        await fs.access(zipPath);

        const fileNames = await codeStorage.listFilesInZip(zipPath);
        const checkedAt = new Date().toISOString();

        for (const filePathInZip of fileNames) {
          const puzzleIndexRaw = codeStorage.getFileNameWithoutExt(filePathInZip);
          const puzzleIndex = Number(puzzleIndexRaw);
          if (!Number.isFinite(puzzleIndex) || puzzleIndex < 0) continue;

          const puzzle = config.puzzles?.[puzzleIndex];
          if (!puzzle) continue;

          const effectiveRules = getEffectiveSpecialRules({
            examConfig: config,
            puzzleIndex,
          });
          if (effectiveRules.length === 0) {
            // Ensure we clear results if rules removed.
            const existing = (updatedScoreboard as any)[puzzleIndexRaw];
            if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
              (existing as any).specialRuleResults = [];
            }
            continue;
          }

          let sourceText = "";
          try {
            sourceText = await codeStorage.unzipGetFileAsString(zipPath, filePathInZip);
          } catch (e: any) {
            const reason = `missing source: ${String(e?.message ?? e)}`;
            const specialRuleResults = effectiveRules.map((r) => ({
              ruleId: r.id,
              passed: false,
              message: r.message,
              reason,
              checkedAt,
            }));
            const existing = (updatedScoreboard as any)[puzzleIndexRaw];
            if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
              (existing as any).specialRuleResults = specialRuleResults;
            }
            continue;
          }

          const results = evaluateSpecialRules(effectiveRules, {
            language: puzzle.language,
            sourceText,
          });

          const specialRuleResults = (results as Array<{
            ruleId: string;
            passed: boolean;
            message: string;
            reason?: string;
          }>).map((r) => ({
            ruleId: r.ruleId,
            passed: r.passed,
            message: r.message,
            reason: r.reason,
            checkedAt,
          }));

          const existing = (updatedScoreboard as any)[puzzleIndexRaw];
          if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
            (existing as any).specialRuleResults = specialRuleResults;
          }
        }

        // Persist any specialRuleResults changes.
        await scoreBoardService.updateStudentScore(updatedScoreboard, studentID);
      }
    } catch {
      // If the zip isn't uploaded yet (or can't be read), we skip.
      // The admin rejudge path will still populate results later.
    }

    // Trigger socket event to notify all clients
    const allScores = await scoreBoardService.getAllScores();
    SocketService.triggerScoreUpdateEvent(allScores);

    // Log the action
    await antiCheatService.logWithAntiCheat({
      student_ID: studentID,
      ip_address: ip,
      mac_address: mac,
      action_type: "upload_test_result",
      details: `Uploaded test result: ${JSON.stringify(testResult)}`,
    });

    res.status(200).json({
      success: true,
      message: "Test results uploaded successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload program file
 * POST /user/exam/upload
 * Headers: x-user-token
 * Body: multipart/form-data with file and studentID
 */
export const uploadProgram = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const file = (req as any).file as any;
    const studentIDRaw = req.body?.studentID ?? "";
    const studentID = sanitizeStudentID(studentIDRaw);
    const mac = req.body?.macAddress ?? "";
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    if (!file) {
      throw new ErrorHandler(400, "Missing file in upload");
    }

    if (!studentID) {
      throw new ErrorHandler(400, "Missing studentID");
    }

    // Log the upload action
    await userLogService.createLog({
      student_ID: studentID,
      ip_address: ip,
      mac_address: mac,
      action_type: "upload_program",
      details: `Uploaded file: ${file.originalname} as ${file.filename}`,
    });

    // After uploading a new zip, recompute and persist special-rule results so
    // TA/backend immediately reflects the latest rule pass/fail without waiting
    // for an admin rejudge.
    try {
      const config = await systemSettingsService.getConfig();
      if (config) {
        const studentScore = await scoreBoardService.getScoreByStudentId(studentID);
        const scoreboard = (studentScore?.puzzle_results || {}) as any;

        const zipPath = file.path as string;
        const fileNames = await codeStorage.listFilesInZip(zipPath);
        const checkedAt = new Date().toISOString();

        for (const filePathInZip of fileNames) {
          const puzzleIndexRaw = codeStorage.getFileNameWithoutExt(filePathInZip);
          const puzzleIndex = Number(puzzleIndexRaw);
          if (!Number.isFinite(puzzleIndex) || puzzleIndex < 0) continue;

          const puzzle = config.puzzles?.[puzzleIndex];
          if (!puzzle) continue;

          const effectiveRules = getEffectiveSpecialRules({
            examConfig: config,
            puzzleIndex,
          });

          const existing = scoreboard[puzzleIndexRaw];
          if (!existing || typeof existing !== 'object' || Array.isArray(existing)) {
            continue;
          }

          if (effectiveRules.length === 0) {
            (existing as any).specialRuleResults = [];
            continue;
          }

          let sourceText = "";
          try {
            sourceText = await codeStorage.unzipGetFileAsString(zipPath, filePathInZip);
          } catch (e: any) {
            const reason = `missing source: ${String(e?.message ?? e)}`;
            (existing as any).specialRuleResults = effectiveRules.map((r) => ({
              ruleId: r.id,
              passed: false,
              message: r.message,
              reason,
              checkedAt,
            }));
            continue;
          }

          const results = evaluateSpecialRules(effectiveRules, {
            language: puzzle.language,
            sourceText,
          });

          (existing as any).specialRuleResults = (results as Array<{
            ruleId: string;
            passed: boolean;
            message: string;
            reason?: string;
          }>).map((r) => ({
            ruleId: r.ruleId,
            passed: r.passed,
            message: r.message,
            reason: r.reason,
            checkedAt,
          }));
        }

        await scoreBoardService.updateStudentScore(scoreboard as any, studentID);
        const allScores = await scoreBoardService.getAllScores();
        SocketService.triggerScoreUpdateEvent(allScores);
      }
    } catch {
      // Non-blocking: upload should still succeed even if rule recompute fails.
    }

    res.status(200).json({
      success: true,
      message: "Program uploaded successfully",
      data: {
        filename: file.filename,
        path: file.path,
      },
    });
  } catch (error) {
    next(error);
  }
};
