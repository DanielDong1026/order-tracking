/**
 * 从所有订单中聚合标签列表的 hook
 *
 * 用于标签输入建议（Autocomplete options）和列表标签筛选（Chip 行）。
 *
 * 规则：
 * - 大小写不敏感合并：`#A客户` 和 `#a客户` 视为同一标签
 * - 展示首次出现时的原始大小写
 * - 自动 trim 前后空格
 * - 按使用频次降序排列
 *
 * @param {Array<{ tags?: string[] }>} orders - 订单列表
 * @returns {{ tag: string, count: number }[]} 标签列表（按频次降序）
 */
export default function useAllTags(orders) {
  const tagMap = {};
  (orders || []).forEach((order) => {
    (order.tags || []).forEach((tag) => {
      const trimmed = tag.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!tagMap[key]) {
        tagMap[key] = { tag: trimmed, count: 0 };
      }
      tagMap[key].count++;
    });
  });
  return Object.values(tagMap).sort((a, b) => b.count - a.count);
}
