import { Table, Column, Model, DataType } from 'sequelize-typescript';

export type AlertType = 'duplicate ip devices' | 'Try to quit the app';

@Table({ tableName: 'alert_logs', timestamps: false })
export class AlertLog extends Model {
    @Column({ primaryKey: true, type: DataType.UUID, defaultValue: DataType.UUIDV4 })
    id!: string;

    // timestamp of the alert record (defaults to "now")
    @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
    time!: Date;

    @Column(DataType.STRING)
    studentID!: string;

    @Column(DataType.STRING)
    type!: AlertType;

    // the id of the originating user_action_logs row
    @Column(DataType.STRING)
    messageID!: string;

    @Column(DataType.STRING)
    ip!: string;

    @Column(DataType.TEXT)
    messeage!: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    is_ok!: boolean;
}