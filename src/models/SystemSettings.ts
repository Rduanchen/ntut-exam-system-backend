import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'system_settings', timestamps: false })
export class SystemSettings extends Model {
    @Column({ primaryKey: true, autoIncrement: true })
    id!: number;

    @Column(DataType.STRING)
    name!: string;

    @Column(DataType.TEXT)
    value!: string;
}