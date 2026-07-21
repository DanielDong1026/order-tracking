/**
 * @file localStorage 读写封装
 * 提供安全的 JSON 序列化/反序列化，处理异常场景
 */

import { MAX_ATTACHMENT_SIZE } from '../data/constants';

const STORAGE_KEY = 'order_tracking_orders';
const CUSTOMERS_STORAGE_KEY = 'order_tracking_customers';
const FACTORIES_STORAGE_KEY = 'order_tracking_factories';

/**
 * 从 localStorage 读取订单数据
 * @returns {Array} 订单列表，解析失败返回空数组
 */
export function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('读取订单数据失败:', err);
    return [];
  }
}

/**
 * 将订单数据写入 localStorage
 * @param {Array} orders - 订单列表
 */
export function saveOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('保存订单数据失败:', err);
    throw new Error('保存失败，可能存储空间不足');
  }
}

/**
 * 从 localStorage 读取客户数据
 * @returns {Array} 客户列表，解析失败返回空数组
 */
export function loadCustomers() {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('读取客户数据失败:', err);
    return [];
  }
}

/**
 * 将客户数据写入 localStorage
 * @param {Array} customers - 客户列表
 */
export function saveCustomers(customers) {
  try {
    localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
  } catch (err) {
    console.error('保存客户数据失败:', err);
    throw new Error('保存失败，可能存储空间不足');
  }
}

/**
 * 从 localStorage 读取工厂数据
 * @returns {Array} 工厂列表，解析失败返回空数组
 */
export function loadFactories() {
  try {
    const raw = localStorage.getItem(FACTORIES_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('读取工厂数据失败:', err);
    return [];
  }
}

/**
 * 将工厂数据写入 localStorage
 * @param {Array} factories - 工厂列表
 */
export function saveFactories(factories) {
  try {
    localStorage.setItem(FACTORIES_STORAGE_KEY, JSON.stringify(factories));
  } catch (err) {
    console.error('保存工厂数据失败:', err);
    throw new Error('保存失败，可能存储空间不足');
  }
}

/**
 * 将文件转为 Base64 字符串
 * @param {File} file - 文件对象
 * @returns {Promise<string>} Base64 编码字符串
 * @throws {Error} 文件 > 5MB 时抛出异常
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const maxSize = MAX_ATTACHMENT_SIZE;
    if (file.size > maxSize) {
      reject(new Error('文件大小不能超过 5MB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 生成唯一 ID（时间戳 + 随机字符串）
 * @returns {string}
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}
