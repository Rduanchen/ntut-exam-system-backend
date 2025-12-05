import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "user_action_logs", timestamps: false })
export class UserActionLog extends Model {
  @Column({ primaryKey: true, autoIncrement: true })
  id!: number;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  timestamp!: Date;

  @Column(DataType.STRING)
  student_ID!: string;

  @Column(DataType.STRING)
  ip_address!: string;

  @Column(DataType.STRING)
  action_type!: string;

  @Column(DataType.TEXT)
  details!: string;
}
