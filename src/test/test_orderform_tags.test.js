/**
 * OrderForm 标签规范化逻辑测试
 *
 * 测试覆盖：
 * - AC-1：自由输入标签的规范化
 * - AC-4：输入时大小写归一到已有标签
 * - trim 处理
 * - 空值过滤
 */

import { describe, it, expect } from 'vitest';

/**
 * 标签规范化函数（从 OrderForm.jsx onChange 提取的纯函数版本）
 *
 * @param {string[]} newValue - Autocomplete 返回的新标签值数组
 * @param {{ tag: string, count: number }[]} allTags - 已有标签列表
 * @returns {string[]} 规范化后的标签数组
 */
function normalizeTags(newValue, allTags) {
  const tagList = allTags || [];
  return newValue
    .map((v) => {
      const trimmed = typeof v === 'string' ? v.trim() : (v?.tag || '').trim();
      if (!trimmed) return '';
      const existing = tagList.find(
        (at) => at.tag.toLowerCase() === trimmed.toLowerCase()
      );
      return existing ? existing.tag : trimmed;
    })
    .filter(Boolean);
}

describe('OrderForm — 标签规范化逻辑', () => {
  const allTags = [
    { tag: '#A客户', count: 3 },
    { tag: '#欧洲线', count: 2 },
    { tag: '#急单', count: 1 },
  ];

  describe('基本规范化', () => {
    it('新标签（不存在于已有标签中）应保留原始值', () => {
      const result = normalizeTags(['#新标签'], allTags);
      expect(result).toEqual(['#新标签']);
    });

    it('已有标签（完全相同）应保留原始写法', () => {
      const result = normalizeTags(['#A客户'], allTags);
      expect(result).toEqual(['#A客户']);
    });
  });

  describe('大小写归一到已有标签（AC-4）', () => {
    it('#a客户 应被规范化为 #A客户', () => {
      const result = normalizeTags(['#a客户'], allTags);
      expect(result).toEqual(['#A客户']);
    });

    it('#A客户（全大写）应保留（已有标签正是大写）', () => {
      const result = normalizeTags(['#A客户'], allTags);
      expect(result).toEqual(['#A客户']);
    });

    it('混合大小写 #a客户（全小写变体）应规范化为 #A客户', () => {
      const result = normalizeTags(['#a客户'], allTags);
      expect(result).toEqual(['#A客户']);
    });
  });

  describe('空白字符处理', () => {
    it('前后带空格的标签应被 trim', () => {
      const result = normalizeTags(['  #急单  '], allTags);
      expect(result).toEqual(['#急单']);
    });

    it('trim 后为空的标签应被过滤', () => {
      const result = normalizeTags(['   ', '#A客户'], allTags);
      expect(result).toEqual(['#A客户']);
    });

    it('纯空格标签应全部被过滤', () => {
      const result = normalizeTags(['   ', '\t', '\n'], allTags);
      expect(result).toEqual([]);
    });
  });

  describe('多标签处理', () => {
    it('混合新旧标签', () => {
      const result = normalizeTags(['#a客户', '#新标签', '#欧洲线'], allTags);
      expect(result).toEqual(['#A客户', '#新标签', '#欧洲线']);
    });

    it('全部为新标签', () => {
      const result = normalizeTags(['#标签1', '#标签2', '#标签3'], allTags);
      expect(result).toEqual(['#标签1', '#标签2', '#标签3']);
    });

    it('重复标签不去重（由 Autocomplete 处理）', () => {
      // Autocomplete multiple 模式应已去重，这里验证函数本身行为
      const result = normalizeTags(['#A客户', '#A客户'], allTags);
      expect(result).toEqual(['#A客户', '#A客户']);
    });
  });

  describe('空输入', () => {
    it('空数组 → 空数组', () => {
      const result = normalizeTags([], allTags);
      expect(result).toEqual([]);
    });

    it('undefined allTags → 每个标签保留原始值', () => {
      const result = normalizeTags(['#test'], undefined);
      expect(result).toEqual(['#test']);
    });

    it('null allTags → 每个标签保留原始值', () => {
      const result = normalizeTags(['#test'], null);
      expect(result).toEqual(['#test']);
    });

    it('空 allTags → 每个标签保留原始值', () => {
      const result = normalizeTags(['#test'], []);
      expect(result).toEqual(['#test']);
    });
  });

  describe('标签名中的特殊字符', () => {
    it('包含数字的标签', () => {
      const result = normalizeTags(['#V1'], []);
      expect(result).toEqual(['#V1']);
    });

    it('包含下划线的标签', () => {
      const result = normalizeTags(['#重要_客户'], []);
      expect(result).toEqual(['#重要_客户']);
    });

    it('纯中文标签（无 # 前缀）', () => {
      const result = normalizeTags(['急单'], []);
      expect(result).toEqual(['急单']);
    });

    it('英文标签大小写归一中处理中文标签', () => {
      const tags = [{ tag: 'HelloWorld', count: 1 }];
      const result = normalizeTags(['helloworld'], tags);
      expect(result).toEqual(['HelloWorld']);
    });
  });
});
