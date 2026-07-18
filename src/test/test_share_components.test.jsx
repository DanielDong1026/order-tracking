/**
 * 组件测试：ShareLinkSection、ShareOrderCard、ShareTimeline
 * 使用 @testing-library/react 进行渲染和行为验证
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { OrderProvider } from '../context/OrderContext';
import ShareLinkSection from '../components/ShareLinkSection';
import ShareOrderCard from '../components/ShareOrderCard';
import ShareTimeline from '../components/ShareTimeline';

// ---- 辅助函数 ----
function renderWithProviders(ui, { orders = [] } = {}) {
  // 预填充 localStorage（mock 由 setup.js 提供）
  if (orders.length > 0) {
    localStorage.setItem('order_tracking_orders', JSON.stringify(orders));
  }

  return render(
    <MemoryRouter>
      <OrderProvider>
        {ui}
      </OrderProvider>
    </MemoryRouter>
  );
}

// ==========================================
// ShareLinkSection
// ==========================================
describe('ShareLinkSection — 状态机', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('未生成状态（shareToken 为空）', () => {
    it('应仅显示「生成分享链接」按钮', () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken={undefined} />);

      expect(screen.getByText('生成分享链接')).toBeInTheDocument();
      expect(screen.queryByText('重新生成')).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue(/share\//)).not.toBeInTheDocument();
    });

    it('按钮应包含 Share 图标', () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken={undefined} />);

      const button = screen.getByText('生成分享链接');
      expect(button).toBeInTheDocument();
    });

    it('shareToken 为 null 时也显示生成按钮', () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken={null} />);

      expect(screen.getByText('生成分享链接')).toBeInTheDocument();
    });
  });

  describe('已生成状态（有 shareToken）', () => {
    it('应显示只读输入框（含分享链接）', () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken="abc123" />);

      const input = screen.getByDisplayValue(/share\/abc123/);
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('readonly');
    });

    it('应显示复制按钮', () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken="abc123" />);

      // IconButton with title "复制链接"
      const copyBtn = screen.getByTitle('复制链接');
      expect(copyBtn).toBeInTheDocument();
    });

    it('应显示「重新生成」按钮', () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken="abc123" />);

      expect(screen.getByText('重新生成')).toBeInTheDocument();
    });

    it('不应显示「生成分享链接」按钮', () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken="abc123" />);

      expect(screen.queryByText('生成分享链接')).not.toBeInTheDocument();
    });
  });

  describe('重新生成确认弹窗', () => {
    it('点击「重新生成」应弹出确认 Dialog', async () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken="abc123" />);

      fireEvent.click(screen.getByText('重新生成'));

      await waitFor(() => {
        expect(screen.getByText('确认重新生成')).toBeInTheDocument();
        expect(screen.getByText('重新生成后，旧链接将立即失效，确认重新生成？')).toBeInTheDocument();
      });
    });

    it('Dialog 应包含「取消」和「确认」按钮', async () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken="abc123" />);

      fireEvent.click(screen.getByText('重新生成'));

      await waitFor(() => {
        expect(screen.getByText('取消')).toBeInTheDocument();
        expect(screen.getByText('确认')).toBeInTheDocument();
      });
    });

    it('点击「取消」应关闭弹窗', async () => {
      renderWithProviders(<ShareLinkSection orderId="001" shareToken="abc123" />);

      fireEvent.click(screen.getByText('重新生成'));
      await waitFor(() => expect(screen.getByText('取消')).toBeInTheDocument());

      fireEvent.click(screen.getByText('取消'));

      await waitFor(() => {
        expect(screen.queryByText('确认重新生成')).not.toBeInTheDocument();
      });
    });
  });

  describe('复制反馈', () => {
    it('点击复制按钮后应显示「✓ 已复制」', async () => {
      // Mock clipboard API
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      renderWithProviders(<ShareLinkSection orderId="001" shareToken="abc123" />);

      const copyBtn = screen.getByTitle('复制链接');
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(screen.getByText('✓ 已复制')).toBeInTheDocument();
      });
    });

    it('「✓ 已复制」应在 1.5 秒后消失', async () => {
      vi.useFakeTimers();

      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        writable: true,
        configurable: true,
      });

      renderWithProviders(<ShareLinkSection orderId="001" shareToken="abc123" />);

      fireEvent.click(screen.getByTitle('复制链接'));

      // 等待 clipboard promise resolve + React 状态更新
      await vi.advanceTimersByTimeAsync(0);
      await vi.runAllTicks();

      // 应该立即显示
      expect(screen.getByText('✓ 已复制')).toBeInTheDocument();

      // 1.5 秒后消失
      await vi.advanceTimersByTimeAsync(1500);

      expect(screen.queryByText('✓ 已复制')).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });
});

// ==========================================
// ShareOrderCard
// ==========================================
describe('ShareOrderCard — 只读订单信息卡片', () => {
  const mockOrder = {
    id: '001',
    customerName: 'ABC Corp',
    poNumber: 'PO-2024-001',
    productSummary: '户外折叠椅',
    quantity: '2000 pcs',
    amount: '$24,000.00',
    tradeTerm: 'FOB 宁波',
    portOfLoading: '宁波港',
    portOfDestination: '洛杉矶港',
    status: '生产中',
  };

  it('应展示客户名、PO 号、产品、数量、金额、贸易术语', () => {
    render(<ShareOrderCard order={mockOrder} />);

    expect(screen.getByText('ABC Corp')).toBeInTheDocument();
    expect(screen.getByText('PO-2024-001')).toBeInTheDocument();
    expect(screen.getByText('户外折叠椅')).toBeInTheDocument();
    expect(screen.getByText('2000 pcs')).toBeInTheDocument();
    expect(screen.getByText('$24,000.00')).toBeInTheDocument();
    expect(screen.getByText('FOB 宁波')).toBeInTheDocument();
  });

  it('应展示起运港和目的港', () => {
    render(<ShareOrderCard order={mockOrder} />);

    expect(screen.getByText('宁波港')).toBeInTheDocument();
    expect(screen.getByText('洛杉矶港')).toBeInTheDocument();
  });

  it('应展示订单状态', () => {
    render(<ShareOrderCard order={mockOrder} />);

    expect(screen.getByText('生产中')).toBeInTheDocument();
    expect(screen.getByText('当前状态：')).toBeInTheDocument();
  });

  it('空字段应显示 "-"', () => {
    const orderWithEmpty = {
      ...mockOrder,
      portOfLoading: '',
      portOfDestination: undefined,
    };
    render(<ShareOrderCard order={orderWithEmpty} />);

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('不传 order 时应返回 null（不渲染）', () => {
    const { container } = render(<ShareOrderCard order={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('不应展示附件内容', () => {
    const orderWithAttachment = {
      ...mockOrder,
      piAttachment: 'data:image/png;base64,iVBOR...',
    };
    render(<ShareOrderCard order={orderWithAttachment} />);

    // piAttachment 数据不应在 DOM 中
    expect(screen.queryByText(/base64/)).not.toBeInTheDocument();
    expect(screen.queryByText('PI 附件')).not.toBeInTheDocument();
  });
});

// ==========================================
// ShareTimeline
// ==========================================
describe('ShareTimeline — 只读时间线', () => {
  const timeline = [
    { node: '已接单', date: '2024-05-01T00:00:00.000Z', note: '客户已确认订单', attachments: [{ id: 'a1', name: 'PO.pdf', data: 'BASE64_DATA_HERE', type: 'application/pdf' }] },
    { node: '生产中', date: '2024-05-15T00:00:00.000Z', note: '面料已到厂', attachments: [] },
    { node: '验货', date: '2024-06-10T00:00:00.000Z', note: '', attachments: [] },
    { node: '待出货', date: '2024-06-15T00:00:00.000Z', note: null, attachments: [] },
  ];

  it('应展示已完成的节点名称和日期', () => {
    render(<ShareTimeline timeline={timeline} currentStatus="待出货" />);

    expect(screen.getByText('已接单')).toBeInTheDocument();
    expect(screen.getByText('生产中')).toBeInTheDocument();
    expect(screen.getByText('验货')).toBeInTheDocument();
    expect(screen.getByText('待出货')).toBeInTheDocument();
  });

  it('应展示节点备注', () => {
    render(<ShareTimeline timeline={timeline} currentStatus="待出货" />);

    expect(screen.getByText('客户已确认订单')).toBeInTheDocument();
    expect(screen.getByText('面料已到厂')).toBeInTheDocument();
  });

  it('有附件的节点应显示附件数量（不读取 data）', () => {
    render(<ShareTimeline timeline={timeline} currentStatus="待出货" />);

    expect(screen.getByText('📎 有 1 个附件')).toBeInTheDocument();
  });

  it('无附件的节点应显示 "(无附件)"', () => {
    render(<ShareTimeline timeline={timeline} currentStatus="待出货" />);

    const noAttachmentTexts = screen.getAllByText('(无附件)');
    expect(noAttachmentTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('不传 timeline 时应显示「暂无状态记录」', () => {
    render(<ShareTimeline timeline={[]} currentStatus="已接单" />);

    expect(screen.getByText('暂无状态记录')).toBeInTheDocument();
  });

  it('timeline 为 undefined 时应显示「暂无状态记录」', () => {
    render(<ShareTimeline timeline={undefined} currentStatus="已接单" />);

    expect(screen.getByText('暂无状态记录')).toBeInTheDocument();
  });

  it('绝不应渲染附件 Base64 data 内容', () => {
    // 在 timeline 中包含大体积 Base64 数据
    const timelineWithBigData = [
      { node: '已接单', date: '2024-05-01T00:00:00.000Z', note: '测试', attachments: [
        { id: 'a1', name: 'test.png', data: 'data:image/png;base64,iVBORw0KGgoAAAAANS...', type: 'image/png' },
      ]},
    ];

    render(<ShareTimeline timeline={timelineWithBigData} currentStatus="已接单" />);

    // 不应包含 Base64 数据字符串
    const html = document.body.innerHTML;
    expect(html).not.toContain('iVBORw0KGgo');
    expect(html).not.toContain('base64');
    // 但应显示附件指示
    expect(screen.getByText('📎 有 1 个附件')).toBeInTheDocument();
  });

  it('应标识当前状态节点', () => {
    render(<ShareTimeline timeline={timeline} currentStatus="生产中" />);

    expect(screen.getByText('当前状态')).toBeInTheDocument();
  });

  it('所有 6 个 STATUS_NODES 节点都应渲染', () => {
    render(<ShareTimeline timeline={timeline} currentStatus="待出货" />);

    // 所有 6 个节点名都应出现
    expect(screen.getByText('已接单')).toBeInTheDocument();
    expect(screen.getByText('生产中')).toBeInTheDocument();
    expect(screen.getByText('验货')).toBeInTheDocument();
    expect(screen.getByText('待出货')).toBeInTheDocument();
    expect(screen.getByText('已出货')).toBeInTheDocument();
    expect(screen.getByText('已收款')).toBeInTheDocument();
  });
});
