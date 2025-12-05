import { UserActionLog } from '../models/UserActionLog';
import { Sequelize } from 'sequelize-typescript';

// 定義新增 Log 的參數介面
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
            // 檢查 A: 一個學生使用超過 2 個不同的 IP
            // SQL 邏輯: SELECT student_ID, COUNT(DISTINCT ip_address) FROM logs GROUP BY student_ID HAVING COUNT > 2
            const suspiciousStudents = await UserActionLog.findAll({
                attributes: [
                    'student_ID',
                    [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('ip_address'))), 'unique_ip_count']
                ],
                group: ['student_ID'],
                having: Sequelize.literal('COUNT(DISTINCT ip_address) > 2'),
                raw: true, // 直接回傳純 JSON 物件，方便處理
            });

            // 檢查 B: 一個 IP 被超過 2 個不同的學生使用
            // SQL 邏輯: SELECT ip_address, COUNT(DISTINCT student_ID) FROM logs GROUP BY ip_address HAVING COUNT > 2
            const suspiciousIps = await UserActionLog.findAll({
                attributes: [
                    'ip_address',
                    [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('student_ID'))), 'unique_student_count']
                ],
                group: ['ip_address'],
                having: Sequelize.literal('COUNT(DISTINCT student_ID) > 2'),
                raw: true,
            });

            // 如果有發現異常，印出警告
            if (suspiciousStudents.length > 0 || suspiciousIps.length > 0) {
                console.warn('🚨 SECURITY ALERT TRIGGERED 🚨');
            }

            return {
                suspiciousStudents, // 格式: [{ student_ID: 'S123', unique_ip_count: '3' }, ...]
                suspiciousIps,      // 格式: [{ ip_address: '192.168.1.1', unique_student_count: '5' }, ...]
            };

        } catch (error) {
            console.error('❌ Security check failed:', error);
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