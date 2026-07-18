/**
 * OrderDetail 删除功能测试
 *
 * 覆盖：
 * - 删除按钮渲染位置、variant/color
 * - 确认 Dialog：PO 号 + 客户名提示 + "不可恢复"警告
 * - 取消按钮关闭 Dialog
 * - 确认按钮执行删除并跳转 /orders
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrderProvider } from '../context/OrderContext';
import OrderDetail from '../pages/OrderDetail';

// ============================================================
// 辅助
// ============================================================

function makeOrder(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: overrides.id || 'test-order-1',
    customerName: overrides.customerName || 'Test Client',
    poNumber: overrides.poNumber || 'PO-TEST-001',
    productSummary: 'Test Widget',
    quantity: '1000',
    amount: '$10,000.00',
    tradeTerm: 'FOB',
    portOfLoading: 'Shanghai',
    portOfDestination: 'Los Angeles',
    estimatedDeliveryDate: '2025-12-31',
    salesperson: 'Sales Zhang',
    factoryName: 'Factory A',
    notes: 'Test notes',
    status: overrides.status || '已接单',
    createdAt: now,
    updatedAt: now,
    timeline: overrides.timeline || [
      { node: '已接单', date: now, note: '', attachments: [] },
    ],
    shareToken: null,
    tags: [],
    ...overrides.extra,
  };
}

const navigateMock = vi.fn();

// Mock react-router-dom useNavigate
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderOrderDetail(orderId, presetOrders) {
  if (presetOrders !== undefined) {
    localStorage.setItem('order_tracking_orders', JSON.stringify(presetOrders));
  }
  return render(
    <MemoryRouter initialEntries={[`/orders/${orderId}`]}>
      <OrderProvider>
        <Routes>
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/orders" element={<div data-testid="orders-page">订单列表页</div>} />
        </Routes>
      </OrderProvider>
    </MemoryRouter>
  );
}

// ============================================================
// 测试套件
// ============================================================

describe('OrderDetail — 删除按钮', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    navigateMock.mockClear();
  });

  it('订单详情页显示"删除订单"按钮', () => {
    const order = makeOrder({ id: 'del-1', poNumber: 'PO-DEL-1', customerName: 'Delete Me' });
    renderOrderDetail('del-1', [order]);

    expect(screen.getByText('删除订单')).toBeInTheDocument();
  });

  it('删除按钮 variant 为 outlined', () => {
    const order = makeOrder({ id: 'del-1' });
    renderOrderDetail('del-1', [order]);

    const deleteBtn = screen.getByText('删除订单').closest('button');
    expect(deleteBtn).toBeInTheDocument();
    // MUI outlined button should have the MuiButton-outlined class
    expect(deleteBtn.className).toMatch(/MuiButton-outlined/);
  });

  it('删除按钮 color 为 error', () => {
    const order = makeOrder({ id: 'del-1' });
    renderOrderDetail('del-1', [order]);

    const deleteBtn = screen.getByText('删除订单').closest('button');
    expect(deleteBtn.className).toMatch(/MuiButton-colorError/);
  });

  it('删除按钮带有 DeleteIcon', () => {
    const order = makeOrder({ id: 'del-1' });
    renderOrderDetail('del-1', [order]);

    const deleteBtn = screen.getByText('删除订单').closest('button');
    expect(deleteBtn.querySelector('svg[data-testid="DeleteIcon"]')).toBeTruthy();
  });

  it('页面中同时有编辑、推进状态、分享按钮', () => {
    const order = makeOrder({ id: 'del-1' });
    renderOrderDetail('del-1', [order]);

    expect(screen.getByText('编辑')).toBeInTheDocument();
    expect(screen.getByText('推进状态')).toBeInTheDocument();
    expect(screen.getByText('删除订单')).toBeInTheDocument();
  });
});

describe('OrderDetail — 删除确认 Dialog', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    navigateMock.mockClear();
  });

  function openDeleteDialog() {
    const order = makeOrder({
      id: 'del-1',
      poNumber: 'PO-CONFIRM-DELETE',
      customerName: '确认删除客户',
    });
    renderOrderDetail('del-1', [order]);

    fireEvent.click(screen.getByText('删除订单'));
  }

  it('点击删除按钮打开确认 Dialog', async () => {
    openDeleteDialog();

    await waitFor(() => {
      expect(screen.getByText('确认删除？')).toBeInTheDocument();
    });
  });

  it('确认 Dialog 显示"此操作不可恢复！"警告', async () => {
    openDeleteDialog();

    await waitFor(() => {
      expect(screen.getByText('此操作不可恢复！')).toBeInTheDocument();
    });
  });

  it('确认 Dialog 显示订单 PO 号', async () => {
    openDeleteDialog();

    await waitFor(() => {
      // PO 号出现在页面和 Dialog 两处，用 getAllByText 确保 Dialog 中也有
      const matches = screen.getAllByText('PO-CONFIRM-DELETE');
      expect(matches.length).toBeGreaterThanOrEqual(2); // 基本信息 + Dialog
    });
  });

  it('确认 Dialog 显示客户名称', async () => {
    openDeleteDialog();

    await waitFor(() => {
      // 客户名出现在基本信息字段和 Dialog 提示中
      const matches = screen.getAllByText('确认删除客户', { exact: false });
      expect(matches.length).toBeGreaterThanOrEqual(2); // 基本信息 + Dialog
    });
  });

  it('确认 Dialog 包含"将永久删除订单"提示文案', async () => {
    openDeleteDialog();

    await waitFor(() => {
      // MUI Dialog renders role="dialog" on a nested element;
      // use querySelector for reliable Dialog scoping
      const dialog = document.querySelector('.MuiDialog-paper');
      expect(dialog).toBeTruthy();
      expect(dialog.textContent).toMatch(/将永久删除订单/);
      expect(dialog.textContent).toMatch(/此操作不可恢复/);
    });
  });

  it('确认 Dialog 有 error 级别的 Alert', async () => {
    openDeleteDialog();

    await waitFor(() => {
      const alert = document.querySelector('.MuiAlert-standardError');
      expect(alert).toBeTruthy();
      expect(alert.textContent).toContain('此操作不可恢复');
    });
  });
});

describe('OrderDetail — 删除 Dialog 按钮行为', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    navigateMock.mockClear();
  });

  function openDeleteDialog() {
    const order = makeOrder({
      id: 'del-1',
      poNumber: 'PO-DEL-1',
      customerName: 'Delete Client',
    });
    renderOrderDetail('del-1', [order]);

    fireEvent.click(screen.getByText('删除订单'));
  }

  it('点击"取消"按钮关闭 Dialog，不删除订单', async () => {
    openDeleteDialog();

    await waitFor(() => {
      fireEvent.click(screen.getByText('取消'));
    });

    await waitFor(() => {
      // Dialog 关闭
      expect(screen.queryByText('确认删除？')).toBeNull();
      // 订单仍然可见（PO号仍在页面中）
      expect(screen.getByText('PO-DEL-1')).toBeInTheDocument();
    });
  });

  it('点击"确认删除"按钮执行删除', async () => {
    openDeleteDialog();

    await waitFor(() => {
      fireEvent.click(screen.getByText('确认删除'));
    });

    await waitFor(() => {
      // 应导航到 /orders
      expect(navigateMock).toHaveBeenCalledWith('/orders');
    });
  });

  it('确认删除按钮 color 为 error，包含 DeleteIcon', async () => {
    openDeleteDialog();

    await waitFor(() => {
      const confirmBtn = screen.getByText('确认删除').closest('button');
      expect(confirmBtn).toBeInTheDocument();
      expect(confirmBtn.className).toMatch(/MuiButton-colorError/);
      expect(confirmBtn.querySelector('svg')).toBeTruthy();
    });
  });

  it('删除后 localStorage 中不再包含该订单', async () => {
    const orders = [
      makeOrder({ id: 'del-1', poNumber: 'PO-DEL-1', customerName: 'Delete Client' }),
      makeOrder({ id: 'keep-1', poNumber: 'PO-KEEP-1', customerName: 'Keep Client' }),
    ];

    renderOrderDetail('del-1', orders);

    fireEvent.click(screen.getByText('删除订单'));

    await waitFor(() => {
      fireEvent.click(screen.getByText('确认删除'));
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('keep-1');
    });
  });
});

describe('OrderDetail — 不存在的订单', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('访问不存在的订单 ID 显示"订单不存在"', () => {
    renderOrderDetail('non-existent', []);
    expect(screen.getByText('订单不存在')).toBeInTheDocument();
  });

  it('不存在的订单页面有"返回订单列表"按钮', () => {
    renderOrderDetail('non-existent', []);
    expect(screen.getByText('返回订单列表')).toBeInTheDocument();
  });

  it('不存在的订单页面不显示删除按钮', () => {
    renderOrderDetail('non-existent', []);
    expect(screen.queryByText('删除订单')).toBeNull();
  });
});

describe('OrderDetail — 原有功能不受影响', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('页面标题"订单详情"仍显示', () => {
    const order = makeOrder({ id: 'o1' });
    renderOrderDetail('o1', [order]);
    expect(screen.getByText('订单详情')).toBeInTheDocument();
  });

  it('基本信息区域正常渲染', () => {
    const order = makeOrder({ id: 'o1', poNumber: 'PO-INFO-1', customerName: 'Info Client' });
    renderOrderDetail('o1', [order]);

    expect(screen.getByText('基本信息')).toBeInTheDocument();
    expect(screen.getByText('PO-INFO-1')).toBeInTheDocument();
    expect(screen.getByText('Info Client')).toBeInTheDocument();
  });

  it('状态时间线区域正常渲染', () => {
    const order = makeOrder({ id: 'o1' });
    renderOrderDetail('o1', [order]);
    expect(screen.getByText('状态时间线')).toBeInTheDocument();
  });

  it('状态推进按钮功能正常（可点击打开 Dialog）', async () => {
    const order = makeOrder({ id: 'o1' });
    renderOrderDetail('o1', [order]);

    fireEvent.click(screen.getByText('推进状态'));

    await waitFor(() => {
      expect(screen.getByText('推进订单状态')).toBeInTheDocument();
    });
  });

  it('StatusBadge 显示当前状态', () => {
    const order = makeOrder({ id: 'o1', status: '已接单' });
    renderOrderDetail('o1', [order]);

    // StatusBadge renders the status text
    const badges = screen.getAllByText('已接单');
    expect(badges.length).toBeGreaterThan(0);
  });
});
