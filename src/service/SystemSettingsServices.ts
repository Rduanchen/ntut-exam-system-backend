import { Config } from "sequelize/types/sequelize";
import { SystemSettings } from "../models/SystemSettings";
import { TestConfig, StudentInfo } from "../types/InitService";

export class SystemSettingsService {
  /**
   * 1. 新增一個 setting
   * 注意：如果該 name 已存在，根據資料庫設定可能會拋出 Error (如果 name 設為 unique)
   * 或是重複建立 (如果沒有 unique constraint)。
   * 建議在 SystemSettings Model 的 name 欄位加上 unique: true
   */
  async saveConfig(value: TestConfig) {
    // check if config already exists
    const existing = await SystemSettings.findOne({
      where: { name: "config" },
    });
    if (existing) {
      return this.updateSetting("config", JSON.stringify(value));
    }
    return await this.createSetting("config", JSON.stringify(value));
  }
  async getConfig(): Promise<TestConfig | null> {
    const setting = await this.getSetting("config");
    if (setting) {
      return JSON.parse(setting) as TestConfig;
    }
    return null;
  }
  async saveStudentList(value: StudentInfo[]) {
    // check if student_list already exists
    const existing = await SystemSettings.findOne({
      where: { name: "student_list" },
    });
    if (existing) {
      return this.updateSetting("student_list", JSON.stringify(value));
    }
    return await this.createSetting("student_list", JSON.stringify(value));
  }
  async getStudentList(): Promise<StudentInfo[] | null> {
    const setting = await this.getSetting("student_list");
    if (setting) {
      return JSON.parse(setting) as StudentInfo[];
    }
    return null;
  }
  async getStudentInfo(studentID: string): Promise<StudentInfo | false> {
    const studentList = await this.getStudentList();
    if (!studentList) {
      return false;
    }
    const userInfo = studentList.find((user) => user.student_ID === studentID);
    return userInfo
  }
  async createSetting(name: string, value: string) {
    try {
      // 檢查是否已存在 (為了避免重複建立，先查一次是比較安全的作法)
      const existing = await SystemSettings.findOne({ where: { name } });
      if (existing) {
        console.warn(`⚠️ Setting '${name}' 已經存在，請使用 updateSetting`);
        return null;
      }

      const setting = await SystemSettings.create({ name, value });
      console.log(`✅ Setting '${name}' 已建立`);
      return setting;
    } catch (error) {
      console.error(`❌ Create setting '${name}' failed:`, error);
      throw error;
    }
  }

  /**
   * 2. 更新一個 setting
   */
  async updateSetting(name: string, value: string) {
    try {
      const [affectedCount] = await SystemSettings.update(
        { value },
        { where: { name } }
      );

      if (affectedCount === 0) {
        console.warn(`⚠️ Update 失敗: 找不到名為 '${name}' 的設定`);
        return false;
      }

      console.log(`✅ Setting '${name}' 已更新為 '${value}'`);
      return true;
    } catch (error) {
      console.error(`❌ Update setting '${name}' failed:`, error);
      throw error;
    }
  }

  /**
   * 3. 取得一個 setting
   * 回傳設定的 value (字串)，若找不到則回傳 null
   */
  async getSetting(name: string): Promise<string | null> {
    try {
      const setting = await SystemSettings.findOne({
        where: { name },
      });

      if (!setting) {
        // 視業務邏輯而定，有時找不到設定回傳 null 即可，不需要印 error
        return null;
      }

      return setting.value;
    } catch (error) {
      console.error(`❌ Get setting '${name}' failed:`, error);
      throw error;
    }
  }

  /**
   * 4. 刪除一個 setting
   */
  async deleteSetting(name: string) {
    try {
      const deletedCount = await SystemSettings.destroy({
        where: { name },
      });

      if (deletedCount === 0) {
        console.warn(`⚠️ Delete 失敗: 找不到名為 '${name}' 的設定`);
        return false;
      }

      console.log(`✅ Setting '${name}' 已刪除`);
      return true;
    } catch (error) {
      console.error(`❌ Delete setting '${name}' failed:`, error);
      throw error;
    }
  }
}

const systemSettingsService = new SystemSettingsService();
export default systemSettingsService;
