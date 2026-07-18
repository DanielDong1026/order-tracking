/**
 * 常量验证：APP_NAME 新增字段
 * 验证 constants.js 中 APP_NAME 的正确性
 */
import { describe, it, expect } from 'vitest';
import {
  APP_NAME,
  STATUS_NODES,
  STATUS_COLORS,
  STATUS_CHIP_COLORS,
} from '../data/constants';

describe('constants.js — APP_NAME (V2.3 新增)', () => {
  it('APP_NAME 应为 "外贸跟单系统"', () => {
    expect(APP_NAME).toBe('外贸跟单系统');
  });

  it('APP_NAME 应为 string 类型', () => {
    expect(typeof APP_NAME).toBe('string');
  });

  it('APP_NAME 不应为空字符串', () => {
    expect(APP_NAME.length).toBeGreaterThan(0);
  });

  it('APP_NAME 应为 export 导出（能正常 import）', () => {
    expect(APP_NAME).toBeDefined();
  });
});

describe('constants.js — 回归验证：原有常量未被破坏', () => {
  it('STATUS_NODES 仍为 6 个状态', () => {
    expect(STATUS_NODES).toHaveLength(6);
    expect(STATUS_NODES).toEqual([
      '已接单', '生产中', '验货', '待出货', '已出货', '已收款',
    ]);
  });

  it('STATUS_COLORS 包含全部 6 个状态的映射', () => {
    for (const status of STATUS_NODES) {
      expect(STATUS_COLORS[status]).toBeDefined();
      expect(typeof STATUS_COLORS[status]).toBe('string');
    }
  });

  it('STATUS_CHIP_COLORS 包含全部 6 个状态的映射', () => {
    for (const status of STATUS_NODES) {
      expect(STATUS_CHIP_COLORS[status]).toBeDefined();
    }
  });
});
