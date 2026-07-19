/**
 * @file 分享链接工具函数
 * 提供 token 生成、URL 构造、剪贴板复制等能力
 */

import { generateId } from './storage';

/**
 * 生成 10 位随机字母数字分享令牌
 * 基于现有 generateId() 截取前 10 位
 * @returns {string}
 */
export function generateShareToken() {
  return generateId().slice(0, 10);
}

/**
 * 根据 token 构造完整分享 URL
 * @param {string} token - 分享令牌
 * @returns {string} 完整 URL，如 https://example.com/order-tracking/#/share/abc123def
 */
export function buildShareUrl(token) {
  // pathname 在 jsdom 测试环境中可能为 undefined，需容错
  const { origin = '', pathname = '/' } = (typeof window !== 'undefined' && window.location) || {};
  // 兼容 GitHub Pages 子路径部署（如 /order-tracking/）与本地根路径
  // HashRouter 下分享链接必须带 #，否则刷新会 404
  const base = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return `${origin}${base}#/share/${token}`;
}

/**
 * 复制文本到系统剪贴板
 * 优先使用 navigator.clipboard API（需 HTTPS/localhost），
 * 失败时 fallback 到传统 execCommand('copy') 方案
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 复制是否成功
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback: 创建临时不可见 textarea + execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch {
      return false;
    }
  }
}
