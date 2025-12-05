import { Router, Request } from "express";
import config from "./settings.json";
import multer, { Multer } from "multer";
import path from "path";
import fs from "fs";
import { InitService } from "../service/InitService";
import codeStorage from "../service/CodeStorage";


const router = Router();

router.get("/heartbeat", (req, res) => {
  res.json({ success: true, message: "User API is alive" });
});

const initService = new InitService();

router.get("/init", async (req, res) => {
  const configJSON = req.body.config;
  const studentList = req.body.studentList;
  if (!configJSON || !studentList) {
    return res.status(400).json({
      success: false,
      message: "Missing config or studentList in request body",
    });
  }
  let response = await initService.initialize(configJSON, studentList);
  if (!response) {
    return res
      .status(500)
      .json({ success: false, message: "Initialization failed" });
  }
  return res.json({ success: true, message: "User API initialized" });
});

router.get("/restore", async (req, res) => {
  let response = await initService.resetDatabase();
  return res.json({ success: true, message: "Database restored" });
});

// run submission code

router.get("/get-submissions", async (req, res) => {
  codeStorage.getAllZipFiles(path.join(__dirname, "../upload")).then((files) => {
    res.json({ success: true, files });
  });
});

router.post("/judge-code", async (req, res) => {
  const studentID = req.body.studentID;
  const problemID = req.body.problemID;
  const zipFileString = await codeStorage.unzipGetFileAsString(path.join(__dirname, `../upload/${studentID}.zip`), `${problemID}.py`);

});



// router.post("/run-code", async (req, res) => {

export default router;
