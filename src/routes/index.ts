import { Router, Request } from "express";
import config from "./settings.json";
import multer, { Multer } from "multer";
import path from "path";
import fs from "fs";

const router = Router();
const projectRoot = path.join(__dirname, "..");
const uploadRootDir = path.join(projectRoot, "upload");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadRootDir)) {
      fs.mkdirSync(uploadRootDir, { recursive: true });
    }
    cb(null, uploadRootDir);
  },
  filename: (req, file, cb) => {
    console.log(`filename() originalname: ${file.originalname}`);
    // 例如前端傳的是 "123456.zip"
    cb(null, file.originalname);
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
    return res.status(400).json({ success: false, message: "缺少檔案或 studentID" });
  }
  console.log("檔案儲存到:", file.path);
  res.json({ success: true });
});


router.get("/get-config", (req, res) => {
  res.json(config);
});

router.get("/status", (req, res) => {
  // console.log("Status check received");
  res.json({
    success: true,
  });
});

router.post("/post-result", (req, res) => {
  console.log("Received result:", req.body);
  res.json({ success: true, message: "Result received successfully" });
});

router.post("/post-file", (req, res) => {
  console.log("Received file data:", req.body);
  res.json({ message: "File data received successfully" });
});

router.post("/is-student-valid", (req, res) => {
  const { studentID } = req.body;
  console.log("Verifying student ID:", studentID);
  const userInfo = config.accessableUsers.find(
    (user) => user.id === studentID
  );

  if (userInfo) {
    res.json({ isValid: true, info: userInfo });
    return;
  } else {
    res.json({ isValid: false, message: "Student ID not found" });
    return;
  }
});


router.post("/user-action-logger", (req, res) => {
  const userIP = req.ip || req.socket.remoteAddress;
  console.log(`User ${req.body.studentID} from IP: ${userIP} performed action: ${req.body.actionType}`, req.body.details);
  res.json({ success: true, message: "User action recorded successfully" });
});

export default router;
