/**
 * ImportDialog 组件测试
 *
 * 覆盖：
 * - 文件类型验证（仅 .json）
 * - JSON 解析 & 格式校验（含 orders 字段、必填字段）
 * - 预览：文件中 X 条 / 当前 Y 条
 * - 导入模式 Radio：覆盖 vs 合并
 * - 覆盖模式警告 Alert
 * - 合并去重逻辑（按 PO 号）
 * - 导入流程各步骤状态切换
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ImportDialog from '../components/ImportDialog';

// ============================================================
// 辅助
// ============================================================

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

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  orders: [],
  importOrders: vi.fn(() => ({ added: 0, skipped: 0 })),
};

function renderDialog(props = {}) {
  return render(<ImportDialog {...defaultProps} {...props} />);
}

// ============================================================
// 测试套件
// ============================================================

describe('ImportDialog — 文件选择', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初始状态显示"选择之前导出的 JSON 备份文件"提示', () => {
    renderDialog();
    expect(screen.getByText('选择之前导出的 JSON 备份文件')).toBeInTheDocument();
  });

  it('显示"选择 JSON 文件"按钮', () => {
    renderDialog();
    expect(screen.getByText('选择 JSON 文件')).toBeInTheDocument();
  });

  it('文件 input 只接受 .json 类型', () => {
    renderDialog();
    const input = document.getElementById('import-file-input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', '.json');
  });
});

describe('ImportDialog — JSON 解析与格式校验', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createJsonFile(orders, exportTime) {
    const json = JSON.stringify({ orders, exportTime: exportTime || new Date().toISOString() });
    return new File([json], 'backup.json', { type: 'application/json' });
  }

  function triggerFileSelect(file) {
    renderDialog();
    const input = document.getElementById('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });
  }

  it('选择有效 JSON 文件后进入 preview 步骤', async () => {
    const file = createJsonFile([makeOrder({ poNumber: 'PO-001', customerName: 'Client A' })]);
    triggerFileSelect(file);

    await waitFor(() => {
      expect(screen.getByText('导入预览')).toBeInTheDocument();
    });
  });

  it('缺少 orders 字段时显示错误', async () => {
    const invalidJson = JSON.stringify({ notOrders: [] });
    const file = new File([invalidJson], 'bad.json', { type: 'application/json' });

    triggerFileSelect(file);

    await waitFor(() => {
      expect(screen.getByText(/文件格式不正确：缺少 orders 数组字段/)).toBeInTheDocument();
    });
  });

  it('orders 不是数组时显示错误', async () => {
    const invalidJson = JSON.stringify({ orders: 'not-an-array' });
    const file = new File([invalidJson], 'bad.json', { type: 'application/json' });

    triggerFileSelect(file);

    await waitFor(() => {
      expect(screen.getByText(/文件格式不正确：缺少 orders 数组字段/)).toBeInTheDocument();
    });
  });

  it('无效 JSON 格式时显示解析失败错误', async () => {
    const file = new File(['this is not json{{'], 'bad.json', { type: 'application/json' });

    triggerFileSelect(file);

    await waitFor(() => {
      expect(screen.getByText(/JSON 格式无效/)).toBeInTheDocument();
    });
  });

  it('订单缺少 poNumber 时显示错误', async () => {
    const invalidJson = JSON.stringify({
      orders: [{ customerName: 'Client', id: '123' }],
    });
    const file = new File([invalidJson], 'bad.json', { type: 'application/json' });

    triggerFileSelect(file);

    await waitFor(() => {
      expect(screen.getByText(/缺少 poNumber 或 customerName/)).toBeInTheDocument();
    });
  });

  it('订单缺少 customerName 时显示错误', async () => {
    const invalidJson = JSON.stringify({
      orders: [{ poNumber: 'PO-001', id: '123' }],
    });
    const file = new File([invalidJson], 'bad.json', { type: 'application/json' });

    triggerFileSelect(file);

    await waitFor(() => {
      expect(screen.getByText(/缺少 poNumber 或 customerName/)).toBeInTheDocument();
    });
  });
});

describe('ImportDialog — 预览信息', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function selectValidFile(orders, currentOrders = []) {
    const json = JSON.stringify({ orders, exportTime: '2025-06-15T08:00:00.000Z' });
    const file = new File([json], 'backup.json', { type: 'application/json' });

    renderDialog({ orders: currentOrders });
    const input = document.getElementById('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });
  }

  it('预览中显示文件中订单数 X 条', async () => {
    const importedOrders = [
      makeOrder({ poNumber: 'PO-001', customerName: 'A' }),
      makeOrder({ poNumber: 'PO-002', customerName: 'B' }),
      makeOrder({ poNumber: 'PO-003', customerName: 'C' }),
    ];

    selectValidFile(importedOrders);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('文件中订单数')).toBeInTheDocument();
    });
  });

  it('预览中显示当前已有订单数 Y 条', async () => {
    const currentOrders = [
      makeOrder({ id: 'c1', poNumber: 'PO-C1' }),
      makeOrder({ id: 'c2', poNumber: 'PO-C2' }),
    ];

    selectValidFile([makeOrder({ poNumber: 'PO-001', customerName: 'A' })], currentOrders);

    await waitFor(() => {
      // 当前订单数显示 2
      const currentCountLabel = screen.getByText('当前已有订单数');
      expect(currentCountLabel).toBeInTheDocument();
      // 数字 "2" 应该出现在当前订单数附近
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('预览中显示备份时间', async () => {
    selectValidFile([makeOrder({ poNumber: 'PO-001', customerName: 'A' })]);

    await waitFor(() => {
      expect(screen.getByText(/备份时间：2025-06-15T08:00:00.000Z/)).toBeInTheDocument();
    });
  });
});

describe('ImportDialog — 导入模式 Radio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function goToPreview() {
    const json = JSON.stringify({ orders: [makeOrder({ poNumber: 'PO-001', customerName: 'A' })] });
    const file = new File([json], 'backup.json', { type: 'application/json' });

    renderDialog();
    const input = document.getElementById('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });
  }

  it('预览步骤显示"合并导入（推荐）"选项', async () => {
    goToPreview();

    await waitFor(() => {
      expect(screen.getByText('合并导入（推荐）')).toBeInTheDocument();
    });
  });

  it('预览步骤显示"覆盖导入"选项', async () => {
    goToPreview();

    await waitFor(() => {
      expect(screen.getByText('覆盖导入')).toBeInTheDocument();
    });
  });

  it('默认选中"合并导入"模式', async () => {
    goToPreview();

    await waitFor(() => {
      const mergeRadio = screen.getByLabelText(/合并导入/);
      expect(mergeRadio).toBeChecked();
    });
  });

  it('可以切换到"覆盖导入"模式', async () => {
    goToPreview();

    await waitFor(() => {
      const overwriteRadio = screen.getByLabelText(/覆盖导入/);
      fireEvent.click(overwriteRadio);
      expect(overwriteRadio).toBeChecked();
    });
  });

  it('切换到覆盖模式后显示警告 Alert', async () => {
    goToPreview();

    await waitFor(() => {
      const overwriteRadio = screen.getByLabelText(/覆盖导入/);
      fireEvent.click(overwriteRadio);
    });

    await waitFor(() => {
      expect(screen.getByText(/覆盖导入将删除当前全部/)).toBeInTheDocument();
    });
  });

  it('覆盖警告包含当前订单数和文件订单数', async () => {
    // 使用有当前订单的场景
    const currentOrders = [makeOrder({ id: 'c1', poNumber: 'PO-C1' })];
    const json = JSON.stringify({
      orders: [
        makeOrder({ poNumber: 'PO-001', customerName: 'A' }),
        makeOrder({ poNumber: 'PO-002', customerName: 'B' }),
      ],
    });
    const file = new File([json], 'backup.json', { type: 'application/json' });

    renderDialog({ orders: currentOrders });
    const input = document.getElementById('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const overwriteRadio = screen.getByLabelText(/覆盖导入/);
      fireEvent.click(overwriteRadio);
    });

    await waitFor(() => {
      const warning = screen.getByText(/覆盖导入将删除当前全部/);
      expect(warning.textContent).toContain('1');
      expect(warning.textContent).toContain('2');
      expect(warning.textContent).toContain('不可恢复');
    });
  });

  it('合并模式不显示覆盖警告', async () => {
    goToPreview();

    await waitFor(() => {
      // 确保合并模式被选中，不应该有覆盖警告
      const mergeRadio = screen.getByLabelText(/合并导入/);
      expect(mergeRadio).toBeChecked();
      expect(screen.queryByText(/覆盖导入将删除当前全部/)).toBeNull();
    });
  });
});

describe('ImportDialog — 导入执行', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupImport(importedOrders, currentOrders = [], importOrdersImpl) {
    const json = JSON.stringify({ orders: importedOrders });
    const file = new File([json], 'backup.json', { type: 'application/json' });

    const mockImport = importOrdersImpl || vi.fn(() => ({ added: importedOrders.length, skipped: 0 }));

    renderDialog({ orders: currentOrders, importOrders: mockImport });
    const input = document.getElementById('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    return mockImport;
  }

  it('点击"确认导入"调用 importOrders', async () => {
    const mockImport = vi.fn(() => ({ added: 1, skipped: 0 }));
    const orders = [makeOrder({ poNumber: 'PO-001', customerName: 'A' })];

    setupImport(orders, [], mockImport);

    await waitFor(() => {
      expect(screen.getByText('确认导入')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('确认导入'));

    await waitFor(() => {
      expect(mockImport).toHaveBeenCalledTimes(1);
    });
  });

  it('默认合并模式调用 importOrders 时 mode 为 "merge"', async () => {
    const mockImport = vi.fn(() => ({ added: 1, skipped: 0 }));
    const orders = [makeOrder({ poNumber: 'PO-001', customerName: 'A' })];

    setupImport(orders, [], mockImport);

    await waitFor(() => {
      fireEvent.click(screen.getByText('确认导入'));
    });

    await waitFor(() => {
      expect(mockImport).toHaveBeenCalledWith(
        expect.any(Array),
        'merge'
      );
    });
  });

  it('切换到覆盖模式后调用 importOrders 时 mode 为 "overwrite"', async () => {
    const mockImport = vi.fn(() => ({ added: 1, skipped: 0 }));
    const orders = [makeOrder({ poNumber: 'PO-001', customerName: 'A' })];

    setupImport(orders, [], mockImport);

    await waitFor(() => {
      const overwriteRadio = screen.getByLabelText(/覆盖导入/);
      fireEvent.click(overwriteRadio);
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('确认导入'));
    });

    await waitFor(() => {
      expect(mockImport).toHaveBeenCalledWith(
        expect.any(Array),
        'overwrite'
      );
    });
  });

  it('导入成功后显示"数据导入成功！"', async () => {
    const mockImport = vi.fn(() => ({ added: 2, skipped: 0 }));
    const orders = [
      makeOrder({ poNumber: 'PO-001', customerName: 'A' }),
      makeOrder({ poNumber: 'PO-002', customerName: 'B' }),
    ];

    setupImport(orders, [], mockImport);

    await waitFor(() => {
      fireEvent.click(screen.getByText('确认导入'));
    });

    await waitFor(() => {
      expect(screen.getByText('数据导入成功！')).toBeInTheDocument();
    });
  });

  it('导入成功后显示新增数量和跳过数量', async () => {
    const mockImport = vi.fn(() => ({ added: 2, skipped: 0 }));
    const orders = [
      makeOrder({ poNumber: 'PO-001', customerName: 'A' }),
      makeOrder({ poNumber: 'PO-002', customerName: 'B' }),
    ];

    setupImport(orders, [], mockImport);

    await waitFor(() => {
      fireEvent.click(screen.getByText('确认导入'));
    });

    await waitFor(() => {
      expect(screen.getByText(/新增 2 条订单/)).toBeInTheDocument();
    });
  });

  it('有跳过订单时显示跳过数量及原因', async () => {
    const mockImport = vi.fn(() => ({ added: 1, skipped: 2 }));
    const orders = [makeOrder({ poNumber: 'PO-001', customerName: 'A' })];

    setupImport(orders, [], mockImport);

    await waitFor(() => {
      fireEvent.click(screen.getByText('确认导入'));
    });

    await waitFor(() => {
      expect(screen.getByText(/跳过 2 条/)).toBeInTheDocument();
      expect(screen.getByText(/PO 号重复/)).toBeInTheDocument();
    });
  });

  it('导入失败时显示错误并回到 preview', async () => {
    const mockImport = vi.fn(() => {
      throw new Error('导入数据格式错误：orders 必须是数组');
    });
    const orders = [makeOrder({ poNumber: 'PO-001', customerName: 'A' })];

    setupImport(orders, [], mockImport);

    await waitFor(() => {
      fireEvent.click(screen.getByText('确认导入'));
    });

    await waitFor(() => {
      expect(screen.getByText(/导入数据格式错误/)).toBeInTheDocument();
      // 仍停留在 preview 步骤，确认导入按钮还在
      expect(screen.getByText('确认导入')).toBeInTheDocument();
    });
  });
});

describe('ImportDialog — 步骤导航', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('select 步骤有"取消"按钮', () => {
    renderDialog();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('点击取消调用 onClose', () => {
    const onClose = vi.fn();
    renderDialog({ onClose });

    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('preview 步骤有"重新选择"按钮', async () => {
    const json = JSON.stringify({ orders: [makeOrder({ poNumber: 'PO-001', customerName: 'A' })] });
    const file = new File([json], 'backup.json', { type: 'application/json' });

    renderDialog();
    const input = document.getElementById('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('重新选择')).toBeInTheDocument();
    });
  });

  it('点击"重新选择"回到 select 步骤', async () => {
    const json = JSON.stringify({ orders: [makeOrder({ poNumber: 'PO-001', customerName: 'A' })] });
    const file = new File([json], 'backup.json', { type: 'application/json' });

    renderDialog();
    const input = document.getElementById('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      fireEvent.click(screen.getByText('重新选择'));
    });

    await waitFor(() => {
      expect(screen.getByText('选择 JSON 文件')).toBeInTheDocument();
    });
  });

  it('done 步骤有"完成"按钮', async () => {
    const mockImport = vi.fn(() => ({ added: 1, skipped: 0 }));
    const json = JSON.stringify({ orders: [makeOrder({ poNumber: 'PO-001', customerName: 'A' })] });
    const file = new File([json], 'backup.json', { type: 'application/json' });

    renderDialog({ importOrders: mockImport });
    const input = document.getElementById('import-file-input');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      fireEvent.click(screen.getByText('确认导入'));
    });

    await waitFor(() => {
      expect(screen.getByText('完成')).toBeInTheDocument();
    });
  });

  it('关闭后重新打开回到 select 步骤', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <ImportDialog open={true} onClose={onClose} orders={[]} importOrders={vi.fn()} />
    );

    // 先关闭
    fireEvent.click(screen.getByText('取消'));
    expect(onClose).toHaveBeenCalled();

    // 重新打开
    rerender(
      <ImportDialog open={true} onClose={onClose} orders={[]} importOrders={vi.fn()} />
    );

    // 应该回到 select 步骤
    expect(screen.getByText('选择 JSON 文件')).toBeInTheDocument();
  });
});
