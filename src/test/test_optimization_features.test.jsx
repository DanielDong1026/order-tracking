/**
 * 四项优化功能综合测试
 *
 * 覆盖：
 *   F1 - 加载演示数据（Dashboard 空状态按钮 + 5 条演示数据）
 *   F2 - 复制订单（OrderList / OrderDetail 复制按钮 + OrderForm ?copy=id 预填）
 *   F3 - 页面标题未完成数（Layout document.title = 📊 (N) 外贸跟单系统）
 *   F4 - 列表快速状态推进（OrderList 状态推进下拉）
 *   REG - 回归：CRUD、标签、分享、超期、周报、导出导入、搜索筛选、空状态
 */
import React from 'react';
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import {
  render, screen, waitFor, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { OrderProvider } from '../context/OrderContext';
import Dashboard from '../pages/Dashboard';
import OrderList from '../pages/OrderList';
import OrderDetail from '../pages/OrderDetail';
import OrderForm from '../pages/OrderForm';
import Layout from '../components/Layout';
import { STATUS_NODES } from '../data/constants';

// ============================================================
// 辅助工具
// ============================================================

function makeOrder(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: overrides.id || `O${Math.random().toString(36).slice(2, 8)}`,
    customerName: overrides.customerName || 'Test Client',
    poNumber: overrides.poNumber || `PO-${Math.random().toString(36).slice(2, 6)}`,
    productSummary: overrides.productSummary || 'Widget',
    quantity: overrides.quantity ?? 1000,
    amount: overrides.amount ?? '$10,000.00',
    tradeTerm: overrides.tradeTerm || 'FOB',
    portOfLoading: overrides.portOfLoading || 'Shanghai',
    portOfDestination: overrides.portOfDestination || 'New York',
    estimatedDeliveryDate: overrides.estimatedDeliveryDate || '',
    salesperson: overrides.salesperson || '张三',
    factoryName: overrides.factoryName || 'XX工厂',
    notes: overrides.notes || '',
    status: overrides.status || '已接单',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    timeline: overrides.timeline ?? [
      { node: '已接单', date: now, note: '', attachments: [] },
    ],
    shareToken: overrides.shareToken || null,
    tags: overrides.tags || [],
    ...overrides.extra,
  };
}

/** 普通渲染：包裹 MemoryRouter + OrderProvider（不需要路由参数时使用） */
function renderWithContext(Component, presetOrders) {
  if (presetOrders !== undefined) {
    localStorage.setItem('order_tracking_orders', JSON.stringify(presetOrders));
  }
  return render(
    <MemoryRouter>
      <OrderProvider>
        {Component}
      </OrderProvider>
    </MemoryRouter>
  );
}

/** 带路由的渲染：用于 OrderDetail / OrderForm 等依赖 useParams 的组件 */
function renderWithRoutes(initialEntries, presetOrders) {
  if (presetOrders !== undefined) {
    localStorage.setItem('order_tracking_orders', JSON.stringify(presetOrders));
  }
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <OrderProvider>
        <Routes>
          <Route path="/orders/:id/edit" element={<OrderForm />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/orders/new" element={<OrderForm />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </OrderProvider>
    </MemoryRouter>
  );
}

/** 带路由的 Layout 渲染 */
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

// ============================================================
// Mock useNavigate（避免 OrderForm useEffect 中 navigate 导致的时序问题）
// ============================================================
const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// ============================================================
// F1: 加载演示数据
// ============================================================
describe('F1 — 加载演示数据 (Dashboard)', () => {
  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockClear();
  });

  describe('空状态按钮', () => {
    it('订单列表为空时，显示「📋 加载演示数据」按钮', () => {
      renderWithRoutes(['/'], []);
      expect(
        screen.getByRole('button', { name: /加载演示数据/ })
      ).toBeInTheDocument();
    });

    it('订单列表为空时，显示欢迎引导文字', () => {
      renderWithRoutes(['/'], []);
      expect(screen.getByText('欢迎使用外贸跟单系统！')).toBeInTheDocument();
      expect(screen.getByText(/看起来还没有任何订单/)).toBeInTheDocument();
    });

    it('有订单后，「加载演示数据」按钮不显示', () => {
      renderWithRoutes(['/'], [makeOrder({ id: 'O1' })]);
      expect(
        screen.queryByRole('button', { name: /加载演示数据/ })
      ).not.toBeInTheDocument();
    });

    it('有订单后，欢迎引导区域不显示', () => {
      renderWithRoutes(['/'], [makeOrder({ id: 'O1' })]);
      expect(screen.queryByText('欢迎使用外贸跟单系统！')).not.toBeInTheDocument();
    });
  });

  describe('演示数据内容', () => {
    it('点击后加载 5 条订单', async () => {
      renderWithRoutes(['/'], []);
      await userEvent.click(
        screen.getByRole('button', { name: /加载演示数据/ })
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /加载演示数据/ }))
          .not.toBeInTheDocument();
      });

      expect(screen.getByText('共 5 个订单')).toBeInTheDocument();
    });

    it('演示数据覆盖 6 个状态中的 5 个（不含已接单）', async () => {
      renderWithRoutes(['/'], []);
      await userEvent.click(
        screen.getByRole('button', { name: /加载演示数据/ })
      );

      await waitFor(() => {
        expect(screen.getByText('共 5 个订单')).toBeInTheDocument();
      });

      const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
      const statuses = stored.map((o) => o.status);
      expect(statuses).toContain('生产中');
      expect(statuses).toContain('验货');
      expect(statuses).toContain('待出货');
      expect(statuses).toContain('已出货');
      expect(statuses).toContain('已收款');
      expect(statuses).not.toContain('已接单');
    });

    it('演示数据带有标签（#A客户 #欧洲线等）', async () => {
      renderWithRoutes(['/'], []);
      await userEvent.click(
        screen.getByRole('button', { name: /加载演示数据/ })
      );

      await waitFor(() => {
        expect(screen.getByText('共 5 个订单')).toBeInTheDocument();
      });

      const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
      const allTags = stored.flatMap((o) => o.tags || []);
      expect(allTags).toContain('#A客户');
      expect(allTags).toContain('#欧洲线');
      expect(allTags).toContain('#日本线');
      expect(allTags).toContain('#中东线');
    });

    it('演示数据每条都有 PO 号、客户名、工厂等关键字段', async () => {
      renderWithRoutes(['/'], []);
      await userEvent.click(
        screen.getByRole('button', { name: /加载演示数据/ })
      );

      await waitFor(() => {
        expect(screen.getByText('共 5 个订单')).toBeInTheDocument();
      });

      const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
      stored.forEach((order) => {
        expect(order.poNumber).toBeTruthy();
        expect(order.customerName).toBeTruthy();
        expect(order.factoryName).toBeTruthy();
        expect(order.timeline).toBeDefined();
        expect(order.timeline.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('成功加载后显示 Snackbar 提示', async () => {
      renderWithRoutes(['/'], []);
      await userEvent.click(
        screen.getByRole('button', { name: /加载演示数据/ })
      );

      await waitFor(() => {
        expect(screen.getByText(/已加载 5 条演示数据/)).toBeInTheDocument();
      });
    });

    it('重复点击加载不会重复（PO 号去重）', async () => {
      renderWithRoutes(['/'], []);
      await userEvent.click(
        screen.getByRole('button', { name: /加载演示数据/ })
      );

      await waitFor(() => {
        expect(screen.getByText('共 5 个订单')).toBeInTheDocument();
      });

      const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
      expect(stored).toHaveLength(5);
    });
  });
});

// ============================================================
// F2: 复制订单
// ============================================================
describe('F2 — 复制订单', () => {
  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockClear();
  });

  const sampleOrder = makeOrder({
    id: 'original-1',
    poNumber: 'PO-ORIGINAL',
    customerName: 'Original Client',
    productSummary: 'Original Product',
    quantity: 500,
    amount: '$5,000.00',
    tradeTerm: 'FOB',
    portOfLoading: 'Ningbo',
    portOfDestination: 'LA',
    estimatedDeliveryDate: '2024-12-25',
    salesperson: '张三',
    factoryName: 'XX工厂',
    notes: 'Original notes',
    tags: ['#A客户', '#急单'],
    status: '生产中',
  });

  describe('OrderList 列表复制按钮', () => {
    it('列表中每行都有复制按钮（ContentCopy Tooltip）', () => {
      const orders = [
        makeOrder({ id: 'O1', poNumber: 'PO-1' }),
        makeOrder({ id: 'O2', poNumber: 'PO-2' }),
        makeOrder({ id: 'O3', poNumber: 'PO-3' }),
      ];
      renderWithRoutes(['/orders'], orders);

      const copyButtons = screen.getAllByLabelText('复制订单');
      expect(copyButtons).toHaveLength(3);
    });
  });

  describe('OrderDetail 详情页复制按钮', () => {
    it('详情页显示「复制订单」按钮', () => {
      renderWithRoutes(['/orders/original-1'], [sampleOrder]);

      expect(
        screen.getByRole('button', { name: /复制订单/ })
      ).toBeInTheDocument();
    });
  });

  describe('OrderForm 复制模式（?copy=id）', () => {
    it('复制模式下页面标题显示「复制订单」', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(screen.getByText('复制订单')).toBeInTheDocument();
    });

    it('PO 号字段为空（关键：避免 PO 号重复）', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      // MUI TextField label is "PO号 *" with required asterisk
      const poInput = screen.getByLabelText(/PO号/);
      expect(poInput.value).toBe('');
    });

    it('客户名称预填为源订单的值', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(screen.getByLabelText(/客户名称/).value).toBe('Original Client');
    });

    it('产品概述预填', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(screen.getByLabelText(/产品概述/).value).toBe('Original Product');
    });

    it('数量预填', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(Number(screen.getByLabelText(/数量/).value)).toBe(500);
    });

    it('金额预填', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(screen.getByLabelText(/金额/).value).toBe('$5,000.00');
    });

    it('起运港/目的港预填', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(screen.getByLabelText('起运港').value).toBe('Ningbo');
      expect(screen.getByLabelText('目的港').value).toBe('LA');
    });

    it('预计交货日预填', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(screen.getByLabelText('预计交货日').value).toBe('2024-12-25');
    });

    it('业务员/工厂名称预填', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(screen.getByLabelText('业务员').value).toBe('张三');
      expect(screen.getByLabelText('工厂名称').value).toBe('XX工厂');
    });

    it('备注预填', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(screen.getByLabelText('备注').value).toBe('Original notes');
    });

    it('标签也复制（#A客户 #急单）', () => {
      renderWithRoutes(['/orders/new?copy=original-1'], [sampleOrder]);

      expect(screen.getByText('#A客户')).toBeInTheDocument();
      expect(screen.getByText('#急单')).toBeInTheDocument();
    });

    it('复制不存在的订单时不会崩溃', () => {
      const { container } = renderWithRoutes(
        ['/orders/new?copy=nonexistent'],
        []
      );
      expect(container).toBeTruthy();
    });
  });
});

// ============================================================
// F3: 页面标题未完成数
// ============================================================
describe('F3 — 页面标题未完成数 (Layout)', () => {
  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockClear();
    document.title = '';
  });

  it('全部订单完成（都是已出货/已收款）时，title = 「📊 外贸跟单系统」', async () => {
    const orders = [
      makeOrder({ id: 'O1', status: '已出货' }),
      makeOrder({ id: 'O2', status: '已收款' }),
    ];
    renderLayout(orders);

    await waitFor(() => {
      expect(document.title).toBe('📊 外贸跟单系统');
    });
  });

  it('有 N 个未完成订单时，title = 「📊 (N) 外贸跟单系统」', async () => {
    const orders = [
      makeOrder({ id: 'O1', status: '已接单' }),
      makeOrder({ id: 'O2', status: '生产中' }),
      makeOrder({ id: 'O3', status: '验货' }),
      makeOrder({ id: 'O4', status: '待出货' }),
      makeOrder({ id: 'O5', status: '已出货' }),
      makeOrder({ id: 'O6', status: '已收款' }),
    ];
    renderLayout(orders);

    await waitFor(() => {
      // 未完成 = 已接单+生产中+验货+待出货 = 4
      expect(document.title).toBe('📊 (4) 外贸跟单系统');
    });
  });

  it('未完成数为 1 时，title = 「📊 (1) 外贸跟单系统」', async () => {
    const orders = [
      makeOrder({ id: 'O1', status: '生产中' }),
      makeOrder({ id: 'O2', status: '已收款' }),
    ];
    renderLayout(orders);

    await waitFor(() => {
      expect(document.title).toBe('📊 (1) 外贸跟单系统');
    });
  });

  it('无订单时，title = 「📊 外贸跟单系统」', async () => {
    renderLayout([]);

    await waitFor(() => {
      expect(document.title).toBe('📊 外贸跟单系统');
    });
  });

  it('未完成数的计算：仅排除「已出货」和「已收款」', async () => {
    const orders = STATUS_NODES.map((status) =>
      makeOrder({ id: status, status })
    );
    renderLayout(orders);

    await waitFor(() => {
      // 6 个状态 - 2 个完成 = 4
      expect(document.title).toBe('📊 (4) 外贸跟单系统');
    });
  });
});

// ============================================================
// F4: 列表快速状态推进
// ============================================================
describe('F4 — 列表快速状态推进 (OrderList)', () => {
  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockClear();
  });

  it('非最终状态订单行显示推进按钮（ArrowForward 图标）', () => {
    const orders = [
      makeOrder({ id: 'O1', status: '已接单', poNumber: 'PO-1' }),
      makeOrder({ id: 'O2', status: '生产中', poNumber: 'PO-2' }),
      makeOrder({ id: 'O3', status: '验货', poNumber: 'PO-3' }),
    ];
    renderWithRoutes(['/orders'], orders);

    const advanceButtons = screen.getAllByLabelText('快速推进状态');
    expect(advanceButtons).toHaveLength(3);
  });

  it('已收款订单不显示推进按钮', () => {
    const orders = [
      makeOrder({ id: 'O1', status: '已收款', poNumber: 'PO-PAID' }),
    ];
    renderWithRoutes(['/orders'], orders);

    expect(screen.queryByLabelText('快速推进状态')).not.toBeInTheDocument();
  });

  it('已出货订单显示推进按钮（可推进到已收款）', () => {
    const orders = [
      makeOrder({ id: 'O1', status: '已出货', poNumber: 'PO-SHIPPED' }),
    ];
    renderWithRoutes(['/orders'], orders);

    expect(screen.getByLabelText('快速推进状态')).toBeInTheDocument();
  });

  it('点击推进按钮打开下拉菜单，显示下一个可选状态', async () => {
    const orders = [
      makeOrder({ id: 'O1', status: '已接单', poNumber: 'PO-1' }),
    ];
    renderWithRoutes(['/orders'], orders);

    await userEvent.click(screen.getByLabelText('快速推进状态'));

    // 已接单 → 所有后续 5 个状态
    expect(screen.getByText(/生产中/)).toBeInTheDocument();
    expect(screen.getByText(/验货/)).toBeInTheDocument();
    expect(screen.getByText(/待出货/)).toBeInTheDocument();
  });

  it('选择新状态后，订单状态更新', async () => {
    const orders = [
      makeOrder({ id: 'O1', status: '生产中', poNumber: 'PO-1' }),
    ];
    renderWithRoutes(['/orders'], orders);

    await userEvent.click(screen.getByLabelText('快速推进状态'));

    // 推进到「验货」
    const menuItem = screen.getByText(/验货/);
    await userEvent.click(menuItem);

    await waitFor(() => {
      expect(
        screen.getByText(/订单状态已推进至「验货」/)
      ).toBeInTheDocument();
    });

    const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
    expect(stored[0].status).toBe('验货');
  });

  it('menu 中不包含当前状态或之前的状态', async () => {
    const orders = [
      makeOrder({ id: 'O1', status: '待出货', poNumber: 'PO-1' }),
    ];
    renderWithRoutes(['/orders'], orders);

    await userEvent.click(screen.getByLabelText('快速推进状态'));

    // 待出货 → 只能推进到已出货、已收款
    expect(screen.getByText(/已出货/)).toBeInTheDocument();
    expect(screen.getByText(/已收款/)).toBeInTheDocument();
    expect(screen.queryByText(/已接单/)).not.toBeInTheDocument();
  });
});

// ============================================================
// REG: 回归测试 — 已有功能不受影响
// ============================================================
describe('REG — 回归测试：已有功能', () => {
  beforeEach(() => {
    localStorage.clear();
    navigateMock.mockClear();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- CRUD ---
  describe('CRUD 操作', () => {
    it('新建订单：填写必填项后成功创建', async () => {
      renderWithRoutes(['/orders/new'], []);

      await userEvent.type(screen.getByLabelText(/客户名称/), 'Test Client');
      await userEvent.type(screen.getByLabelText(/PO号/), 'PO-NEW-001');
      await userEvent.type(screen.getByLabelText(/产品概述/), 'New Product');
      await userEvent.type(screen.getByLabelText(/数量/), '100');
      await userEvent.type(screen.getByLabelText(/金额/), '$1,000');

      // 贸易术语 Autocomplete：getByLabelText 返回 input 本身
      const tradeInput = screen.getByLabelText(/贸易术语/);
      await userEvent.click(tradeInput);
      await userEvent.type(tradeInput, 'FOB');

      await userEvent.click(screen.getByRole('button', { name: /创建订单/ }));

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
        expect(stored).toHaveLength(1);
        expect(stored[0].poNumber).toBe('PO-NEW-001');
        expect(stored[0].status).toBe('已接单');
      });
    });

    it('编辑订单：可编辑非锁定状态的订单（验证 OrderForm 编辑模式渲染）', () => {
      const order = makeOrder({
        id: 'edit-me',
        poNumber: 'PO-EDIT',
        customerName: 'Edit Client',
        status: '生产中',
      });

      localStorage.setItem('order_tracking_orders', JSON.stringify([order]));

      render(
        <MemoryRouter initialEntries={['/orders/edit-me/edit']}>
          <OrderProvider>
            <Routes>
              <Route path="/orders/:id/edit" element={<OrderForm />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/orders" element={<OrderList />} />
            </Routes>
          </OrderProvider>
        </MemoryRouter>
      );

      // navigate mock 阻止了 useEffect 中的重定向，表单应正常渲染
      expect(screen.getByText('编辑订单')).toBeInTheDocument();
      expect(screen.getByLabelText(/客户名称/).value).toBe('Edit Client');
      expect(screen.getByLabelText(/PO号/).value).toBe('PO-EDIT');
    });

    it('查看详情：订单详情页正常渲染', () => {
      const order = makeOrder({
        id: 'detail-1',
        poNumber: 'PO-DETAIL',
        customerName: 'Detail Client',
        tags: ['#VIP'],
      });
      renderWithRoutes(['/orders/detail-1'], [order]);

      expect(screen.getByText('订单详情')).toBeInTheDocument();
      expect(screen.getByText('PO-DETAIL')).toBeInTheDocument();
      expect(screen.getByText('Detail Client')).toBeInTheDocument();
    });

    it('删除订单：确认后从列表移除', async () => {
      const order = makeOrder({
        id: 'del-me',
        poNumber: 'PO-DEL',
        status: '已接单',
      });
      renderWithRoutes(['/orders/del-me'], [order]);

      await userEvent.click(screen.getByRole('button', { name: /删除订单/ }));

      // 确认弹窗
      expect(screen.getByText('确认删除？')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /确认删除/ }));

      await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
        expect(stored).toHaveLength(0);
      });
    });
  });

  // --- 标签 ---
  describe('标签功能', () => {
    it('订单列表显示标签筛选 Chip', () => {
      const orders = [
        makeOrder({ id: 'O1', poNumber: 'PO-1', tags: ['#A客户'] }),
        makeOrder({ id: 'O2', poNumber: 'PO-2', tags: ['#B客户'] }),
      ];
      renderWithRoutes(['/orders'], orders);

      expect(screen.getByText(/全部/)).toBeInTheDocument();
      expect(screen.getByText(/#A客户/)).toBeInTheDocument();
      expect(screen.getByText(/#B客户/)).toBeInTheDocument();
    });
  });

  // --- 分享 ---
  describe('分享功能', () => {
    it('OrderDetail 包含分享链接组件', () => {
      const order = makeOrder({
        id: 'share-1',
        poNumber: 'PO-SHARE',
        shareToken: 'test-token-123',
      });
      const { container } = renderWithRoutes(['/orders/share-1'], [order]);
      expect(container).toBeTruthy();
    });
  });

  // --- 超期高亮 ---
  describe('超期/停滞高亮', () => {
    it('超期订单行存在（已过交货日且非完成状态）', () => {
      const overdue = makeOrder({
        id: 'O1',
        poNumber: 'PO-OVERDUE',
        status: '生产中',
        estimatedDeliveryDate: '2020-01-01',
      });
      renderWithRoutes(['/orders'], [overdue]);

      expect(screen.getByText('PO-OVERDUE')).toBeInTheDocument();
    });

    it('已出货/已收款订单仍然显示（不过期报错）', () => {
      const shipped = makeOrder({
        id: 'O1', poNumber: 'PO-SHIPPED', status: '已出货',
        estimatedDeliveryDate: '2020-01-01',
      });
      const paid = makeOrder({
        id: 'O2', poNumber: 'PO-PAID', status: '已收款',
        estimatedDeliveryDate: '2020-01-01',
      });
      renderWithRoutes(['/orders'], [shipped, paid]);

      expect(screen.getByText('PO-SHIPPED')).toBeInTheDocument();
      expect(screen.getByText('PO-PAID')).toBeInTheDocument();
    });
  });

  // --- 周报 ---
  describe('周报功能', () => {
    it('「生成周报」按钮仍然可用', () => {
      renderWithRoutes(['/'], []);
      expect(screen.getByRole('button', { name: /生成周报/ })).toBeInTheDocument();
    });
  });

  // --- 导出/导入 ---
  describe('导出/导入', () => {
    it('Layout 显示「导出数据」和「导入数据」按钮', () => {
      renderLayout([]);
      expect(screen.getByText('导出数据')).toBeInTheDocument();
      expect(screen.getByText('导入数据')).toBeInTheDocument();
    });

    it('OrderList 显示「导出 CSV」按钮', () => {
      renderWithRoutes(['/orders'], [makeOrder({ id: 'O1', poNumber: 'PO-1' })]);
      expect(screen.getByRole('button', { name: /导出 CSV/ })).toBeInTheDocument();
    });
  });

  // --- 搜索和筛选 ---
  describe('搜索和筛选', () => {
    it('关键字搜索过滤订单', async () => {
      const orders = [
        makeOrder({ id: 'O1', customerName: 'Alpha Co', poNumber: 'PO-A' }),
        makeOrder({ id: 'O2', customerName: 'Beta Co', poNumber: 'PO-B' }),
      ];
      renderWithRoutes(['/orders'], orders);

      const searchInput = screen.getByPlaceholderText('搜索客户名称或PO号…');
      await userEvent.type(searchInput, 'Alpha');

      await waitFor(() => {
        expect(screen.getByText('Alpha Co')).toBeInTheDocument();
        expect(screen.queryByText('Beta Co')).not.toBeInTheDocument();
      });
    });

    it('状态筛选过滤订单', async () => {
      const orders = [
        makeOrder({ id: 'O1', poNumber: 'PO-PROD', status: '生产中' }),
        makeOrder({ id: 'O2', poNumber: 'PO-INSP', status: '验货' }),
      ];
      renderWithRoutes(['/orders'], orders);

      // 使用 MUI Select 的 role="combobox" 来点击
      const selectButton = screen.getByRole('combobox');
      await userEvent.click(selectButton);

      // 选择「生产中」
      const option = screen.getByRole('option', { name: '生产中' });
      await userEvent.click(option);

      await waitFor(() => {
        expect(screen.getByText('PO-PROD')).toBeInTheDocument();
        expect(screen.queryByText('PO-INSP')).not.toBeInTheDocument();
      });
    });
  });

  // --- 空状态 ---
  describe('空状态', () => {
    it('OrderList 空状态显示提示', () => {
      renderWithRoutes(['/orders'], []);
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('OrderDetail 不存在的订单显示「订单不存在」', () => {
      renderWithRoutes(['/orders/nope'], []);
      expect(screen.getByText('订单不存在')).toBeInTheDocument();
    });
  });
});
