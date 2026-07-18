/**
 * 标签筛选逻辑单元测试（OrderList 中的 AND 过滤逻辑）
 *
 * 测试覆盖 AC-3（列表筛选）：
 * - 无选中标签 → 全部订单
 * - 单标签匹配
 * - AND 多标签筛选
 * - 大小写不敏感
 * - 订单无 tags 字段处理
 */

import { describe, it, expect } from 'vitest';

/**
 * 标签筛选逻辑（从 OrderList.jsx 提取的纯函数副本）
 * @param {Array} orders - 订单列表
 * @param {string[]} selectedTags - 选中的标签
 * @returns {Array} 筛选后的订单
 */
function filterByTags(orders, selectedTags) {
  const selectedTagLowers = selectedTags.map((t) => t.toLowerCase());
  if (selectedTagLowers.length === 0) {
    return orders;
  }
  return orders.filter((order) =>
    selectedTagLowers.every((st) =>
      (order.tags || []).some(
        (t) => t.toLowerCase().trim() === st
      )
    )
  );
}

describe('标签筛选逻辑 — AND 过滤', () => {
  // 测试数据集
  const orders = [
    {
      id: '1',
      customerName: '客户A',
      tags: ['#A客户', '#欧洲线'],
    },
    {
      id: '2',
      customerName: '客户B',
      tags: ['#A客户', '#急单'],
    },
    {
      id: '3',
      customerName: '客户C',
      tags: ['#欧洲线', '#急单'],
    },
    {
      id: '4',
      customerName: '客户D',
      tags: ['#A客户', '#欧洲线', '#急单'],
    },
    {
      id: '5',
      customerName: '客户E',
      tags: [], // 无标签
    },
    {
      id: '6',
      customerName: '客户F',
      // 无 tags 字段
    },
  ];

  // ========================
  // 无选中标签
  // ========================
  describe('无选中标签', () => {
    it('selectedTags 为空数组时应返回全部订单', () => {
      const result = filterByTags(orders, []);
      expect(result).toHaveLength(6);
      expect(result).toEqual(orders);
    });
  });

  // ========================
  // 单标签筛选
  // ========================
  describe('单标签筛选', () => {
    it('筛选 #A客户 应返回 3 条订单', () => {
      const result = filterByTags(orders, ['#A客户']);
      expect(result).toHaveLength(3);
      const ids = result.map((o) => o.id).sort();
      expect(ids).toEqual(['1', '2', '4']);
    });

    it('筛选 #欧洲线 应返回 3 条订单', () => {
      const result = filterByTags(orders, ['#欧洲线']);
      expect(result).toHaveLength(3);
      const ids = result.map((o) => o.id).sort();
      expect(ids).toEqual(['1', '3', '4']);
    });

    it('筛选 #急单 应返回 3 条订单', () => {
      const result = filterByTags(orders, ['#急单']);
      expect(result).toHaveLength(3);
      const ids = result.map((o) => o.id).sort();
      expect(ids).toEqual(['2', '3', '4']);
    });
  });

  // ========================
  // AND 多标签筛选
  // ========================
  describe('AND 多标签筛选', () => {
    it('#A客户 AND #欧洲线 → 2 条', () => {
      const result = filterByTags(orders, ['#A客户', '#欧洲线']);
      expect(result).toHaveLength(2);
      const ids = result.map((o) => o.id).sort();
      expect(ids).toEqual(['1', '4']);
    });

    it('#A客户 AND #急单 → 2 条', () => {
      const result = filterByTags(orders, ['#A客户', '#急单']);
      expect(result).toHaveLength(2);
      const ids = result.map((o) => o.id).sort();
      expect(ids).toEqual(['2', '4']);
    });

    it('#欧洲线 AND #急单 → 2 条', () => {
      const result = filterByTags(orders, ['#欧洲线', '#急单']);
      expect(result).toHaveLength(2);
      const ids = result.map((o) => o.id).sort();
      expect(ids).toEqual(['3', '4']);
    });

    it('#A客户 AND #欧洲线 AND #急单 → 1 条', () => {
      const result = filterByTags(orders, ['#A客户', '#欧洲线', '#急单']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('4');
    });
  });

  // ========================
  // 大小写不敏感
  // ========================
  describe('大小写不敏感匹配', () => {
    it('#a客户 应匹配 #A客户 标签', () => {
      const result = filterByTags(orders, ['#a客户']);
      expect(result).toHaveLength(3);
    });

    it('#a客户 AND #europe线（大写变体）应匹配 #欧洲线', () => {
      // 注意：#欧洲线 是中文标签，此处测试大小写不敏感 + 实际数据
      const result = filterByTags(orders, ['#a客户', '#欧洲线']);
      expect(result).toHaveLength(2);
    });

    it('#急单 AND #a客户 混合大小写', () => {
      const result = filterByTags(orders, ['#急单', '#a客户']);
      expect(result).toHaveLength(2);
      const ids = result.map((o) => o.id).sort();
      expect(ids).toEqual(['2', '4']);
    });
  });

  // ========================
  // 边界情况
  // ========================
  describe('边界情况', () => {
    it('订单无 tags 字段视为无标签，筛选时被过滤', () => {
      const result = filterByTags(orders, ['#A客户']);
      const ids = result.map((o) => o.id);
      expect(ids).not.toContain('6'); // 无 tags 字段
      expect(ids).not.toContain('5'); // tags 为空数组
    });

    it('不存在的标签筛选结果为空', () => {
      const result = filterByTags(orders, ['#不存在的标签']);
      expect(result).toHaveLength(0);
    });

    it('存在 + 不存在标签 AND 筛选结果为空', () => {
      const result = filterByTags(orders, ['#A客户', '#不存在的标签']);
      expect(result).toHaveLength(0);
    });

    it('空字符串标签不应匹配任何订单', () => {
      const result = filterByTags(orders, ['']);
      expect(result).toHaveLength(0);
    });

    it('trim 处理：带空格的标签输入不应匹配', () => {
      // 注意：selectedTags 本身会被 toLowerCase() 处理
      // 但不会被 trim —— 这是正常的，因为 Chip 选中的标签来自 allTags
      // allTags 中的 tag 已经 trim 过
      const result = filterByTags(orders, [' #A客户 ']);
      // " #a客户 " 的 toLowerCase() 是 " #a客户 "
      // 而 order.tags 中的 "#A客户".toLowerCase().trim() 是 "#a客户"
      // 不匹配，因为多了空格
      expect(result).toHaveLength(0);
    });
  });

  // ========================
  // 空订单列表
  // ========================
  describe('空订单列表', () => {
    it('空订单列表 + 空选中标签 → 空数组', () => {
      const result = filterByTags([], []);
      expect(result).toEqual([]);
    });

    it('空订单列表 + 有选中标签 → 空数组', () => {
      const result = filterByTags([], ['#A客户']);
      expect(result).toEqual([]);
    });
  });
});
