import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { ScoreBoard } from '../models/ScoreBoard';
import { UserActionLog } from '../models/UserActionLog';
import { SystemSettings } from '../models/SystemSettings';
import { AlertLog } from '../models/AlertLog'; // 新增這行，路徑依實際檔案放置調整

dotenv.config();

export const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'myuser',
    password: process.env.DB_PASS || 'mypassword',
    database: process.env.DB_NAME || 'mydatabase',

    // 註冊所有 Models
    models: [ScoreBoard, UserActionLog, SystemSettings, AlertLog], // 加入 AlertLog

    logging: false,

    pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log(`✅ 資料庫連線成功 (Port: ${process.env.DB_PORT})`);
        await sequelize.sync({ alter: true }); // 開發階段自動建表/調整
        console.log('✅ 資料庫模型同步完成');
    } catch (error) {
        console.error('❌ 資料庫連線失敗:', error);
        process.exit(1);
    }
};