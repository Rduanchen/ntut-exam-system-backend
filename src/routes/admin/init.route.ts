import { Router } from "express";
import * as initController from "../../controllers/admin/init.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Admin-Init
 *   description: System initialization and status management
 */

/**
 * @swagger
 * /init:
 *   post:
 *     summary: Initialize the exam system with configuration
 *     tags: [Admin-Init]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               testTitle:
 *                 type: string
 *               description:
 *                 type: string
 *               judgerSettings:
 *                 type: object
 *                 properties:
 *                   timeLimit:
 *                     type: number
 *                   memoryLimit:
 *                     type: number
 *               accessibleUsers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *               puzzles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     language:
 *                       type: string
 *                     timeLimit:
 *                       type: number
 *                     memoryLimit:
 *                       type: number
 *                     subtasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           visible:
 *                             type: array
 *                             items:
 *                               $ref: '#/components/schemas/TestCase'
 *                           hidden:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/TestCase'
 *     responses:
 *       200:
 *         description: Exam system initialized successfully
 *       400:
 *         description: Invalid configuration
 */
router.post("/init", initController.init);

/**
 * @swagger
 * /reset:
 *   post:
 *     summary: Reset the system (clear data)
 *     tags: [Admin-Init]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clearSettings:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: System reset successfully
 */
router.post("/reset", initController.reset);

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Get current exam status
 *     tags: [Admin-Init]
 *     responses:
 *       200:
 *         description: Current status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: ok
 *                 data:
 *                   type: object
 *                   properties:
 *                     exam_status:
 *                       type: boolean
 */
router.get("/status", initController.getStatus);

/**
 * @swagger
 * /status:
 *   put:
 *     summary: Update exam status (start/stop)
 *     tags: [Admin-Init]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exam_status:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Exam status updated successfully
 */
router.put("/status", initController.updateStatus);

export default router;
