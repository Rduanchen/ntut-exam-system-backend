import { PistonExecutionRequest, JudgeResult } from "piston-judger";


export interface PistonSubtaskReply {
  title: string;
  visible: JudgeResult[];
  hidden: JudgeResult[];
}

export interface ExecutionRequest extends Omit<
  PistonExecutionRequest,
  "files"
> {
  files?: { name?: string; content: string }[]; // 程式碼檔案陣列
  compare_mode?: string; // 比對模式
}
