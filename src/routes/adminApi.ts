import { Router, Request } from "express";
import config from "./settings.json";
import multer, { Multer } from "multer";
import path from "path";
import fs from "fs";
import { InitService } from "../service/InitService";
import codeStorage from "../service/CodeStorage";
import { judgeSingleCode, judgeAllCodeInStorage } from "../service/CodeJudger";
import systemSettingsService from "../service/SystemSettingsServices";
import scoreBoardService from "../service/ScoreBoardService";
import userLogService from "../service/UserLogService";
import alertLogService from "../service/AlertLogService";

const router = Router();

const uploadDir = path.join(__dirname, "..", "upload");
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
export function requireFields(obj, fields: string[]) {
  const missing = fields.filter(
    (f) => obj[f] === undefined || obj[f] === null || obj[f] === ""
  );
  return missing;
}
export function isSafeStudentId(id: string) {
  return /^[A-Za-z0-9_-]+$/.test(id);
}

router.get("/heartbeat", (_req, res) =>
  res.json({ success: true, data: { message: "User API is alive" } })
);

const initService = new InitService();
router.post(
  "/init",
  asyncHandler(async (req, res) => {
    const missing = requireFields(req.body, ["config", "studentList"]);
    if (missing.length)
      return res
        .status(400)
        .json({ success: false, message: `Missing: ${missing.join(", ")}` });
    const ok = await initService.initialize(
      req.body.config,
      req.body.studentList
    );
    if (!ok)
      return res
        .status(500)
        .json({ success: false, message: "Initialization failed" });
    res.json({ success: true, data: { message: "User API initialized" } });
  })
);

router.get(
  "/restore",
  asyncHandler(async (_req, res) => {
    await initService.resetDatabase(true);
    res.json({ success: true, data: { message: "Database restored" } });
  })
);

router.get(
  "/is-configured",
  asyncHandler(async (_req, res) => {
    const isConfigured = await systemSettingsService.getConfig();
    res.json({ success: true, data: { isConfigured: !!isConfigured } });
  })
);

router.get(
  "/get-submitted-students",
  asyncHandler(async (_req, res) => {
    const result = await codeStorage.getAllZipFiles(
      path.join(__dirname, `../upload/`)
    );
    res.json({ success: true, data: { result: result } });
  })
);

router.post(
  "/judge-code",
  asyncHandler(async (req, res) => {
    const { studentID } = req.body;
    if (
      !studentID ||
      typeof studentID !== "string" ||
      !isSafeStudentId(studentID)
    )
      return res
        .status(400)
        .json({ success: false, message: "Invalid studentID" });

    const zipPath = path.join(uploadDir, `${studentID}.zip`);
    if (!fs.existsSync(zipPath))
      return res
        .status(404)
        .json({ success: false, message: "Submission not found" });

    const fileNames = await codeStorage.listFilesInZip(zipPath);
    const result = await judgeAllCodeInStorage(studentID, fileNames);
    res.json({ success: true, data: { result } });
  })
);

router.post(
  "/all-student-scores",
  asyncHandler(async (_req, res) => {
    const result = await scoreBoardService.getAllScores();
    res.json({
      success: true,
      data: {
        result: result,
        success: true,
      },
    });
  })
);

router.get(
  "/update-alert-list",
  asyncHandler(async (_req, res) => {
    const alerts = await userLogService.checkSecurityAlerts();
    const createdAlerts = await alertLogService.addFromAlerts(alerts);
    alertLogService.resetCooldown(true);
    res.json({ success: true, data: { createdAlerts } });
  })
);

router.get(
  "/get-alert-logs",
  asyncHandler(async (_req, res) => {
    const result = await alertLogService.getAll();
    res.json({ success: true, data: { result } });
  })
);

router.post(
  "/set-alert-ok-status",
  asyncHandler(async (req, res) => {
    const missing = requireFields(req.body, ["id", "isOk"]);
    if (missing.length)
      return res
        .status(400)
        .json({ success: false, message: `Missing: ${missing.join(", ")}` });
    const { id, isOk } = req.body;
    const success = await alertLogService.setOkStatus(id, isOk);
    res.json({
      success,
      data: {
        message: success
          ? "Alert status updated"
          : "Failed to update alert status",
      },
    });
  })
);

router.get(
  "/get-all-logs",
  asyncHandler(async (_req, res) => {
    const result = await userLogService.getAllLogs();
    res.json({ success: true, data: { result } });
  })
);
export default router;
