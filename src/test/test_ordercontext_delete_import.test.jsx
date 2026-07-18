/**
 * OrderContext 删除 & 导入功能测试
 *
 * 覆盖：
 * - DELETE_ORDER reducer：精确删除，不影响其他订单
 * - IMPORT_ORDERS reducer：覆盖模式 vs 合并模式（按 PO 号去重）
 * - deleteOrder / importOrders 在 Provider value 中正确导出
 */

import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { OrderProvider, useOrders } from '../context/OrderContext';

// ============================================================
// 辅助工具
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

/** 预设 localStorage 订单后渲染 Consumer，暴露 context 方法供测试调用 */
function renderWithProvider(presetOrders) {
  if (presetOrders !== undefined) {
    localStorage.setItem('order_tracking_orders', JSON.stringify(presetOrders));
  }

  // 用 ref 保存 context 引用，在 Consumer 中赋值
  const ctxRef = { current: null };

  function Consumer() {
    ctxRef.current = useOrders();
    return <div data-testid="consumer" />;
  }

  const result = render(
    <MemoryRouter>
      <OrderProvider>
        <Consumer />
      </OrderProvider>
    </MemoryRouter>
  );

  return { ...result, ctxRef };
}

// ============================================================
// 测试套件
// ============================================================

describe('OrderContext — DELETE_ORDER', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('DELETE_ORDER reducer 行为', () => {
    it('删除指定 ID 的订单后，该订单不再存在于 orders 中', () => {
      const orders = [
        makeOrder({ id: 'target-1', poNumber: 'PO-DEL-1' }),
        makeOrder({ id: 'keep-1', poNumber: 'PO-KEEP-1' }),
        makeOrder({ id: 'keep-2', poNumber: 'PO-KEEP-2' }),
      ];

      const { ctxRef } = renderWithProvider(orders);

      act(() => {
        ctxRef.current.deleteOrder('target-1');
      });

      const { orders: currentOrders } = ctxRef.current;
      expect(currentOrders.find((o) => o.id === 'target-1')).toBeUndefined();
    });

    it('删除一个订单不影响其余订单', () => {
      const orders = [
        makeOrder({ id: 'target-1', poNumber: 'PO-DEL-1' }),
        makeOrder({ id: 'keep-1', poNumber: 'PO-KEEP-1' }),
        makeOrder({ id: 'keep-2', poNumber: 'PO-KEEP-2' }),
      ];

      const { ctxRef } = renderWithProvider(orders);

      act(() => {
        ctxRef.current.deleteOrder('target-1');
      });

      const { orders: currentOrders } = ctxRef.current;
      expect(currentOrders).toHaveLength(2);
      expect(currentOrders.find((o) => o.id === 'keep-1')).toBeDefined();
      expect(currentOrders.find((o) => o.id === 'keep-2')).toBeDefined();
    });

    it('删除不存在的 ID 不抛异常，订单列表不变', () => {
      const orders = [
        makeOrder({ id: 'keep-1', poNumber: 'PO-KEEP-1' }),
        makeOrder({ id: 'keep-2', poNumber: 'PO-KEEP-2' }),
      ];

      const { ctxRef } = renderWithProvider(orders);

      act(() => {
        ctxRef.current.deleteOrder('non-existent-id');
      });

      const { orders: currentOrders } = ctxRef.current;
      expect(currentOrders).toHaveLength(2);
    });

    it('连续删除多条订单后数组为空', () => {
      const orders = [
        makeOrder({ id: 'a', poNumber: 'PO-A' }),
        makeOrder({ id: 'b', poNumber: 'PO-B' }),
      ];

      const { ctxRef } = renderWithProvider(orders);

      act(() => {
        ctxRef.current.deleteOrder('a');
      });
      act(() => {
        ctxRef.current.deleteOrder('b');
      });

      expect(ctxRef.current.orders).toHaveLength(0);
    });

    it('删除后 localStorage 已同步更新', () => {
      const orders = [
        makeOrder({ id: 'target-1', poNumber: 'PO-DEL-1' }),
        makeOrder({ id: 'keep-1', poNumber: 'PO-KEEP-1' }),
      ];

      const { ctxRef } = renderWithProvider(orders);

      act(() => {
        ctxRef.current.deleteOrder('target-1');
      });

      const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('keep-1');
    });
  });
});

describe('OrderContext — IMPORT_ORDERS', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('覆盖模式 (overwrite)', () => {
    it('覆盖模式用导入数据完全替换现有订单', () => {
      const existing = [
        makeOrder({ id: 'old-1', poNumber: 'PO-OLD-1' }),
        makeOrder({ id: 'old-2', poNumber: 'PO-OLD-2' }),
      ];

      const imported = [
        makeOrder({ id: 'new-1', poNumber: 'PO-NEW-1' }),
        makeOrder({ id: 'new-2', poNumber: 'PO-NEW-2' }),
        makeOrder({ id: 'new-3', poNumber: 'PO-NEW-3' }),
      ];

      const { ctxRef } = renderWithProvider(existing);

      let result;
      act(() => {
        result = ctxRef.current.importOrders(imported, 'overwrite');
      });

      expect(ctxRef.current.orders).toHaveLength(3);
      expect(ctxRef.current.orders.map((o) => o.id)).toEqual(['new-1', 'new-2', 'new-3']);
      expect(result).toEqual({ added: 3, skipped: 0 });
    });

    it('覆盖模式清空全部现有数据再写入', () => {
      const existing = [
        makeOrder({ id: 'old-1', poNumber: 'PO-OLD-1' }),
      ];

      const { ctxRef } = renderWithProvider(existing);

      act(() => {
        ctxRef.current.importOrders([], 'overwrite');
      });

      expect(ctxRef.current.orders).toHaveLength(0);
    });

    it('覆盖后 localStorage 同步为新数据', () => {
      const existing = [makeOrder({ id: 'old-1', poNumber: 'PO-OLD-1' })];
      const imported = [makeOrder({ id: 'new-1', poNumber: 'PO-NEW-1' })];

      const { ctxRef } = renderWithProvider(existing);

      act(() => {
        ctxRef.current.importOrders(imported, 'overwrite');
      });

      const stored = JSON.parse(localStorage.getItem('order_tracking_orders'));
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('new-1');
    });
  });

  describe('合并模式 (merge)', () => {
    it('合并模式追加不重复 PO 号的订单', () => {
      const existing = [
        makeOrder({ id: 'old-1', poNumber: 'PO-KEEP-1' }),
        makeOrder({ id: 'old-2', poNumber: 'PO-KEEP-2' }),
      ];

      const imported = [
        makeOrder({ id: 'new-1', poNumber: 'PO-NEW-1' }),
      ];

      const { ctxRef } = renderWithProvider(existing);

      let result;
      act(() => {
        result = ctxRef.current.importOrders(imported, 'merge');
      });

      expect(ctxRef.current.orders).toHaveLength(3);
      expect(ctxRef.current.orders.find((o) => o.id === 'old-1')).toBeDefined();
      expect(ctxRef.current.orders.find((o) => o.id === 'old-2')).toBeDefined();
      expect(ctxRef.current.orders.find((o) => o.id === 'new-1')).toBeDefined();
      expect(result).toEqual({ added: 1, skipped: 0 });
    });

    it('合并模式按 PO 号去重，已存在的 PO 号跳过', () => {
      const existing = [
        makeOrder({ id: 'old-1', poNumber: 'PO-DUP' }),
      ];

      const imported = [
        makeOrder({ id: 'new-1', poNumber: 'PO-DUP' }),
        makeOrder({ id: 'new-2', poNumber: 'PO-NEW-2' }),
      ];

      const { ctxRef } = renderWithProvider(existing);

      let result;
      act(() => {
        result = ctxRef.current.importOrders(imported, 'merge');
      });

      // 只应新增 1 条，PO-DUP 被跳过
      expect(ctxRef.current.orders).toHaveLength(2);
      // 原始 old-1 应保留（不被新版本覆盖）
      expect(ctxRef.current.orders.find((o) => o.id === 'old-1')).toBeDefined();
      expect(ctxRef.current.orders.find((o) => o.id === 'new-2')).toBeDefined();
      expect(result).toEqual({ added: 1, skipped: 1 });
    });

    it('合并模式：所有 PO 号都重复时，全部跳过', () => {
      const existing = [
        makeOrder({ id: 'old-1', poNumber: 'PO-DUP-1' }),
        makeOrder({ id: 'old-2', poNumber: 'PO-DUP-2' }),
      ];

      const imported = [
        makeOrder({ id: 'new-1', poNumber: 'PO-DUP-1' }),
        makeOrder({ id: 'new-2', poNumber: 'PO-DUP-2' }),
      ];

      const { ctxRef } = renderWithProvider(existing);

      let result;
      act(() => {
        result = ctxRef.current.importOrders(imported, 'merge');
      });

      expect(ctxRef.current.orders).toHaveLength(2);
      expect(result).toEqual({ added: 0, skipped: 2 });
    });

    it('合并模式：存在多条同 PO 号待导入时，全部跳过并不重复插入', () => {
      const existing = [
        makeOrder({ id: 'old-1', poNumber: 'PO-DUP' }),
      ];

      const imported = [
        makeOrder({ id: 'new-1', poNumber: 'PO-DUP' }),
        makeOrder({ id: 'new-2', poNumber: 'PO-DUP' }),
        makeOrder({ id: 'new-3', poNumber: 'PO-NEW' }),
      ];

      const { ctxRef } = renderWithProvider(existing);

      let result;
      act(() => {
        result = ctxRef.current.importOrders(imported, 'merge');
      });

      // PO-DUP 的两条都跳过，PO-NEW 新增
      expect(ctxRef.current.orders).toHaveLength(2);
      expect(result).toEqual({ added: 1, skipped: 2 });
    });
  });

  describe('importOrders 参数校验', () => {
    it('传入非数组时抛出异常', () => {
      const existing = [makeOrder({ id: 'old-1', poNumber: 'PO-1' })];
      const { ctxRef } = renderWithProvider(existing);

      expect(() => {
        ctxRef.current.importOrders('not-an-array', 'merge');
      }).toThrow('导入数据格式错误：orders 必须是数组');
    });

    it('传入 null 时抛出异常', () => {
      const existing = [makeOrder({ id: 'old-1', poNumber: 'PO-1' })];
      const { ctxRef } = renderWithProvider(existing);

      expect(() => {
        ctxRef.current.importOrders(null, 'merge');
      }).toThrow('导入数据格式错误：orders 必须是数组');
    });
  });

  describe('deleteOrder / importOrders 在 Provider value 中', () => {
    it('deleteOrder 是 function 类型', () => {
      const { ctxRef } = renderWithProvider([]);
      expect(typeof ctxRef.current.deleteOrder).toBe('function');
    });

    it('importOrders 是 function 类型', () => {
      const { ctxRef } = renderWithProvider([]);
      expect(typeof ctxRef.current.importOrders).toBe('function');
    });
  });
});

describe('OrderContext — 删除后其他功能不受影响', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('删除一条后，getOrderById 能正确找到其余订单', () => {
    const orders = [
      makeOrder({ id: 'target-1', poNumber: 'PO-DEL-1' }),
      makeOrder({ id: 'keep-1', poNumber: 'PO-KEEP-1' }),
    ];

    const { ctxRef } = renderWithProvider(orders);

    act(() => {
      ctxRef.current.deleteOrder('target-1');
    });

    const found = ctxRef.current.getOrderById('keep-1');
    expect(found).toBeDefined();
    expect(found.poNumber).toBe('PO-KEEP-1');

    const notFound = ctxRef.current.getOrderById('target-1');
    expect(notFound).toBeNull();
  });

  it('导入后 CRUD 操作正常（addOrder 追加）', () => {
    const existing = [makeOrder({ id: 'old-1', poNumber: 'PO-OLD-1' })];
    const imported = [makeOrder({ id: 'new-1', poNumber: 'PO-NEW-1' })];

    const { ctxRef } = renderWithProvider(existing);

    act(() => {
      ctxRef.current.importOrders(imported, 'merge');
    });

    // 导入后手动新增一条
    act(() => {
      ctxRef.current.addOrder({
        customerName: 'Manual',
        poNumber: 'PO-MANUAL',
        productSummary: 'Test',
        quantity: '100',
        amount: '$500',
        tradeTerm: 'FOB',
      });
    });

    const { orders } = ctxRef.current;
    expect(orders).toHaveLength(3);
    expect(orders.some((o) => o.poNumber === 'PO-MANUAL')).toBe(true);
  });
});
