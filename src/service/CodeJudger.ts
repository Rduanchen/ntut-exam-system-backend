import axios from 'axios';
import systemSettingsService from "../service/SystemSettingsServices";
import { TestConfig } from '../types/InitService';
import codeStorage from './CodeStorage';


const JUDGER_URL = process.env.JUDGER_URL || 'http://localhost:2358';

// 從環境變數讀取限制（可選）
const CPU_TIME_LIMIT_MS = process.env.JUDGE_CPU_TIME_LIMIT_MS
    ? Number(process.env.JUDGE_CPU_TIME_LIMIT_MS)
    : 10000; // 預設 10 秒
const WALL_TIME_LIMIT_MS = process.env.JUDGE_WALL_TIME_LIMIT_MS
    ? Number(process.env.JUDGE_WALL_TIME_LIMIT_MS)
    : 15000; // 預設 15 秒
const MEMORY_LIMIT_KB = process.env.JUDGE_MEMORY_LIMIT_KB
    ? Number(process.env.JUDGE_MEMORY_LIMIT_KB)
    : 102400; // 預設 100 MB

export type TestCase = {
    id: string;
    input: string;
    output?: string;
};

export type MappedResult = {
    id: string;
    correct: boolean;
    userOutput: string;
};

// 參考 Judge0 典型回傳欄位型別（批次）
type Judge0Status = {
    id: number;
    description: string;
};

type Judge0SubmissionResult = {
    token: string;
    stdout?: string | null;
    stderr?: string | null;
    compile_output?: string | null;
    status?: Judge0Status;
    time?: string;
    memory?: number;
};

type EvaluateOptions = {
    languageId?: number; // 預設 71 = Python 3
};

/**
 * 以 Judge0 進行程式評測並映射回指定格式（使用 axios，TS + ES6）
 *
 * - 使用批次提交 + wait=true，在一次請求中取得所有測資結果
 * - 讀取環境變數設定資源限制（CPU 時間、牆鐘時間、記憶體）
 * - 遇到任何錯誤（超時、編譯錯、執行錯等）時，將錯誤訊息字串放入 userOutput
 */


export async function judgeAllCodeInStorage() {

},

export async function getTestCases(questionID: string): Promise<TestCase[]> {
    const config = await systemSettingsService.getConfig();
    if (!config) {
        throw new Error('No config found');
    }
    const puzzles = config.puzzles;
    let testCases: TestCase[] = [];
    for (const question of puzzles) {
        if (question.id !== questionID) {
            continue;
        }
        for (const group of question.testCases) {
            for (const openTestCase of group.openTestCases) {
                testCases.push({
                    id: openTestCase.id as string,
                    input: openTestCase.input,
                    output: openTestCase.output,
                });
            }
            for (const hiddenTestCase of group.hiddenTestCases) {
                testCases.push({
                    id: hiddenTestCase.id as string,
                    input: hiddenTestCase.input,
                    output: hiddenTestCase.output,
                });
            }
        }
    }
    return testCases;
}
export async function judgeSingleCode(
    sourceCode: string,
    testCases: TestCase[],
    options: EvaluateOptions = {},
): Promise<MappedResult[]> {
    if (!Array.isArray(testCases) || testCases.length === 0) {
        throw new Error('testCases 必須是非空陣列');
    }

    const { languageId = 71 } = options; // 預設 Python 3

    const url = `${JUDGER_URL}/submissions?base64_encoded=false&wait=true`;

    // 構建提交 payload
    const submissions = testCases.map(tc => {
        const payload: Record<string, unknown> = {
            language_id: languageId,
            source_code: sourceCode,
            stdin: tc.input ?? '',
        };

        if (typeof tc.output === 'string') {
            payload.expected_output = tc.output;
        }
        // 資源限制（不同部署/版本支援程度可能不同）
        if (typeof CPU_TIME_LIMIT_MS === 'number') {
            payload.cpu_time_limit = CPU_TIME_LIMIT_MS / 1000; // 多數部署使用秒
        }
        if (typeof WALL_TIME_LIMIT_MS === 'number') {
            payload.wall_time_limit = WALL_TIME_LIMIT_MS / 1000; // 若部署支援
        }
        if (typeof MEMORY_LIMIT_KB === 'number') {
            payload.memory_limit = MEMORY_LIMIT_KB; // KB
        }
        return payload;
    });

    let results: Judge0SubmissionResult[];
    try {
        const resp = await axios.post<Judge0SubmissionResult[]>(
            url,
            { submissions },
            {
                headers: { 'Content-Type': 'application/json' },
                // axios 客戶端超時（非 Judge0 的 wall_time_limit）
                timeout: (WALL_TIME_LIMIT_MS && Number(WALL_TIME_LIMIT_MS)) || 30000,
            },
        );
        results = resp.data;
    } catch (err: unknown) {
        // 將請求層錯誤轉換為指定格式（全部測資都視為錯誤）
        const message = getAxiosErrorMessage(err);
        return testCases.map(tc => ({
            id: tc.id,
            correct: false,
            userOutput: String(message),
        }));
    }

    const normalize = (s: unknown) =>
        typeof s === 'string' ? s.replace(/\r\n/g, '\n').trimEnd() : s;

    // 映射到指定格式
    return results.map((r, idx) => {
        const tc = testCases[idx];
        const stdout = r.stdout ?? '';
        const stderr = r.stderr ?? '';
        const compileOutput = r.compile_output ?? '';
        const statusDesc = r.status?.description || '';
        const isError = r.status?.id !== 3; // 3 = Accepted

        let userOutput: string;
        if (isError) {
            userOutput =
                (compileOutput && compileOutput.trim()) ||
                (stderr && stderr.trim()) ||
                statusDesc ||
                'Runtime Error';
        } else {
            userOutput = (stdout ?? '').toString();
        }

        const correct =
            typeof tc.output === 'string'
                ? normalize(stdout) === normalize(tc.output)
                : !isError;

        return {
            id: tc.id,
            correct,
            userOutput: String(userOutput),
        };
    });
}

/** 取得 axios 錯誤訊息（盡量轉為可讀字串） */
function getAxiosErrorMessage(err: unknown): string {
    if (isAxiosError(err)) {
        const data = err.response?.data;
        if (typeof data === 'string') return data;
        if (data && typeof data === 'object') return JSON.stringify(data);
        return err.message || 'Request Error';
    }
    if (err instanceof Error) return err.message;
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
}

/** Type guard for AxiosError without importing axios types globally */
function isAxiosError<T = unknown>(
    error: unknown,
): error is { response?: { data?: T }; message?: string } {
    return typeof error === 'object' && error !== null && 'message' in error;
}