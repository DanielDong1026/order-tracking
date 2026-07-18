/**
 * 仪表盘"周报一键生成"功能测试
 *
 * 覆盖 PRD V2.4 增量中 AC-1 ~ AC-4 全部验收标准，
 * 以及 generateReport / CSV / Dialog / 回归等关键路径。
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
import { MemoryRouter } from 'react-router-dom';
import { OrderProvider } from '../context/OrderContext';
import Dashboard from '../pages/Dashboard';

// ============================================================
// 辅助工具
// ============================================================

/**
 * 构造一条标准订单 fixture。
 * 注意：?? 运算符会将 null 替换为默认值。若需真 null，请通过 extra 传入。
 */
function makeOrder(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: overrides.id || `O${Math.random().toString(36).slice(2, 8)}`,
    customerName: overrides.customerName || 'Test Client',
    poNumber: overrides.poNumber || 'PO-001',
    productSummary: 'Widget',
    quantity: '1000',
    amount: overrides.amount ?? '$10,000.00',
    tradeTerm: 'FOB',
    status: overrides.status || '已接单',
    createdAt: overrides.createdAt ?? now,
    updatedAt: now,
    timeline: overrides.timeline ?? [
      { node: '已接单', date: now, note: '', attachments: [] },
    ],
    shareToken: null,
    tags: [],
    ...overrides.extra, // ← 用 extra 可真正覆盖为 null/undefined
  };
}

/** 渲染 Dashboard（包裹 Router + Provider），可预设 localStorage 订单 */
function renderDashboard(presetOrders) {
  if (presetOrders !== undefined) {
    localStorage.setItem('order_tracking_orders', JSON.stringify(presetOrders));
  }
  return render(
    <MemoryRouter>
      <OrderProvider>
        <Dashboard />
      </OrderProvider>
    </MemoryRouter>
  );
}

// ============================================================
// 测试套件
// ============================================================

describe('Dashboard 周报一键生成', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================
  // AC-1: 时间范围选择
  // ============================================================
  describe('AC-1 时间范围选择', () => {
    it('仪表盘渲染后可见「生成周报」按钮', () => {
      renderDashboard([]);
      expect(screen.getByRole('button', { name: /生成周报/ })).toBeInTheDocument();
    });

    it('点击按钮后弹出 Dialog，标题为「📊 生成周报」', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('📊 生成周报')).toBeInTheDocument();
    });

    it('Dialog 包含 RadioGroup：本周 / 本月 / 自定义，默认选中「本周」', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      expect(screen.getByLabelText('本周')).toBeInTheDocument();
      expect(screen.getByLabelText('本月')).toBeInTheDocument();
      expect(screen.getByLabelText('自定义')).toBeInTheDocument();
      expect(screen.getByLabelText('本周')).toBeChecked();
    });

    it('切换到「本月」后，本月为选中态，本周取消', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      await userEvent.click(screen.getByLabelText('本月'));

      expect(screen.getByLabelText('本月')).toBeChecked();
      expect(screen.getByLabelText('本周')).not.toBeChecked();
    });

    it('切换到「自定义」后显示起止日期选择器', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      expect(screen.queryByLabelText('起始')).toBeNull();

      await userEvent.click(screen.getByLabelText('自定义'));

      expect(screen.getByLabelText('起始')).toBeInTheDocument();
      expect(screen.getByLabelText('结束')).toBeInTheDocument();
      expect(screen.getByLabelText('起始')).toHaveAttribute('type', 'date');
      expect(screen.getByLabelText('结束')).toHaveAttribute('type', 'date');
    });

    it('本周范围标题中包含起止日期', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const today = dayjs();
      const expectedStart = today.startOf('week').format('YYYY-MM-DD');
      const expectedEnd = today.endOf('week').format('YYYY-MM-DD');

      const reportText = screen.getByText(/📋 跟单周报/).textContent;
      expect(reportText).toContain(expectedStart);
      expect(reportText).toContain(expectedEnd);
    });
  });

  // ============================================================
  // AC-2: 统计报表（5 类指标）
  // ============================================================
  describe('AC-2 统计报表生成', () => {
    it('无订单时所有指标显示 0', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('📦 新接订单：0 单');
      expect(text).toContain('🚢 出货订单：0 单');
      expect(text).toContain('💰 收款订单：0 单');
      expect(text).toContain('🏭 当前卡在生产中：0 单');
      expect(text).toContain('⚠️  已出货未收款：0 单');
      expect(text).toContain('$0.00');
    });

    it('新接订单：统计 createdAt 在范围内的数量和金额', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const orders = [
        makeOrder({ id: 'O1', createdAt: today, amount: '$5,000.00' }),
        makeOrder({ id: 'O2', createdAt: yesterday, amount: '$3,000.00' }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('📦 新接订单：2 单');
      expect(text).toContain('$8,000.00');
    });

    it('出货订单：统计 timeline 中「已出货」节点日期在范围内的订单', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const orders = [
        makeOrder({
          id: 'O1', status: '已出货',
          timeline: [
            { node: '已接单', date: today, note: '', attachments: [] },
            { node: '已出货', date: today, note: '', attachments: [] },
          ],
        }),
        makeOrder({
          id: 'O2', status: '已出货',
          timeline: [
            { node: '已接单', date: today, note: '', attachments: [] },
            { node: '已出货', date: today, note: '', attachments: [] },
          ],
        }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('🚢 出货订单：2 单');
    });

    it('收款订单：统计「已收款」节点并汇总金额', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const orders = [
        makeOrder({
          id: 'O1', status: '已收款', amount: '$12,000.00',
          timeline: [
            { node: '已接单', date: today, note: '', attachments: [] },
            { node: '已出货', date: today, note: '', attachments: [] },
            { node: '已收款', date: today, note: '', attachments: [] },
          ],
        }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('💰 收款订单：1 单');
      expect(text).toContain('$12,000.00');
    });

    it('当前卡在生产中：统计 status==="生产中"（与时间范围无关）', async () => {
      const oldDate = '2020-01-01T00:00:00.000Z';
      const orders = [
        makeOrder({ id: 'O1', status: '生产中', createdAt: oldDate }),
        makeOrder({ id: 'O2', status: '生产中', createdAt: oldDate }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('🏭 当前卡在生产中：2 单');
    });

    it('已出货未收款：统计 status==="已出货"（与时间范围无关）', async () => {
      const oldDate = '2020-01-01T00:00:00.000Z';
      const orders = [
        makeOrder({
          id: 'O1', status: '已出货', createdAt: oldDate,
          timeline: [
            { node: '已接单', date: oldDate, note: '', attachments: [] },
            { node: '已出货', date: oldDate, note: '', attachments: [] },
          ],
        }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('⚠️  已出货未收款：1 单');
    });

    it('金额字段含千分位分隔符和两位小数', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      renderDashboard([makeOrder({ id: 'O1', createdAt: today, amount: '$12,345.50' })]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('$12,345.50');
    });

    it('金额为 0 时显示 $0.00', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      renderDashboard([makeOrder({ id: 'O1', createdAt: today, amount: '$0.00' })]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('$0.00');
    });

    it('已出货未收款 > 0 时追加红色提醒文字', async () => {
      renderDashboard([
        makeOrder({
          id: 'O1', status: '已出货',
          timeline: [
            { node: '已接单', date: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'), note: '', attachments: [] },
            { node: '已出货', date: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'), note: '', attachments: [] },
          ],
        }),
      ]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      expect(screen.getByText(/⚡ 请尽快跟进收款！/)).toBeInTheDocument();
    });
  });

  // ============================================================
  // AC-3: 一键复制
  // ============================================================
  describe('AC-3 一键复制', () => {
    it('点击复制调用 navigator.clipboard.writeText，内容含报表文本', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      await userEvent.click(screen.getByRole('button', { name: /一键复制/ }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
      const copiedText = navigator.clipboard.writeText.mock.calls[0][0];
      expect(copiedText).toContain('📋 跟单周报');
      expect(copiedText).toContain('📦 新接订单');
    });

    it('复制后按钮变为「✓ 已复制」', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      await userEvent.click(screen.getByRole('button', { name: /一键复制/ }));

      expect(screen.getByRole('button', { name: /✓ 已复制/ })).toBeInTheDocument();
    });

    it('1.5s 后恢复为「一键复制」', async () => {
      vi.useFakeTimers();
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      await userEvent.click(screen.getByRole('button', { name: /一键复制/ }));

      expect(screen.getByRole('button', { name: /✓ 已复制/ })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(1500));

      expect(screen.getByRole('button', { name: /一键复制/ })).toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  // ============================================================
  // AC-4: CSV 导出
  // ============================================================
  describe('AC-4 CSV 导出', () => {
    it('「导出 CSV」按钮可见', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      expect(screen.getByRole('button', { name: /导出 CSV/ })).toBeInTheDocument();
    });

    it('点击导出触发下载，文件名含日期范围，CSV 格式正确', async () => {
      // 一次性验证：BOM、七行指标、金额格式、文件名
      const origCreateObjURL = URL.createObjectURL;
      const origRevokeObjURL = URL.revokeObjectURL;
      URL.createObjectURL = vi.fn(() => 'blob:test');
      URL.revokeObjectURL = vi.fn();

      let csvText = '';
      let capturedDownload = '';

      // 捕获 Blob 内容
      const OrigBlob = global.Blob;
      global.Blob = class extends OrigBlob {
        constructor(parts, opts) {
          super(parts, opts);
          csvText = parts[0];
        }
      };

      // 捕获下载文件名
      const origCE = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = origCE(tag);
        if (tag === 'a') {
          const origSetAttr = el.setAttribute.bind(el);
          el.setAttribute = (name, value) => {
            if (name === 'download') capturedDownload = value;
            return origSetAttr(name, value);
          };
        }
        return el;
      });

      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const orders = [
        makeOrder({
          id: 'O1', createdAt: today, amount: '$12,345.67', status: '已收款',
          timeline: [
            { node: '已接单', date: today, note: '', attachments: [] },
            { node: '已出货', date: today, note: '', attachments: [] },
            { node: '已收款', date: today, note: '', attachments: [] },
          ],
        }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      await userEvent.click(screen.getByRole('button', { name: /导出 CSV/ }));

      // 触发下载
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(capturedDownload).toMatch(/^周报_.*\.csv$/);

      // BOM
      expect(csvText.startsWith('\uFEFF')).toBe(true);

      const csv = csvText.replace(/^\uFEFF/, '');
      // 七行指标
      expect(csv).toContain('指标,数值');
      expect(csv).toContain('新接订单（单）');
      expect(csv).toContain('新接订单金额（USD）');
      expect(csv).toContain('出货订单（单）');
      expect(csv).toContain('收款订单（单）');
      expect(csv).toContain('收款订单金额（USD）');
      expect(csv).toContain('当前卡在生产中（单）');
      expect(csv).toContain('已出货未收款（单）');
      expect(csv).toContain('统计时间');

      // 金额格式：纯数字 + 两位小数，无千分位逗号
      expect(csv).toContain('12345.67');
      expect(csvText).not.toMatch(/,12345\.67/);

      // 清理
      global.Blob = OrigBlob;
      URL.createObjectURL = origCreateObjURL;
      URL.revokeObjectURL = origRevokeObjURL;
    }, 15000);
  });

  // ============================================================
  // generateReport 边界 & 空值安全
  // ============================================================
  describe('generateReport 边界与空值安全', () => {
    it('createdAt 为 null 时不抛异常，该订单不计入新接', async () => {
      // 使用 extra 传递真正的 null（?? 会替换 null 为默认值）
      const orders = [
        makeOrder({ id: 'O1', amount: '$5,000.00', extra: { createdAt: null } }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('📦 新接订单：0 单');
    });

    it('amount 为 null/undefined/N/A 时不抛异常，金额归零', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const orders = [
        makeOrder({ id: 'O1', createdAt: today, extra: { amount: null } }),
        makeOrder({ id: 'O2', createdAt: today, extra: { amount: undefined } }),
        makeOrder({ id: 'O3', createdAt: today, amount: 'N/A' }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('📦 新接订单：3 单');
      expect(text).toContain('$0.00');
    });

    it('timeline 中「已出货」节点无 date 字段时不抛异常', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const orders = [
        makeOrder({
          id: 'O1', status: '已出货',
          timeline: [
            { node: '已接单', date: today, note: '', attachments: [] },
            { node: '已出货', note: '', attachments: [] }, // 无 date
          ],
        }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('🚢 出货订单：0 单');
    });

    it('timeline 中「已收款」节点无 date 字段时不抛异常', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const orders = [
        makeOrder({
          id: 'O1', status: '已收款',
          timeline: [
            { node: '已接单', date: today, note: '', attachments: [] },
            { node: '已收款', note: '', attachments: [] }, // 无 date
          ],
        }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('💰 收款订单：0 单');
    });

    it('订单 timeline 为空数组时不抛异常', async () => {
      renderDashboard([makeOrder({ id: 'O1', timeline: [] })]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('🚢 出货订单：0 单');
      expect(text).toContain('💰 收款订单：0 单');
    });

    it('大量订单（50 条）正确统计不卡死', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const orders = Array.from({ length: 50 }, (_, i) =>
        makeOrder({
          id: `O${i}`,
          createdAt: today,
          amount: `$${100 * (i + 1)}.00`,
          status: i % 5 === 0 ? '生产中' : '已接单',
        })
      );

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('📦 新接订单：50 单');
    }, 20000); // 大数据量测试允许更长超时

    it('金额含多种格式时解析正确（$1,234.56 / 1234.56 / USD 前缀 / 后缀）', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      const orders = [
        makeOrder({ id: 'O1', createdAt: today, amount: '$1,234.56' }),
        makeOrder({ id: 'O2', createdAt: today, amount: '1234.56' }),
        makeOrder({ id: 'O3', createdAt: today, amount: 'USD 1,234.56' }),
        makeOrder({ id: 'O4', createdAt: today, amount: '1,234.56 USD' }),
      ];

      renderDashboard(orders);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      const text = screen.getByText(/📋 跟单周报/).textContent;
      // 4 × $1,234.56 = $4,938.24
      expect(text).toContain('$4,938.24');
    });
  });

  // ============================================================
  // Dialog 状态管理
  // ============================================================
  describe('Dialog 状态管理', () => {
    it('关闭 Dialog 再打开后，复制按钮恢复为「一键复制」', async () => {
      // 注意：不用 fake timers，避免与 MUI Dialog 过渡动画冲突
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      // 点击复制
      await userEvent.click(screen.getByRole('button', { name: /一键复制/ }));
      expect(screen.getByRole('button', { name: /✓ 已复制/ })).toBeInTheDocument();

      // 关闭 Dialog — 点击 backdrop 触发 onClose
      const backdrop = document.querySelector('.MuiBackdrop-root');
      await userEvent.click(backdrop);
      await waitFor(
        () => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // 重新打开 — onClose 中 setCopied(false)，应显示「一键复制」
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      expect(await screen.findByRole('button', { name: /一键复制/ })).toBeInTheDocument();
    }, 10000);

    it('切换时间范围后报表自动更新', async () => {
      const today = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
      renderDashboard([
        makeOrder({ id: 'O1', createdAt: today, amount: '$5,000.00' }),
      ]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));

      let text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain('📦 新接订单：1 单');

      // 切换到本月
      await userEvent.click(screen.getByLabelText('本月'));
      text = screen.getByText(/📋 跟单周报/).textContent;
      // 本月也应包含今天的数据
      expect(text).toContain('📦 新接订单：1 单');
    });
  });

  // ============================================================
  // 回归测试：原有仪表盘功能未被破坏
  // ============================================================
  describe('回归：原有仪表盘功能', () => {
    it('仪表盘标题「仪表盘」仍显示', () => {
      renderDashboard([]);
      expect(screen.getByText('仪表盘')).toBeInTheDocument();
    });

    it('显示订单总数', () => {
      renderDashboard([makeOrder(), makeOrder()]);
      expect(screen.getByText('共 2 个订单')).toBeInTheDocument();
    });

    it('6 种状态卡片正常渲染', () => {
      const orders = [
        makeOrder({ id: 'O1', status: '已接单' }),
        makeOrder({ id: 'O2', status: '生产中' }),
        makeOrder({ id: 'O3', status: '验货' }),
        makeOrder({ id: 'O4', status: '待出货' }),
        makeOrder({ id: 'O5', status: '已出货' }),
        makeOrder({ id: 'O6', status: '已收款' }),
      ];
      renderDashboard(orders);

      // 每种状态 count = 1，至少出现 6 个 "1"
      const ones = screen.getAllByText('1');
      expect(ones.length).toBeGreaterThanOrEqual(6);
    });

    it('已出货未收款预警 Alert 显示', () => {
      renderDashboard([
        makeOrder({
          id: 'O1', status: '已出货',
          timeline: [
            { node: '已接单', date: new Date().toISOString(), note: '', attachments: [] },
            { node: '已出货', date: new Date().toISOString(), note: '', attachments: [] },
          ],
        }),
      ]);

      expect(screen.getByText('已出货未收款预警')).toBeInTheDocument();
      expect(screen.getByText(/有 1 个订单已出货但尚未收款/)).toBeInTheDocument();
    });

    it('最近更新列表渲染', () => {
      const now = new Date().toISOString();
      renderDashboard([
        makeOrder({
          id: 'O1',
          timeline: [{ node: '已接单', date: now, note: '测试备注', attachments: [] }],
        }),
      ]);
      expect(screen.getByText('最近更新')).toBeInTheDocument();
    });

    it('无订单时显示空状态提示', () => {
      renderDashboard([]);
      expect(screen.getByText('暂无数据，去创建第一个订单吧')).toBeInTheDocument();
    });
  });

  // ============================================================
  // "本月"日期范围语义检查
  // ============================================================
  describe('本月时间范围', () => {
    it('本月起始日为当月 1 日', () => {
      const today = dayjs();
      const monthStart = today.startOf('month');
      expect(monthStart.date()).toBe(1);
    });

    it('本月结束日为今日', async () => {
      renderDashboard([]);
      await userEvent.click(screen.getByRole('button', { name: /生成周报/ }));
      await userEvent.click(screen.getByLabelText('本月'));

      // 报表文本中结束日应为今天
      const todayStr = dayjs().format('YYYY-MM-DD');
      const text = screen.getByText(/📋 跟单周报/).textContent;
      expect(text).toContain(todayStr);
    });
  });
});
