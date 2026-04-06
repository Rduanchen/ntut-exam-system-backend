import { Request, Response, NextFunction } from "express";
import * as initService from "../../service/init.service";
import systemSettingsService from "../../service/sys-settings.service";

export const init = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = req.body;
    const studentList = config.accessibleUsers;
    await initService.init(config, studentList);
    res
      .status(200)
      .json({ success: true, message: "Exam system initialized successfully" });
  } catch (error) {
    next(error);
  }
};

export const reset = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { clearSettings } = req.body;
    await initService.reset(clearSettings ?? true);
    res
      .status(200)
      .json({ success: true, message: "System reset successfully" });
  } catch (error) {
    next(error);
  }
};

export const getStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const status = await systemSettingsService.getExamStatus();
    res.status(200).json({ success: true, data: { exam_status: status } });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { exam_status } = req.body;

    if (exam_status === undefined || exam_status === null) {
      return res.status(400).json({
        success: false,
        message: "Missing exam_status in request body",
      });
    }
    await systemSettingsService.updateExamStatus(exam_status);
    res
      .status(200)
      .json({ success: true, message: "Exam status updated successfully" });
  } catch (error) {
    next(error);
  }
};