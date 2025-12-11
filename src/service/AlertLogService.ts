import { AlertLog, AlertType } from "../models/AlertLog";
import userLogService from "./UserLogService";
import socketService from "../socket/SocketService";

export interface AlertInput {
    studentID: string;
    type: AlertType;
    messageID: string;
    time: Date;
    ip: string;
    messeage: string;
}

export class AlertLogService {
    /**
     * Bulk add alerts from checkSecurityAlerts results.
     * Skips if an alert with the same studentID + type + messageID already exists
     * (especially those already marked is_ok).
     */
    async addFromAlerts(alerts: AlertInput[]) {
        const created: AlertLog[] = [];
        for (const alert of alerts) {
            const exists = await AlertLog.findOne({
                where: {
                    studentID: alert.studentID,
                    type: alert.type,
                    messageID: alert.messageID,
                },
            });
            if (exists) continue;

            const record = await AlertLog.create({
                ...alert,
                time: alert.time ?? new Date(),
            });
            created.push(record);
        }
        return created;
    }

    async addLog(alert: AlertInput) {
        const record = await AlertLog.create({
            ...alert,
            time: alert.time ?? new Date(),
        });
        return record;
    }

    async deleteLog(id: string) {
        const count = await AlertLog.destroy({ where: { id } });
        return count > 0;
    }

    async setOkStatus(id: string, isOk: boolean) {
        const [count] = await AlertLog.update({ is_ok: isOk }, { where: { id } });
        return count > 0;
    }

    async getAll() {
        return AlertLog.findAll({ order: [['time', 'DESC']] });
    }

    async getById(id: string) {
        return AlertLog.findByPk(id);
    }

    async updateAndCheckAlerts() {
        const alerts = await userLogService.checkSecurityAlerts();
        const createdAlerts = await this.addFromAlerts(alerts);
        console.dir(alerts, { depth: null });
        socketService.triggerAlertEvent(createdAlerts);
        return createdAlerts;
    }
}

const alertLogService = new AlertLogService();
export default alertLogService;