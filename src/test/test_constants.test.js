/**
 * 回归测试 + 超期高亮常量验证
 * 验证所有 constants.js 导出的常量值正确
 */
import { describe, it, expect } from 'vitest';
import {
  MAX_ATTACHMENT_SIZE,
  STATUS_NODES,
  TRADE_TERMS,
  OVERDUE_RED_BG,
  STALE_YELLOW_BG,
  STALE_DAYS_THRESHOLD,
  OVERDUE_EXEMPT_STATUSES,
} from '../data/constants';

describe('constants.js — 回归验证', () => {
  it('MAX_ATTACHMENT_SIZE 应该等于 5MB (5 * 1024 * 1024)', () => {
    expect(MAX_ATTACHMENT_SIZE).toBe(5 * 1024 * 1024); // 5242880 bytes
  });

  it('MAX_ATTACHMENT_SIZE 应该是 number 类型', () => {
    expect(typeof MAX_ATTACHMENT_SIZE).toBe('number');
  });

  it('STATUS_NODES 包含 6 个状态节点', () => {
    expect(STATUS_NODES).toHaveLength(6);
    expect(STATUS_NODES).toEqual([
      '已接单', '生产中', '验货', '待出货', '已出货', '已收款',
    ]);
  });

  it('TRADE_TERMS 包含常用贸易术语', () => {
    expect(TRADE_TERMS).toContain('FOB');
    expect(TRADE_TERMS).toContain('CIF');
    expect(TRADE_TERMS).toHaveLength(6);
  });
});

describe('constants.js — 超期高亮新增常量 (V2.2)', () => {
  it('OVERDUE_RED_BG 应为 #FFF0F0（AC-1 红色预警背景色）', () => {
    expect(OVERDUE_RED_BG).toBe('#FFF0F0');
    expect(typeof OVERDUE_RED_BG).toBe('string');
  });

  it('STALE_YELLOW_BG 应为 #FFFDE7（AC-2 黄色预警背景色）', () => {
    expect(STALE_YELLOW_BG).toBe('#FFFDE7');
    expect(typeof STALE_YELLOW_BG).toBe('string');
  });

  it('STALE_DAYS_THRESHOLD 应为 7（黄色预警阈值天数）', () => {
    expect(STALE_DAYS_THRESHOLD).toBe(7);
    expect(typeof STALE_DAYS_THRESHOLD).toBe('number');
  });

  it('OVERDUE_EXEMPT_STATUSES 应为 [\'已出货\', \'已收款\']（红色豁免状态）', () => {
    expect(OVERDUE_EXEMPT_STATUSES).toEqual(['已出货', '已收款']);
    expect(OVERDUE_EXEMPT_STATUSES).toHaveLength(2);
    expect(Array.isArray(OVERDUE_EXEMPT_STATUSES)).toBe(true);
  });

  it('OVERDUE_EXEMPT_STATUSES 中的状态必须存在于 STATUS_NODES', () => {
    for (const exemptStatus of OVERDUE_EXEMPT_STATUSES) {
      expect(STATUS_NODES).toContain(exemptStatus);
    }
  });

  it('红/黄背景色不同，避免视觉效果混淆', () => {
    expect(OVERDUE_RED_BG).not.toBe(STALE_YELLOW_BG);
  });
});
