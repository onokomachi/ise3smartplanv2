import type { TestType } from './types';

export const DEFAULT_SUBJECTS = ["国語", "数学", "理科", "社会", "英語", "音楽・保体", "技術・家庭"];

export const WEEK_DAYS = [
  { id: 1, name: "月" },
  { id: 2, name: "火" },
  { id: 3, name: "水" },
  { id: 4, name: "木" },
  { id: 5, name: "金" },
  { id: 6, name: "土" },
  { id: 0, name: "日" },
];

export const STUDY_CAPACITY_OPTIONS = [
    { value: 1, label: "終日可" },
    { value: 0.5, label: "少しだけ" },
    { value: 0, label: "不可" },
];

export const TEST_TYPES: TestType[] = [
    "1学期中間テスト",
    "1学期期末テスト",
    "2学期中間テスト",
    "2学期期末テスト",
    "3学期期末テスト",
];
