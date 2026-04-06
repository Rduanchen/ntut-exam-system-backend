import { Router } from "express";
import * as codeController from "../../controllers/admin/code.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin-Code
 *   description: Code judgment and retrieval
 */

/**
 * @swagger
 * /code/judge:
 *   post:
 *     summary: Judge student code
 *     tags: [Admin-Code]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentID:
 *                 type: string
	*             required:
	*               - studentID
 *     responses:
 *       200:
 *         description: Judgment result
	*         content:
	*           application/json:
	*             schema:
	*               type: object
	*               properties:
	*                 success:
	*                   type: boolean
	*                 message:
	*                   type: string
	*                 data:
	*                   type: object
	*                   properties:
	*                     result:
	*                       description: Scoreboard-like payload keyed by puzzle index
	*                       type: object
	*                       additionalProperties:
	*                         oneOf:
	*                           - description: Legacy shape (subtasks array)
	*                             type: array
	*                             items:
	*                               type: object
	*                           - description: Extended shape with specialRuleResults
	*                             type: object
	*                             properties:
	*                               subtasks:
	*                                 type: array
	*                                 items:
	*                                   type: object
	*                               specialRuleResults:
	*                                 type: array
	*                                 items:
	*                                   type: object
	*                                   properties:
	*                                     ruleId:
	*                                       type: string
	*                                     passed:
	*                                       type: boolean
	*                                     message:
	*                                       type: string
	*                                     reason:
	*                                       type: string
	*                                     checkedAt:
	*                                       type: string
	*                                       format: date-time
 */
// Judge student code - requires studentID in body
router.post("/judge", codeController.judgeCode);

/**
 * @swagger
 * /code/submitted-students:
 *   get:
 *     summary: Get all submitted students
 *     tags: [Admin-Code]
 *     responses:
 *       200:
 *         description: List of students who submitted code
 */
// Get all submitted students
router.get("/submitted-students", codeController.getSubmittedStudents);

/**
 * @swagger
 * /code/{studentID}:
 *   get:
 *     summary: Get student code
 *     tags: [Admin-Code]
 *     parameters:
 *       - in: path
 *         name: studentID
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student's code
 */
// Get student code - supports both GET with param and POST with body
router.get("/:studentID", codeController.getStudentCode);

/**
 * @swagger
 * /code:
 *   post:
 *     summary: Get student code (POST variant)
 *     tags: [Admin-Code]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               studentID:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student's code
 */
router.post("/", codeController.getStudentCode);

export default router;
