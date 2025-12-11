import { Router, Request } from "express";
import multer, { Multer } from "multer";
import path from "path";
import fs from "fs";
import systemSettingsService from "../service/SystemSettingsServices";
import scoreBoardService from "../service/ScoreBoardService";
import userLogService from "../service/UserLogService";
import socketService from "../socket/SocketService";
import alertLogService from "../service/AlertLogService";

const router = Router();
const projectRoot = path.join(__dirname, "..");
const uploadRootDir = path.join(projectRoot, "upload");

// 安全清理學號，避免奇怪字元影響檔名
function sanitizeStudentID(id: string): string {
  // 僅允許英數與底線、破折號；其他移除
  return (id || "")
    .toString()
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadRootDir)) {
      fs.mkdirSync(uploadRootDir, { recursive: true });
    }
    cb(null, uploadRootDir);
  },
  filename: (req, file, cb) => {
    const studentIDRaw = (req.body?.studentID ?? "").toString();
    const studentID = sanitizeStudentID(studentIDRaw);

    console.log(`filename() originalname: ${file.originalname}`);
    console.log(
      `filename() studentID from body: ${studentIDRaw} -> sanitized: ${studentID}`
    );

    if (!studentID) {
      // 若在這裡拿不到 studentID，回傳錯誤避免用錯檔名
      return cb(
        new Error("Missing studentID in form-data before file field."),
        ""
      );
    }
    const targetName = `${studentID}.zip`;
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext && ext !== ".zip") {
      console.warn(
        `Non-zip upload attempted: ${file.originalname}. Forcing name ${targetName}.`
      );
    }

    cb(null, targetName);
  },
});

interface MulterRequest extends Request {
  file: multer.File;
}
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/upload-program", upload.single("file"), (req: MulterRequest, res) => {
  const file = req.file as multer.File;
  const studentID = req.body.studentID;
  console.log(`Received program upload from studentID: ${studentID}`);
  if (!file || !studentID) {
    return res
      .status(400)
      .json({ success: false, message: "Missing file or studentID" });
  }
  console.log("Saving file to", file.path);
  res.json({ success: true, filename: file.filename, path: file.path });
}
);

router.get("/get-config", async (req, res) => {
  const config = await systemSettingsService.getConfig()
  if (!config) {
    return res
      .status(500)
      .json({ success: false, message: "Config not found in settings" });
  }
  res.json(config);
});

router.get("/status", (req, res) => {
  res.json({
    success: true,
  });
});

router.post("/post-result", async (req, res) => {
  const studentID = req.body.studentInformation.id;

  const results = req.body.testResult;
  let correctCount = 0;
  for (const group in results) {
    correctCount += results[group].correctCount;
  };

  await scoreBoardService.updateStudentScore({
    student_ID: studentID,
    score: results,
    passed_amount: correctCount,
  });
  const result = await scoreBoardService.getAllScores();
  socketService.triggerScoreUpdateEvent(result);
  res.json({ success: true, message: "Results received successfully" });
});

router.post("/post-file", (req, res) => {
  console.log("Received file data:", req.body);
  res.json({ message: "File data received successfully" });
});

router.post("/is-student-valid", async (req, res) => {
  const studentID = req.body.studentID;
  const studentInfo = await systemSettingsService.getStudentInfo(studentID);
  if (studentInfo) {
    res.json({
      isValid: true, info: {
        id: studentInfo.student_ID,
        name: studentInfo.name
      }
    });
  }
  else {
    res.json({ isValid: false });
  }
});

router.post("/user-action-logger", async (req, res) => {
  const userIP = req.ip || req.socket.remoteAddress;
  console.log(
    `User ${req.body.studentID} from IP: ${userIP} performed action: ${req.body.actionType}`,
    req.body.details
  );
  console.dir(req.body.details, { depth: null, colors: true });
  await userLogService.createLog({
    student_ID: req.body.studentID,
    ip_address: userIP || "unknown",
    action_type: req.body.level || "unknown",
    details: req.body.details[0] || "",
  });
  const result = await alertLogService.updateAndCheckAlerts();
  res.json({ success: true, message: "Action logged successfully" });
});

export default router;
