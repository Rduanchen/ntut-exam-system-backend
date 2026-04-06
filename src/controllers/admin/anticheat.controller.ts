import { Request, Response, NextFunction } from "express";
import violationLogService from "../../service/violation-log.service";
import { ErrorHandler } from "../../middlewares/error-handler";
import { SocketService } from "../../socket/SocketService";

/**
 * Get all alert logs (violation logs)
 * GET /admin/anticheat/logs
 */
export const getAlertLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // const result = await violationLogService.getAll();
    const result = await violationLogService.getLatestLogByAmount(70);
    res.status(200).json({
      success: true,
      data: { logs: result },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set alert OK status
 * PUT /admin/anticheat/status
 * Body: { id: number, isOk: boolean }
 */
export const setAlertOkStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id, isOk } = req.body;

    if (id === undefined || id === null) {
      throw new ErrorHandler(400, "Missing required field: id");
    }

    if (isOk === undefined || isOk === null) {
      throw new ErrorHandler(400, "Missing required field: isOk");
    }

    if (typeof isOk !== "boolean") {
      throw new ErrorHandler(400, "Field isOk must be a boolean");
    }

    const result = await violationLogService.setOkStatus(Number(id), isOk);

    if (!result) {
      throw new ErrorHandler(404, "Alert record not found");
    }

    // Emit socket event to notify clients about the status change
    const allLogs = await violationLogService.getAll();
    SocketService.triggerAlertEvent(allLogs);

    res.status(200).json({
      success: true,
      message: "Alert status updated successfully",
      data: { record: result },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get alert logs by student ID
 * GET /admin/anticheat/logs/:studentID
 */
export const getAlertLogsByStudentId = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { studentID } = req.params;

    if (!studentID) {
      throw new ErrorHandler(400, "Missing required parameter: studentID");
    }

    const result = await violationLogService.getByStudentId(studentID);
    res.status(200).json({
      success: true,
      data: { logs: result },
    });
  } catch (error) {
    next(error);
  }
};
