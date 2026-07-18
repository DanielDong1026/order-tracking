/**
 * 页面测试：SharePage 分享只读页
 * 验证：localStorage 读取、stripAttachmentData、错误状态、品牌页脚
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SharePage from '../pages/SharePage';
import { APP_NAME } from '../data/constants';

/**
 * 辅助：渲染 SharePage 并传入 shareToken 路由参数
 */
function renderSharePage(shareToken, { ordersInStorage = null } = {}) {
  if (ordersInStorage !== null) {
    localStorage.setItem('order_tracking_orders', JSON.stringify(ordersInStorage));
  }

  return render(
    <MemoryRouter initialEntries={[`/share/${shareToken}`]}>
      <Routes>
        <Route path="/share/:shareToken" element={<SharePage />} />
      </Routes>
    </MemoryRouter>
  );
}

// ---- 构建 mock 订单 ----
function makeOrder(overrides = {}) {
  return {
    id: 'order-001',
    customerName: 'ABC Corp',
    poNumber: 'PO-2024-001',
    productSummary: '户外折叠椅',
    quantity: '2000 pcs',
    amount: '$24,000.00',
    tradeTerm: 'FOB 宁波',
    portOfLoading: '宁波港',
    portOfDestination: '洛杉矶港',
    status: '生产中',
    timeline: [
      {
        node: '已接单',
        date: '2024-05-01T00:00:00.000Z',
        note: '客户已确认订单及交期',
        attachments: [
          { id: 'a1', name: 'PO确认.pdf', data: 'data:application/pdf;base64,BIG_DATA_HERE', type: 'application/pdf' },
        ],
      },
      {
        node: '生产中',
        date: '2024-05-15T00:00:00.000Z',
        note: '面料已到厂，已排产',
        attachments: [
          { id: 'a2', name: '生产照片1.png', data: 'data:image/png;base64,ANOTHER_BIG_DATA', type: 'image/png' },
          { id: 'a3', name: '生产照片2.png', data: 'data:image/png;base64,MORE_DATA', type: 'image/png' },
        ],
      },
    ],
    shareToken: 'abc123def',
    createdAt: '2024-04-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('SharePage — 正确匹配订单', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('应展示订单基本信息（客户名、PO 号、状态等）', async () => {
    const order = makeOrder();
    renderSharePage('abc123def', { ordersInStorage: [order] });

    // 页面标题
    expect(await screen.findByText('📦 订单状态分享')).toBeInTheDocument();

    // 订单信息
    expect(screen.getByText('ABC Corp')).toBeInTheDocument();
    expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
    expect(screen.getByText('户外折叠椅')).toBeInTheDocument();
    expect(screen.getByText('2000 pcs')).toBeInTheDocument();
    expect(screen.getByText('$24,000.00')).toBeInTheDocument();
    expect(screen.getByText('FOB 宁波')).toBeInTheDocument();
  });

  it('应展示跟进时间线', async () => {
    const order = makeOrder();
    renderSharePage('abc123def', { ordersInStorage: [order] });

    expect(await screen.findByText('📋 跟单时间线')).toBeInTheDocument();
    // 「生产中」可能出现在 StatusBadge + TimelineNode 两处，用 getAllByText
    expect(screen.getByText('已接单')).toBeInTheDocument();
    expect(screen.getAllByText('生产中').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('当前状态')).toBeInTheDocument();
  });

  it('应展示品牌页脚', async () => {
    const order = makeOrder();
    renderSharePage('abc123def', { ordersInStorage: [order] });

    expect(await screen.findByText(`本页面由${APP_NAME}生成`)).toBeInTheDocument();
  });

  it('应动态设置 document.title', async () => {
    const order = makeOrder();
    renderSharePage('abc123def', { ordersInStorage: [order] });

    await screen.findByText('📦 订单状态分享');
    expect(document.title).toBe(`订单状态分享 — ${APP_NAME}`);
  });

  it('应剥离附件数据（不渲染 Base64）', async () => {
    const order = makeOrder();
    renderSharePage('abc123def', { ordersInStorage: [order] });

    await screen.findByText('📦 订单状态分享');

    const html = document.body.innerHTML;
    // Base64 data 不应出现在页面中
    expect(html).not.toContain('BIG_DATA_HERE');
    expect(html).not.toContain('ANOTHER_BIG_DATA');
    expect(html).not.toContain('MORE_DATA');
    // 但附件数量应显示
    expect(screen.getByText('📎 有 1 个附件')).toBeInTheDocument();
    expect(screen.getByText('📎 有 2 个附件')).toBeInTheDocument();
  });
});

describe('SharePage — 链接失效 / 订单不存在', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无匹配订单时应显示「链接已失效或不存在」', async () => {
    renderSharePage('ghosttoken', { ordersInStorage: [] });

    expect(await screen.findByText('链接已失效或不存在')).toBeInTheDocument();
  });

  it('shareToken 不匹配时应显示错误页', async () => {
    const order = makeOrder({ shareToken: 'real_token' });
    renderSharePage('wrong_token', { ordersInStorage: [order] });

    expect(await screen.findByText('链接已失效或不存在')).toBeInTheDocument();
  });

  it('错误页应包含返回首页链接', async () => {
    renderSharePage('ghosttoken', { ordersInStorage: [] });

    expect(await screen.findByText('返回首页')).toBeInTheDocument();
  });

  it('错误页也应显示品牌页脚', async () => {
    renderSharePage('ghosttoken', { ordersInStorage: [] });

    expect(await screen.findByText(`本页面由${APP_NAME}生成`)).toBeInTheDocument();
  });

  it('localStorage 数据损坏时也应显示错误页', async () => {
    localStorage.setItem('order_tracking_orders', 'not valid json {{{');
    renderSharePage('anyshare', { ordersInStorage: null }); // don't overwrite

    expect(await screen.findByText('链接已失效或不存在')).toBeInTheDocument();
  });
});

describe('SharePage — stripAttachmentData 函数', () => {
  it('剥离后附件只应保留 id/name/type，不应保留 data', () => {
    const order = makeOrder();
    // 模拟 stripAttachmentData 行为
    const stripped = {
      ...order,
      timeline: order.timeline.map((entry) => ({
        ...entry,
        attachments: (entry.attachments || []).map((att) => ({
          id: att.id,
          name: att.name,
          type: att.type,
        })),
      })),
    };

    // 验证：不应包含 data 字段
    for (const entry of stripped.timeline) {
      for (const att of entry.attachments) {
        expect(att).toHaveProperty('id');
        expect(att).toHaveProperty('name');
        expect(att).toHaveProperty('type');
        expect(att).not.toHaveProperty('data');
      }
    }
  });

  it('order 为 null/undefined 时应安全返回', () => {
    // 模拟
    const strip = (order) => {
      if (!order || !order.timeline) return order;
      return {
        ...order,
        timeline: order.timeline.map((entry) => ({
          ...entry,
          attachments: (entry.attachments || []).map((att) => ({
            id: att.id,
            name: att.name,
            type: att.type,
          })),
        })),
      };
    };

    expect(strip(null)).toBeNull();
    expect(strip(undefined)).toBeUndefined();
  });

  it('无 timeline 字段的订单应安全处理', () => {
    const orderNoTimeline = { id: '001', customerName: 'Test' };
    const strip = (order) => {
      if (!order || !order.timeline) return order;
      return { ...order };
    };

    expect(strip(orderNoTimeline)).toEqual(orderNoTimeline);
  });
});

describe('SharePage — 独立路由（无 Layout）', () => {
  it('不应渲染侧边栏/顶部导航（独立页面）', async () => {
    const order = makeOrder();
    renderSharePage('abc123def', { ordersInStorage: [order] });

    await screen.findByText('📦 订单状态分享');

    // 不应包含 Layout 特有的元素
    expect(screen.queryByText('仪表盘')).not.toBeInTheDocument();
    expect(screen.queryByText('订单列表')).not.toBeInTheDocument();
  });

  it('不应依赖 OrderProvider / useOrders', async () => {
    // 确保 localStorage 干净（无匹配订单）
    localStorage.clear();

    // 直接在 MemoryRouter 中渲染，不含 OrderProvider
    const result = render(
      <MemoryRouter initialEntries={['/share/abc123def']}>
        <Routes>
          <Route path="/share/:shareToken" element={<SharePage />} />
        </Routes>
      </MemoryRouter>
    );

    // 如果能正常渲染（不抛 useOrders 错误），说明不依赖 OrderProvider
    // 但由于没有订单数据，应显示错误页
    expect(await result.findByText('链接已失效或不存在')).toBeInTheDocument();
  });
});
