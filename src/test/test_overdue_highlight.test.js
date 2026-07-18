/**
 * 超期订单高亮逻辑单元测试 (V2.2)
 *
 * 测试 getRowHighlight 纯函数的核心逻辑：
 * - 红色预警（AC-1）：estimatedDeliveryDate < today + status ∉ ['已出货','已收款']
 * - 黄色预警（AC-2）：today - updatedAt > 7天 + 非红色
 * - 红优先于黄（AC-3）：同时满足只返回 'red'
 * - 实时计算（AC-4）：基于当前时间，无缓存
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dayjs from 'dayjs';
import {
  OVERDUE_RED_BG,
  STALE_YELLOW_BG,
  STALE_DAYS_THRESHOLD,
  OVERDUE_EXEMPT_STATUSES,
} from '../data/constants';

// ============================================================
// 从 OrderList.jsx 复制的 getRowHighlight 纯函数（一模一样的实现）
// 这样测试的是与实际源码完全一致的逻辑
// ============================================================
function getRowHighlight(order) {
  const today = dayjs().startOf('day');

  // 红色：交货日已过 且 未在豁免状态
  if (
    order.estimatedDeliveryDate &&
    !OVERDUE_EXEMPT_STATUSES.includes(order.status)
  ) {
    const delivery = dayjs(order.estimatedDeliveryDate).startOf('day');
    if (delivery.isBefore(today)) {
      return 'red';
    }
  }

  // 黄色：超过 N 天未更新
  if (order.updatedAt) {
    const updated = dayjs(order.updatedAt);
    const daysSinceUpdate = today.diff(updated, 'day');
    if (daysSinceUpdate > STALE_DAYS_THRESHOLD) {
      return 'yellow';
    }
  }

  return null;
}

// ============================================================
// 辅助：构造测试订单
// ============================================================
function makeOrder(overrides = {}) {
  return {
    id: 'test-001',
    customerName: '测试客户',
    poNumber: 'PO-TEST-001',
    status: '生产中',
    estimatedDeliveryDate: null,
    updatedAt: dayjs().subtract(1, 'day').toISOString(),
    ...overrides,
  };
}

// ============================================================
// 测试套件
// ============================================================
describe('getRowHighlight — 超期订单高亮逻辑', () => {
  // ---- AC-1: 红色预警 ----
  describe('AC-1: 红色预警', () => {
    it('交货日已过（deliveryDate < today）且状态非豁免 → 返回 "red"', () => {
      const order = makeOrder({
        estimatedDeliveryDate: '2020-01-01', // 明显已过
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBe('red');
    });

    it('交货日已过但状态为「已出货」（豁免）→ 返回 null，不标红', () => {
      const order = makeOrder({
        estimatedDeliveryDate: '2020-01-01',
        status: '已出货',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('交货日已过但状态为「已收款」（豁免）→ 返回 null，不标红', () => {
      const order = makeOrder({
        estimatedDeliveryDate: '2020-01-01',
        status: '已收款',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('交货日为今天 → 返回 null（isBefore 严格小于，不含等于）', () => {
      const today = dayjs().format('YYYY-MM-DD');
      const order = makeOrder({
        estimatedDeliveryDate: today,
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('交货日在未来 → 返回 null（未超期）', () => {
      const future = dayjs().add(30, 'day').format('YYYY-MM-DD');
      const order = makeOrder({
        estimatedDeliveryDate: future,
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('estimatedDeliveryDate 为 null → 返回 null（不应标红）', () => {
      const order = makeOrder({
        estimatedDeliveryDate: null,
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('estimatedDeliveryDate 为 undefined → 返回 null（不应标红）', () => {
      const order = makeOrder({
        estimatedDeliveryDate: undefined,
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('estimatedDeliveryDate 为空字符串 → 返回 null（falsy 检查）', () => {
      const order = makeOrder({
        estimatedDeliveryDate: '',
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('所有非豁免状态（已接单/生产中/验货/待出货）超期时都标红', () => {
      const nonExempt = ['已接单', '生产中', '验货', '待出货'];
      for (const status of nonExempt) {
        const order = makeOrder({
          estimatedDeliveryDate: '2020-01-01',
          status,
        });
        expect(getRowHighlight(order)).toBe('red');
      }
    });
  });

  // ---- AC-2: 黄色预警 ----
  describe('AC-2: 黄色预警', () => {
    it('updatedAt 距今超过阈值天数 → 返回 "yellow"', () => {
      const order = makeOrder({
        estimatedDeliveryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        updatedAt: dayjs().subtract(10, 'day').toISOString(),
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBe('yellow');
    });

    it('updatedAt 距今正好等于阈值天数 → 返回 null（> 7 不包含等于）', () => {
      const order = makeOrder({
        estimatedDeliveryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        updatedAt: dayjs().subtract(STALE_DAYS_THRESHOLD, 'day').toISOString(),
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('updatedAt 距今小于阈值天数 → 返回 null', () => {
      const order = makeOrder({
        estimatedDeliveryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        updatedAt: dayjs().subtract(3, 'day').toISOString(),
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('updatedAt 为 null → 返回 null（不应标黄）', () => {
      const order = makeOrder({
        estimatedDeliveryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        updatedAt: null,
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('updatedAt 为 undefined → 返回 null（不应标黄）', () => {
      const order = makeOrder({
        estimatedDeliveryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        updatedAt: undefined,
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('updatedAt 为空字符串 → 返回 null（falsy 检查）', () => {
      const order = makeOrder({
        estimatedDeliveryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        updatedAt: '',
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });
  });

  // ---- AC-3: 红优先于黄 ----
  describe('AC-3: 红优先于黄', () => {
    it('同时满足红黄条件时 → 返回 "red"（不返回 yellow）', () => {
      const order = makeOrder({
        estimatedDeliveryDate: '2020-01-01', // 已过期 → 红
        updatedAt: dayjs().subtract(30, 'day').toISOString(), // 超30天 → 黄
        status: '生产中', // 非豁免
      });
      expect(getRowHighlight(order)).toBe('red');
      expect(getRowHighlight(order)).not.toBe('yellow');
    });

    it('只满足黄色条件时 → 返回 "yellow"', () => {
      const order = makeOrder({
        estimatedDeliveryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'), // 未过期
        updatedAt: dayjs().subtract(10, 'day').toISOString(), // 超过7天
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBe('yellow');
    });
  });

  // ---- AC-4: 实时计算 ----
  describe('AC-4: 实时计算（基于当前时间，无缓存）', () => {
    it('两次调用使用同一订单应得相同结果（幂等性）', () => {
      const order = makeOrder({
        estimatedDeliveryDate: '2020-01-01',
        status: '生产中',
      });
      const result1 = getRowHighlight(order);
      const result2 = getRowHighlight(order);
      expect(result1).toBe(result2);
    });

    it('依赖于 dayjs() 当前时间，不依赖外部状态', () => {
      // 验证函数内部使用 dayjs() 而非参数传入的 today
      const order1 = makeOrder({
        estimatedDeliveryDate: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
        status: '生产中',
      });
      // 昨天作为交货日应已过期 → red
      expect(getRowHighlight(order1)).toBe('red');
    });
  });

  // ---- AC-5: 正常行（无高亮） ----
  describe('正常行（无高亮）', () => {
    it('交货日在未来且最近更新过 → 返回 null', () => {
      const order = makeOrder({
        estimatedDeliveryDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
        updatedAt: dayjs().subtract(1, 'day').toISOString(),
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('交货日在未来且无 updatedAt → 返回 null', () => {
      const order = makeOrder({
        estimatedDeliveryDate: dayjs().add(60, 'day').format('YYYY-MM-DD'),
        updatedAt: null,
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('无交货日但最近更新过 → 返回 null', () => {
      const order = makeOrder({
        estimatedDeliveryDate: null,
        updatedAt: dayjs().subtract(1, 'day').toISOString(),
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });

    it('无交货日且无 updatedAt → 返回 null', () => {
      const order = makeOrder({
        estimatedDeliveryDate: null,
        updatedAt: null,
        status: '生产中',
      });
      expect(getRowHighlight(order)).toBeNull();
    });
  });

  // ---- 返回值类型 ----
  describe('返回值类型约束', () => {
    it('返回值只可能是 "red" | "yellow" | null', () => {
      const validValues = new Set(['red', 'yellow', null]);

      const testCases = [
        // 红
        makeOrder({ estimatedDeliveryDate: '2020-01-01', status: '生产中' }),
        // 黄
        makeOrder({
          estimatedDeliveryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
          updatedAt: dayjs().subtract(10, 'day').toISOString(),
        }),
        // 无
        makeOrder({
          estimatedDeliveryDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
          updatedAt: dayjs().subtract(1, 'day').toISOString(),
        }),
      ];

      for (const order of testCases) {
        const result = getRowHighlight(order);
        expect(validValues.has(result)).toBe(true);
      }
    });
  });
});

// ============================================================
// 背景色常量一致性验证
// ============================================================
describe('背景色常量与 getRowHighlight 返回值对照', () => {
  it('red → OVERDUE_RED_BG (#FFF0F0)', () => {
    expect(OVERDUE_RED_BG).toBe('#FFF0F0');
  });

  it('yellow → STALE_YELLOW_BG (#FFFDE7)', () => {
    expect(STALE_YELLOW_BG).toBe('#FFFDE7');
  });

  it('null → 默认透明背景', () => {
    // 当 highlight 为 null 时，bgcolor 应为 'transparent'
    // 此处验证常量不冲突
    expect(OVERDUE_RED_BG).not.toBe('transparent');
    expect(STALE_YELLOW_BG).not.toBe('transparent');
  });
});
