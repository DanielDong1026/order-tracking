import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { loadOrders, saveOrders, generateId } from '../utils/storage';
import { STATUS_NODES } from '../data/constants';
import { generateShareToken as createToken, buildShareUrl } from '../utils/share';

const OrderContext = createContext(null);

/**
 * Reducer action types
 * @typedef {'LOAD_ORDERS'|'ADD_ORDER'|'UPDATE_ORDER'|'ADVANCE_STATUS'|'ADD_ATTACHMENTS'|'DELETE_ORDER'|'IMPORT_ORDERS'} ActionType
 */

/**
 * 订单状态管理 reducer
 * @param {Object} state - 当前状态
 * @param {{ type: ActionType, payload: any }} action
 * @returns {Object} 新状态
 */
function orderReducer(state, action) {
  switch (action.type) {
    case 'LOAD_ORDERS':
      return { ...state, orders: action.payload, loaded: true };

    case 'ADD_ORDER': {
      const now = new Date().toISOString();
      const newOrder = {
        ...action.payload,
        id: generateId(),
        status: '已接单',
        timeline: [
          { node: '已接单', date: now, note: '', attachments: [] },
        ],
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, orders: [newOrder, ...state.orders] };
    }

    case 'UPDATE_ORDER': {
      const now = new Date().toISOString();
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === action.payload.id
            ? { ...o, ...action.payload.data, updatedAt: now }
            : o
        ),
      };
    }

    case 'ADVANCE_STATUS': {
      const { orderId, newStatus, date, note, attachment } = action.payload;
      const now = new Date().toISOString();
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (o.id !== orderId) return o;
          // 检查该状态是否已在时间线中（避免重复推进到同一状态）
          const alreadyHave = o.timeline.some((t) => t.node === newStatus);
          return {
            ...o,
            status: newStatus,
            timeline: alreadyHave
              ? o.timeline
              : [
                  ...o.timeline,
                  {
                    node: newStatus,
                    date: date || now,
                    note: note || '',
                    attachments: attachment
                      ? [{ id: generateId(), name: '附件', data: attachment, type: 'application/octet-stream' }]
                      : [],
                  },
                ],
            updatedAt: now,
          };
        }),
      };
    }

    case 'ADD_ATTACHMENTS': {
      const { orderId, nodeName, newAttachments } = action.payload;
      return {
        ...state,
        orders: state.orders.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            timeline: o.timeline.map((t) => {
              if (t.node !== nodeName) return t;
              const existing = t.attachments || [];
              return {
                ...t,
                attachments: [...existing, ...newAttachments],
                attachment: undefined,
              };
            }),
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }

    case 'DELETE_ORDER': {
      return {
        ...state,
        orders: state.orders.filter((o) => o.id !== action.payload),
      };
    }

    case 'IMPORT_ORDERS': {
      const { orders: importedOrders, mode } = action.payload;
      if (mode === 'overwrite') {
        return { ...state, orders: importedOrders };
      }
      // 合并模式：按 PO 号去重，已存在的跳过
      const existingPoNumbers = new Set(state.orders.map((o) => o.poNumber));
      const uniqueNewOrders = importedOrders.filter(
        (o) => !existingPoNumbers.has(o.poNumber)
      );
      return { ...state, orders: [...state.orders, ...uniqueNewOrders] };
    }

    case 'GENERATE_SHARE_TOKEN': {
      const { orderId, token } = action.payload;
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { ...o, shareToken: token, updatedAt: new Date().toISOString() }
            : o
        ),
      };
    }

    case 'REGENERATE_SHARE_TOKEN': {
      const { orderId, token } = action.payload;
      return {
        ...state,
        orders: state.orders.map((o) =>
          o.id === orderId
            ? { ...o, shareToken: token, updatedAt: new Date().toISOString() }
            : o
        ),
      };
    }

    default:
      return state;
  }
}

/**
 * 订单全局状态 Provider
 * 管理订单 CRUD + 状态推进，自动同步 localStorage
 */
export function OrderProvider({ children }) {
  const [state, dispatch] = useReducer(orderReducer, {
    orders: [],
    loaded: false,
  });

  // 首次加载从 localStorage 读取
  useEffect(() => {
    const orders = loadOrders();
    dispatch({ type: 'LOAD_ORDERS', payload: orders });
  }, []);

  // 每次订单变更后写回 localStorage（跳过首次加载）
  useEffect(() => {
    if (state.loaded) {
      saveOrders(state.orders);
    }
  }, [state.orders, state.loaded]);

  // 旧数据兼容迁移：attachment (string|null) → attachments[]
  useEffect(() => {
    if (!state.loaded) return;
    let needsMigration = false;
    const migrated = state.orders.map((order) => {
      let changed = false;
      const newTimeline = order.timeline.map((t) => {
        if (t.attachment && !t.attachments) {
          changed = true;
          needsMigration = true;
          return {
            ...t,
            attachments: [{ id: generateId(), name: '附件', data: t.attachment, type: 'application/octet-stream' }],
            attachment: undefined,
          };
        }
        return t;
      });
      return changed ? { ...order, timeline: newTimeline } : order;
    });
    if (needsMigration) {
      dispatch({ type: 'LOAD_ORDERS', payload: migrated });
    }
  }, [state.loaded]);

  /** 创建订单 */
  const addOrder = useCallback((formData) => {
    dispatch({ type: 'ADD_ORDER', payload: formData });
  }, []);

  /** 更新订单基本信息 */
  const updateOrder = useCallback((id, data) => {
    dispatch({ type: 'UPDATE_ORDER', payload: { id, data } });
  }, []);

  /** 推进订单状态 */
  const advanceStatus = useCallback((orderId, newStatus, date, note, attachment) => {
    dispatch({
      type: 'ADVANCE_STATUS',
      payload: { orderId, newStatus, date, note, attachment },
    });
  }, []);

  /** 给指定节点的附件列表追加新附件 */
  const addAttachments = useCallback((orderId, nodeName, newAttachments) => {
    dispatch({
      type: 'ADD_ATTACHMENTS',
      payload: { orderId, nodeName, newAttachments },
    });
  }, []);

  /** 删除订单 */
  const deleteOrder = useCallback((id) => {
    dispatch({ type: 'DELETE_ORDER', payload: id });
  }, []);

  /**
   * 导入订单数据
   * @param {Array} importedOrders - 要导入的订单数组
   * @param {'overwrite'|'merge'} mode - 覆盖导入或合并导入
   * @returns {{ added: number, skipped: number }} 导入结果统计
   */
  const importOrders = useCallback((importedOrders, mode) => {
    if (!Array.isArray(importedOrders)) {
      throw new Error('导入数据格式错误：orders 必须是数组');
    }
    let added = importedOrders.length;
    let skipped = 0;
    if (mode === 'merge') {
      const existingPoNumbers = new Set(state.orders.map((o) => o.poNumber));
      const uniqueOrders = importedOrders.filter((o) => {
        if (existingPoNumbers.has(o.poNumber)) {
          skipped++;
          return false;
        }
        return true;
      });
      dispatch({
        type: 'IMPORT_ORDERS',
        payload: { orders: uniqueOrders, mode: 'merge' },
      });
      added = uniqueOrders.length;
    } else {
      dispatch({
        type: 'IMPORT_ORDERS',
        payload: { orders: importedOrders, mode: 'overwrite' },
      });
    }
    return { added, skipped };
  }, [state.orders]);

  /** 根据 ID 获取订单 */
  const getOrderById = useCallback(
    (id) => state.orders.find((o) => o.id === id) || null,
    [state.orders]
  );

  /**
   * 获取当前状态之后的所有可选状态
   * @param {string} currentStatus
   * @returns {string[]}
   */
  const getNextStatuses = useCallback((currentStatus) => {
    const idx = STATUS_NODES.indexOf(currentStatus);
    if (idx === -1) return [];
    return STATUS_NODES.slice(idx + 1);
  }, []);

  /** 判断订单是否可以编辑（未到「已出货」） */
  const canEdit = useCallback((order) => {
    if (!order) return false;
    const editableStatuses = ['已接单', '生产中', '验货', '待出货'];
    return editableStatuses.includes(order.status);
  }, []);

  /** 为订单生成分享令牌（仅当未生成时） */
  const generateShareToken = useCallback((orderId) => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return null;
    // 已有 token 则直接返回当前链接
    if (order.shareToken) return buildShareUrl(order.shareToken);
    const token = createToken();
    dispatch({ type: 'GENERATE_SHARE_TOKEN', payload: { orderId, token } });
    return buildShareUrl(token);
  }, [state.orders]);

  /** 为订单重新生成分享令牌（覆盖旧值，仅当已存在时） */
  const regenerateShareToken = useCallback((orderId) => {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order || !order.shareToken) return null;
    const token = createToken();
    dispatch({ type: 'REGENERATE_SHARE_TOKEN', payload: { orderId, token } });
    return buildShareUrl(token);
  }, [state.orders]);

  /** 按 shareToken 查找订单 */
  const getOrderByShareToken = useCallback((shareToken) => {
    return state.orders.find((o) => o.shareToken === shareToken) || null;
  }, [state.orders]);

  const value = {
    orders: state.orders,
    loaded: state.loaded,
    addOrder,
    updateOrder,
    advanceStatus,
    addAttachments,
    deleteOrder,
    importOrders,
    getOrderById,
    getNextStatuses,
    canEdit,
    generateShareToken,
    regenerateShareToken,
    getOrderByShareToken,
  };

  return (
    <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
  );
}

/**
 * 获取订单上下文 hook
 * @returns {Object} 订单状态和操作方法
 */
export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) {
    throw new Error('useOrders 必须在 OrderProvider 内使用');
  }
  return ctx;
}
