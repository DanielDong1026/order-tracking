/**
 * 单元测试：utils/share.js 工具函数
 * 覆盖 generateShareToken、buildShareUrl、copyToClipboard
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { generateShareToken, buildShareUrl, copyToClipboard } from '../utils/share';

describe('share.js — generateShareToken', () => {
  it('应返回 10 位字符串', () => {
    const token = generateShareToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(10);
  });

  it('每次调用应生成不同的 token（连续 50 次高唯一性）', () => {
    const tokens = new Set();
    for (let i = 0; i < 50; i++) {
      tokens.add(generateShareToken());
    }
    // 基于时间的 ID 生成器，允许极少量碰撞（>90% 唯一率即通过）
    expect(tokens.size).toBeGreaterThanOrEqual(45);
  });

  it('token 仅包含字母数字字符', () => {
    for (let i = 0; i < 50; i++) {
      const token = generateShareToken();
      expect(token).toMatch(/^[a-z0-9]+$/i);
    }
  });

  it('token 长度固定为 10', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateShareToken()).toHaveLength(10);
    }
  });
});

describe('share.js — buildShareUrl', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  it('应根据 token 构造完整 URL（HashRouter 格式：带 #）', () => {
    const url = buildShareUrl('abc123def');
    expect(url).toBe('https://example.com/#/share/abc123def');
  });

  it('空 token 也应能构造 URL', () => {
    const url = buildShareUrl('');
    expect(url).toBe('https://example.com/#/share/');
  });

  it('特殊字符 token 应保留原样（不做编码）', () => {
    const url = buildShareUrl('test-token_x');
    expect(url).toBe('https://example.com/#/share/test-token_x');
  });
});

describe('share.js — copyToClipboard', () => {
  let writeTextMock;
  let execCommandMock;

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    execCommandMock = vi.fn();

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    document.execCommand = execCommandMock;
  });

  it('成功时应返回 true（navigator.clipboard 路径）', async () => {
    writeTextMock.mockResolvedValueOnce(undefined);
    const result = await copyToClipboard('test text');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('test text');
  });

  it('navigator.clipboard 不可用时应 fallback 到 execCommand', async () => {
    // 先删除 clipboard
    delete navigator.clipboard;
    execCommandMock.mockReturnValueOnce(true);

    const result = await copyToClipboard('fallback text');
    expect(result).toBe(true);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('execCommand fallback 失败时应返回 false', async () => {
    delete navigator.clipboard;
    execCommandMock.mockReturnValueOnce(false);

    const result = await copyToClipboard('fallback text');
    expect(result).toBe(false);
  });

  it('clipboard.writeText reject 后应尝试 fallback', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('Not allowed'));
    execCommandMock.mockReturnValueOnce(true);

    const result = await copyToClipboard('text');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalled();
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('fallback 应创建临时 textarea 并在完成后移除', async () => {
    delete navigator.clipboard;
    execCommandMock.mockReturnValueOnce(true);

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    await copyToClipboard('cleanup test');

    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('两个方案都失败时应返回 false', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('clipboard error'));
    // execCommand 也抛异常
    document.execCommand = vi.fn(() => {
      throw new Error('execCommand error');
    });

    const result = await copyToClipboard('fail text');
    expect(result).toBe(false);
  });
});
