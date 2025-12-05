import path from "path";
import fs from "fs";
import unzipper from "unzipper";

class CodeStorage {
    async getAllZipFiles(dir) {
        let zipFiles = [];

        function traverse(currentPath) {
            const files = fs.readdirSync(currentPath);
            for (const file of files) {
                const fullPath = path.join(currentPath, file);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    traverse(fullPath); // 遞迴子目錄
                } else if (path.extname(file).toLowerCase() === '.zip') {
                    const fileNameWithoutExt = path.basename(file, '.zip')
                    zipFiles.push(fileNameWithoutExt); // 存完整路徑
                }
            }
        }

        traverse(dir);
        return zipFiles;
    }
    async unzipGetFileAsString(zipFilePath, targetPath, encoding: BufferEncoding = 'utf8') {
        return new Promise((resolve, reject) => {
            let found = false;

            fs.createReadStream(zipFilePath)
                .on('error', reject)
                .pipe(unzipper.Parse())
                .on('entry', async (entry) => {
                    const { path, type } = entry;
                    if (type === 'File' && path === targetPath) {
                        found = true;
                        try {
                            const chunks = [];
                            for await (const chunk of entry) {
                                chunks.push(chunk);
                            }
                            const buf = Buffer.concat(chunks);
                            resolve(buf.toString(encoding));
                        } catch (e) {
                            entry.autodrain();
                            reject(e);
                        }
                    } else {
                        // 非目標檔案或目錄，直接排水避免佔記憶體
                        entry.autodrain();
                    }
                })
                .on('close', () => {
                    if (!found) reject(new Error(`Target file not found in zip: ${targetPath}`));
                })
                .on('error', reject);
        });
    }

}
const codeStorage = new CodeStorage();
export default codeStorage;