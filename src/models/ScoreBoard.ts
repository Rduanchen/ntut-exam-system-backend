import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({ tableName: "score_boards", timestamps: false })
export class ScoreBoard extends Model {
  @Column({ type: DataType.INTEGER, primaryKey: true, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare student_ID: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare student_name: string;

  @Column({ type: DataType.DATE, allowNull: true })
  declare last_submit_time: Date | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare subtask_amount: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare passed_subtask_amount: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare puzzle_amount: number;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare passed_puzzle_amount: number;

  @Column({
    type: DataType.JSON,
    allowNull: false,
    defaultValue: {},
  })
  // Note: historically this stored a very small structure, but we now treat it as
  // a flexible JSON payload (e.g. test-case results + special-rule results).
  // Keep it permissive at the model layer; validation is done at the API boundary.
  declare puzzle_results: Record<string, unknown>;
}
