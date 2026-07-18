/**
 * 回归测试：storage.js 修复验证
 * 修复点 #1 — fileToBase64 使用 MAX_ATTACHMENT_SIZE 常量（不再硬编码）
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MAX_ATTACHMENT_SIZE } from '../data/constants';
import { fileToBase64, generateId, loadOrders, saveOrders } from '../utils/storage';

describe('storage.js — 回归验证', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ========================
  // 修复点 #1：fileToBase64 使用 MAX_ATTACHMENT_SIZE 常量
  // ========================
  describe('fileToBase64 — 使用 MAX_ATTACHMENT_SIZE 常量', () => {
    it('小于 5MB 的文件能正常转为 Base64', async () => {
      const content = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const smallFile = new File([content], 'small.txt', { type: 'text/plain' });
      const result = await fileToBase64(smallFile);
      expect(result).toContain('data:text/plain;base64');
    });

    it('等于 5MB 时应该通过（不拒绝，因为不超过限制）', async () => {
      // file.size > MAX_ATTACHMENT_SIZE 才拒绝，等于时不拒绝
      const buffer = new ArrayBuffer(MAX_ATTACHMENT_SIZE);
      const exactFile = new File([buffer], 'exact.bin', { type: 'application/octet-stream' });
      const result = await fileToBase64(exactFile);
      expect(result).toBeTruthy();
    });

    it('超过 5MB 的文件应该被拒绝', async () => {
      const buffer = new ArrayBuffer(MAX_ATTACHMENT_SIZE + 1);
      const largeFile = new File([buffer], 'large.bin', { type: 'application/octet-stream' });
      await expect(fileToBase64(largeFile)).rejects.toThrow('文件大小不能超过 5MB');
    });

    it('恰好 1 字节小于限制时应该通过', async () => {
      const buffer = new ArrayBuffer(MAX_ATTACHMENT_SIZE - 1);
      const borderlineFile = new File([buffer], 'borderline.bin', { type: 'application/octet-stream' });
      const result = await fileToBase64(borderlineFile);
      expect(result).toBeTruthy();
    });
  });

  // ========================
  // 通用功能验证（确保修复没破坏原有功能）
  // ========================
  describe('loadOrders / saveOrders', () => {
    it('空 localStorage 时应返回空数组', () => {
      const orders = loadOrders();
      expect(orders).toEqual([]);
    });

    it('保存后能正确读取订单数据', () => {
      const testOrders = [{ id: '1', customerName: 'Test' }];
      saveOrders(testOrders);
      const loaded = loadOrders();
      expect(loaded).toEqual(testOrders);
    });

    it('localStorage 包含非法 JSON 时返回空数组', () => {
      localStorage.setItem('order_tracking_orders', 'invalid json{{{');
      const orders = loadOrders();
      expect(orders).toEqual([]);
    });

    it('localStorage 包含非数组 JSON 时返回空数组', () => {
      localStorage.setItem('order_tracking_orders', '{"not": "array"}');
      const orders = loadOrders();
      expect(orders).toEqual([]);
    });
  });

  describe('generateId', () => {
    it('生成的 ID 是字符串类型', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    it('生成的 ID 唯一（连续 100 次不重复）', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });
});
