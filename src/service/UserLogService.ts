import { UserActionLog } from '../models/UserActionLog';
import { Sequelize } from 'sequelize-typescript';

interface CreateLogInput {
    student_ID: string;
    ip_address: string;
    action_type: string;
    details: string;
}

export class UserLogService {
    /**
     * 1. 新增一筆資料
     */
    async createLog(data: CreateLogInput) {
        try {
            const log = await UserActionLog.create({
                ...data,
                timestamp: new Date(), // 確保寫入當下時間
            });
            console.log(`✅ Log created for ${data.student_ID}`);
            return log;
        } catch (error) {
            console.error('❌ Create log failed:', error);
            throw error;
        }
    }

    /**
     * 2. 刪除資料 by id
     */
    async deleteLogById(id: number) {
        try {
            const count = await UserActionLog.destroy({
                where: { id },
            });
            if (count === 0) {
                console.log(`⚠️ No log found with id: ${id}`);
                return false;
            }
            console.log(`✅ Log ${id} deleted`);
            return true;
        } catch (error) {
            console.error('❌ Delete log failed:', error);
            throw error;
        }
    }

    /**
     * 3. 篩選資料：單一學生的所有紀錄
     */
    async getLogsByStudent(studentID: string) {
        try {
            const logs = await UserActionLog.findAll({
                where: { student_ID: studentID },
                order: [['timestamp', 'DESC']], // 依時間倒序
            });
            return logs;
        } catch (error) {
            console.error('❌ Get logs by student failed:', error);
            throw error;
        }
    }

    /**
     * 4. 篩選資料：單一 IP 的所有紀錄
     */
    async getLogsByIp(ipAddress: string) {
        try {
            const logs = await UserActionLog.findAll({
                where: { ip_address: ipAddress },
                order: [['timestamp', 'DESC']],
            });
            return logs;
        } catch (error) {
            console.error('❌ Get logs by IP failed:', error);
            throw error;
        }
    }

    /**
     * 5. Alert 檢查功能
     * 回傳符合條件的學號以及 IP
     */
    async checkSecurityAlerts() {
        try {
            type AlertItem = {
                studentID: string;
                type: 'duplicate ip devices' | 'Try to quit the app';
                messageID: string;
                time: Date;
                ip: string;
                messeage: string;
            };

            const alerts: AlertItem[] = [];

            // A: 一個學生使用超過 2 個不同的 IP
            const suspiciousStudents = await UserActionLog.findAll({
                attributes: [
                    'student_ID',
                    [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('ip_address'))), 'unique_ip_count'],
                ],
                group: ['student_ID'],
                having: Sequelize.where(
                    Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('ip_address'))),
                    '>=',
                    2
                ),
                raw: true,
            });

            if (suspiciousStudents.length > 0) {
                const studentIDs = suspiciousStudents.map((s: any) => s.student_ID);
                // 取每個學生最新的一筆紀錄作為 alert 的訊息來源
                const latestLogs = await UserActionLog.findAll({
                    where: { student_ID: studentIDs },
                    order: [['student_ID', 'ASC'], ['timestamp', 'DESC']],
                    raw: true,
                });

                const seen = new Set<string>();
                for (const log of latestLogs) {
                    if (seen.has(log.student_ID)) continue;
                    seen.add(log.student_ID);
                    alerts.push({
                        studentID: log.student_ID,
                        type: 'duplicate ip devices',
                        messageID: String(log.id),
                        time: log.timestamp,
                        ip: log.ip_address,
                        messeage: log.details,
                    });
                }
            }

            // B: detail 包含 "Application On Quit"
            const quitLogs = await UserActionLog.findAll({
                where: Sequelize.where(
                    Sequelize.fn('LOWER', Sequelize.col('details')),
                    'LIKE',
                    '%application on quit%'
                ),
                order: [['timestamp', 'DESC']],
                raw: true,
            });

            for (const log of quitLogs) {
                alerts.push({
                    studentID: log.student_ID,
                    type: 'Try to quit the app',
                    messageID: String(log.id),
                    time: log.timestamp,
                    ip: log.ip_address,
                    messeage: log.details,
                });
            }

            if (alerts.length > 0) {
                console.warn('🚨 SECURITY ALERT TRIGGERED 🚨');
            }

            return alerts;
        } catch (error) {
            console.error('❌ Security check failed:', error);
            throw error;
        }
    }

    async getAllLogs() {
        try {
            const logs = await UserActionLog.findAll({
                order: [['timestamp', 'DESC']],
            });
            return logs;
        } catch (error) {
            console.error('❌ Get all logs failed:', error);
            throw error;
        }
    }

    /**
     * 6. 清空該表單
     */
    async clearAllLogs() {
        try {
            await UserActionLog.destroy({
                where: {},
                truncate: true, // 快速清空並重置 ID
            });
            console.log('✅ All logs cleared');
        } catch (error) {
            console.error('❌ Clear logs failed:', error);
            throw error;
        }
    }
}

const userLogService = new UserLogService();
export default userLogService;