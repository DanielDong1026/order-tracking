/**
 * 回归测试：DEFAULT_ORDER_FORM 新增 tags 字段验证
 *
 * 测试覆盖：
 * - DEFAULT_ORDER_FORM 包含 tags 字段
 * - tags 默认值为空数组
 * - 其他常量未被破坏
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ORDER_FORM,
  STATUS_NODES,
  TRADE_TERMS,
  STATUS_COLORS,
  MAX_ATTACHMENT_SIZE,
  PASTE_HINT_TEXT,
  PASTE_ATTACHMENT_PREFIX,
  APP_NAME,
} from '../data/constants';

describe('DEFAULT_ORDER_FORM — tags 字段验证 (V2.4)', () => {
  it('DEFAULT_ORDER_FORM 应包含 tags 字段', () => {
    expect(DEFAULT_ORDER_FORM).toHaveProperty('tags');
  });

  it('tags 默认值应为空数组 []', () => {
    expect(DEFAULT_ORDER_FORM.tags).toEqual([]);
  });

  it('tags 应是数组类型', () => {
    expect(Array.isArray(DEFAULT_ORDER_FORM.tags)).toBe(true);
  });

  it('修改 tags 默认值不应影响常量（引用隔离）', () => {
    const copy = { ...DEFAULT_ORDER_FORM, tags: [...DEFAULT_ORDER_FORM.tags] };
    copy.tags.push('#test');
    // 原始常量不应被修改
    expect(DEFAULT_ORDER_FORM.tags).toEqual([]);
    expect(copy.tags).toEqual(['#test']);
  });
});

describe('constants.js — 回归验证（确认原有常量未被破坏）', () => {
  it('STATUS_NODES 仍为 6 个状态', () => {
    expect(STATUS_NODES).toHaveLength(6);
    expect(STATUS_NODES).toEqual([
      '已接单', '生产中', '验货', '待出货', '已出货', '已收款',
    ]);
  });

  it('TRADE_TERMS 仍为 6 个术语', () => {
    expect(TRADE_TERMS).toHaveLength(6);
    expect(TRADE_TERMS).toContain('FOB');
    expect(TRADE_TERMS).toContain('CIF');
  });

  it('STATUS_COLORS 包含 6 个状态的颜色映射', () => {
    expect(Object.keys(STATUS_COLORS)).toHaveLength(6);
    for (const status of STATUS_NODES) {
      expect(STATUS_COLORS).toHaveProperty(status);
    }
  });

  it('MAX_ATTACHMENT_SIZE 仍为 5MB', () => {
    expect(MAX_ATTACHMENT_SIZE).toBe(5 * 1024 * 1024);
  });

  it('PASTE_HINT_TEXT 和 PASTE_ATTACHMENT_PREFIX 存在', () => {
    expect(typeof PASTE_HINT_TEXT).toBe('string');
    expect(typeof PASTE_ATTACHMENT_PREFIX).toBe('string');
  });

  it('APP_NAME 仍为 外贸跟单系统', () => {
    expect(APP_NAME).toBe('外贸跟单系统');
  });
});
