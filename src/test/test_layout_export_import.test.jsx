/**
 * Layout 导出/导入按钮测试
 *
 * 覆盖：
 * - 导出按钮：构建 JSON → Blob → download
 * - 导入按钮：打开 ImportDialog
 * - 按钮渲染位置（导航栏右侧操作区）
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { OrderProvider } from '../context/OrderContext';
import Layout from '../components/Layout';

// ============================================================
// 辅助
// ============================================================

function renderLayout(presetOrders) {
  if (presetOrders !== undefined) {
    localStorage.setItem('order_tracking_orders', JSON.stringify(presetOrders));
  }
  return render(
    <MemoryRouter>
      <OrderProvider>
        <Layout />
      </OrderProvider>
    </MemoryRouter>
  );
}

function makeOrder(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: overrides.id || `O${Math.random().toString(36).slice(2, 8)}`,
    customerName: overrides.customerName || 'Test Client',
    poNumber: overrides.poNumber || `PO-${Math.random().toString(36).slice(2, 6)}`,
    productSummary: 'Widget',
    quantity: '1000',
    amount: '$10,000.00',
    tradeTerm: 'FOB',
    status: '已接单',
    createdAt: now,
    updatedAt: now,
    timeline: [{ node: '已接单', date: now, note: '', attachments: [] }],
    shareToken: null,
    tags: [],
    ...overrides,
  };
}

// ============================================================
// 测试套件
// ============================================================

describe('Layout — 导出/导入按钮渲染', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('导航栏中显示"导出数据"按钮', () => {
    renderLayout([]);
    expect(screen.getByText('导出数据')).toBeInTheDocument();
  });

  it('导航栏中显示"导入数据"按钮', () => {
    renderLayout([]);
    expect(screen.getByText('导入数据')).toBeInTheDocument();
  });

  it('导出按钮带有 SaveAltIcon', () => {
    renderLayout([]);
    const exportBtn = screen.getByText('导出数据').closest('button');
    expect(exportBtn.querySelector('svg')).toBeTruthy();
  });

  it('导入按钮带有 FileUploadIcon', () => {
    renderLayout([]);
    const importBtn = screen.getByText('导入数据').closest('button');
    expect(importBtn.querySelector('svg')).toBeTruthy();
  });
});

describe('Layout — 导出功能', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('点击导出按钮创建 Blob 并触发下载', () => {
    const orders = [
      makeOrder({ id: 'o1', poNumber: 'PO-EXP-1', customerName: 'Export Client' }),
    ];

    // Mock URL and anchor
    const origCreateObjURL = URL.createObjectURL;
    const origRevokeObjURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test-export');
    URL.revokeObjectURL = vi.fn();

    let capturedDownload = '';
    let capturedHref = '';
    let anchorEl = null;

    const origCE = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = origCE(tag);
      if (tag === 'a') {
        anchorEl = el;
        // Capture property assignments via Object.defineProperty
        let downloadVal = '';
        let hrefVal = '';
        Object.defineProperty(el, 'download', {
          get: () => downloadVal,
          set: (v) => { downloadVal = v; capturedDownload = v; },
          configurable: true,
        });
        Object.defineProperty(el, 'href', {
          get: () => hrefVal,
          set: (v) => { hrefVal = v; capturedHref = v; },
          configurable: true,
        });
        el.click = vi.fn();
      }
      return el;
    });

    renderLayout(orders);

    fireEvent.click(screen.getByText('导出数据'));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(capturedDownload).toMatch(/^跟单数据备份_.*\.json$/);
    expect(capturedHref).toBe('blob:test-export');

    // 恢复
    URL.createObjectURL = origCreateObjURL;
    URL.revokeObjectURL = origRevokeObjURL;
  });

  it('导出的 Blob 类型为 application/json', () => {
    const orders = [makeOrder({ id: 'o1', poNumber: 'PO-EXP-1' })];

    let blobType = '';

    const OrigBlob = global.Blob;
    global.Blob = class extends OrigBlob {
      constructor(parts, opts) {
        super(parts, opts);
        blobType = opts.type;
      }
    };

    renderLayout(orders);

    fireEvent.click(screen.getByText('导出数据'));

    expect(blobType).toBe('application/json');

    global.Blob = OrigBlob;
  });

  it('导出的 JSON 包含 orders 数组和 exportTime', () => {
    const orders = [makeOrder({ id: 'o1', poNumber: 'PO-EXP-1' })];

    let jsonContent = '';

    const OrigBlob = global.Blob;
    global.Blob = class extends OrigBlob {
      constructor(parts) {
        super(parts);
        jsonContent = parts[0];
      }
    };

    renderLayout(orders);

    fireEvent.click(screen.getByText('导出数据'));

    const parsed = JSON.parse(jsonContent);
    expect(Array.isArray(parsed.orders)).toBe(true);
    expect(parsed.orders).toHaveLength(1);
    expect(parsed.orders[0].poNumber).toBe('PO-EXP-1');
    expect(parsed.exportTime).toBeDefined();

    global.Blob = OrigBlob;
  });

  it('导出后调用 URL.revokeObjectURL 清理', () => {
    const orders = [makeOrder()];

    const origCreateObjURL = URL.createObjectURL;
    const origRevokeObjURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();

    renderLayout(orders);
    fireEvent.click(screen.getByText('导出数据'));

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');

    URL.createObjectURL = origCreateObjURL;
    URL.revokeObjectURL = origRevokeObjURL;
  });
});

describe('Layout — 导入按钮打开 ImportDialog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('初始状态下 ImportDialog 不显示', () => {
    renderLayout([]);
    expect(screen.queryByText('📥 导入数据')).toBeNull();
  });

  it('点击"导入数据"按钮后打开 ImportDialog', async () => {
    renderLayout([]);

    fireEvent.click(screen.getByText('导入数据'));

    await waitFor(() => {
      expect(screen.getByText('📥 导入数据')).toBeInTheDocument();
    });
  });

  it('ImportDialog 打开后显示选择文件提示', async () => {
    renderLayout([]);

    fireEvent.click(screen.getByText('导入数据'));

    await waitFor(() => {
      expect(screen.getByText('选择之前导出的 JSON 备份文件')).toBeInTheDocument();
    });
  });
});

describe('Layout — 导航栏结构不变', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('标题"外贸跟单系统"仍显示', () => {
    renderLayout([]);
    expect(screen.getByText('外贸跟单系统')).toBeInTheDocument();
  });

  it('三个导航项：仪表盘、订单列表、新建订单', () => {
    renderLayout([]);
    expect(screen.getByText('仪表盘')).toBeInTheDocument();
    expect(screen.getByText('订单列表')).toBeInTheDocument();
    expect(screen.getByText('新建订单')).toBeInTheDocument();
  });

  it('页脚仍显示版本信息', () => {
    renderLayout([]);
    expect(screen.getByText(/外贸跟单系统 v1.0/)).toBeInTheDocument();
  });
});
