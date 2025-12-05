import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { ScoreBoard } from '../models/ScoreBoard';
import { UserActionLog } from '../models/UserActionLog';
import { SystemSettings } from '../models/SystemSettings';

dotenv.config();

export const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'myuser',
    password: process.env.DB_PASS || 'mypassword',
    database: process.env.DB_NAME || 'mydatabase',

    // 註冊所有 Models
    models: [ScoreBoard, UserActionLog, SystemSettings],

    logging: false, // 是否在 console 印出 SQL

    // 連線池設定 (Connection Pool)
    pool: {
        max: 20,      // 最大連線數
        min: 0,       // 最小連線數
        acquire: 30000,
        idle: 10000
    }
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`✅ 資料庫連線成功 (Port: ${process.env.DB_PORT})`);
        // 同步 Table 結構 (開發階段使用，會自動建表)
        await sequelize.sync({ alter: true });
        console.log('✅ 資料庫模型同步完成');
    } catch (error) {
        console.error('❌ 資料庫連線失敗:', error);
        process.exit(1);
    }
};