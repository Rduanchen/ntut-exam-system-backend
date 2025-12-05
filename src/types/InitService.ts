// 定義輸入資料的介面
export interface TestCase {
  id: string | number;
  input: string;
  output: string;
}
export interface TestGroup {
  title: string;
  id: number;
  openTestCases: TestCase[];
  hiddenTestCases: TestCase[];
}
export interface PuzzleConfig {
  id: string;
  name: string;
  language: string;
  testCases: TestGroup[];
}
export interface StudentInfo {
  student_ID: string;
  name: string;
}

// ----

// Test time settings
export interface TestTime {
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  forceQuit: boolean;
}

export interface AccessableUser {
  id: string;
  name: string;
}

// 整體 config 物件
export interface TestConfig {
  testTitle: string;
  description: string;
  publicKey: string;
  remoteHost: string;
  accessableUsers: AccessableUser[];
  testTime: TestTime;
  puzzles: PuzzleConfig[];
}

export interface ClientStudentInformation {
  name: string;
  id: string;
}
