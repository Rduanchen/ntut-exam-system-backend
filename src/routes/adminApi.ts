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

router.get("/heartbeat", (req, res) => {
  res.json({ success: true, message: "User API is alive" });
});

const initService = new InitService();
router.post("/init", async (req, res) => {
  console.log("Initializing system with config:", req.body.config);
  const { config: configJSON, studentList } = req.body;

  if (!configJSON || !studentList) {
    return res.status(400).json({
      success: false,
      message: "Missing config or studentList in request body",
    });
  }

  const ok = await initService.initialize(configJSON, studentList);
  if (!ok) {
    return res
      .status(500)
      .json({ success: false, message: "Initialization failed" });
  }
  return res.json({ success: true, message: "User API initialized" });
});
router.get("/restore", async (req, res) => {
  let response = await initService.resetDatabase(true);
  return res.json({ success: true, message: "Database restored" });
});

router.get("/is-configured", async (req, res) => {
  let isConfigured = await systemSettingsService.getConfig();
  console.log("isConfigured:", isConfigured);
  if (isConfigured) {
    res.json({ success: true, isConfigured: true });
  } else {
    res.json({ success: true, isConfigured: false });
  }
});

// run submission code

router.get("/get-submitted-students", async (req, res) => {
  const result = await codeStorage.getAllZipFiles(
    path.join(__dirname, `../upload/`)
  );
  res.json({ success: true, result: result });
});

router.get("/get-submissions", async (req, res) => {
  const studentID = req.body.studentID;
  console.log("Getting submissions for studentID:", studentID);
  const fileNames = await codeStorage.listFilesInZip(
    path.join(__dirname, `../upload/${studentID}.zip`)
  );
  res.json({
    success: true,
    fileNames: fileNames,
  });
});

router.post("/judge-code", async (req, res) => {
  const studentID = req.body.studentID;
  const fileNames = await codeStorage.listFilesInZip(
    path.join(__dirname, `../upload/${studentID}.zip`)
  );
  console.log("fileNames:", fileNames);

  const result = await judgeAllCodeInStorage(studentID, fileNames);
  console.dir(result, { depth: null });

  res.json({
    success: true,
    result: result,
  });
});

router.post("/all-student-scores", async (req, res) => {
  const result = await scoreBoardService.getAllScores();
  res.json({
    success: true,
    result: result,
  });
});


router.get("/update-alert-list", async (req, res) => {
  const result = await alertLogService.updateAndCheckAlerts();
  res.json({
    success: true,
    result: result,
  });
});

router.get("/get-alert-logs", async (req, res) => {
  const result = await alertLogService.getAll();
  res.json({
    success: true,
    result: result,
  });
});

router.post("/set-alert-ok-status", async (req, res) => {
  const id = req.body.id;
  const isOk = req.body.isOk;
  const success = await alertLogService.setOkStatus(id, isOk);
  res.json({
    success: success,
    message: success
      ? "Alert status updated"
      : "Failed to update alert status",
  });
});

router.get("/get-student-log", async (req, res) => {
  const studentID = req.body.studentID;
  const result = await userLogService.getLogsByStudent(studentID);
  res.json({
    success: true,
    result: result,
  });
});

router.get("/get-all-logs", async (req, res) => {
  const result = await userLogService.getAllLogs();
  res.json({
    success: true,
    result: result,
  });
});
export default router;
