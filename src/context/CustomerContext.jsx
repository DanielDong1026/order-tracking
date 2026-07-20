/**
 * @file 客户数据全局状态
 * 管理客户的 CRUD，独立于订单（客户删除不影响历史订单）
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { loadCustomers, saveCustomers, generateId } from '../utils/storage';

const CustomerContext = createContext(null);

/**
 * Reducer action types
 * @typedef {'LOAD_CUSTOMERS'|'ADD_CUSTOMER'|'UPDATE_CUSTOMER'|'DELETE_CUSTOMER'} ActionType
 */

/**
 * 客户状态管理 reducer
 * @param {{ customers: Array, loaded: boolean }} state
 * @param {{ type: ActionType, payload: any }} action
 */
function customerReducer(state, action) {
  switch (action.type) {
    case 'LOAD_CUSTOMERS':
      return { ...state, customers: action.payload, loaded: true };

    case 'ADD_CUSTOMER':
      return { ...state, customers: [action.payload, ...state.customers] };

    case 'UPDATE_CUSTOMER': {
      const now = new Date().toISOString();
      return {
        ...state,
        customers: state.customers.map((c) =>
          c.id === action.payload.id
            ? { ...c, ...action.payload.data, updatedAt: now }
            : c
        ),
      };
    }

    case 'DELETE_CUSTOMER':
      return {
        ...state,
        customers: state.customers.filter((c) => c.id !== action.payload),
      };

    default:
      return state;
  }
}

/**
 * 客户全局状态 Provider
 * 自动从 localStorage 加载，自动同步写回
 */
export function CustomerProvider({ children }) {
  const [state, dispatch] = useReducer(customerReducer, {
    customers: [],
    loaded: false,
  });

  // 首次加载从 localStorage 读取
  useEffect(() => {
    const customers = loadCustomers();
    dispatch({ type: 'LOAD_CUSTOMERS', payload: customers });
  }, []);

  // 每次客户变更后写回 localStorage（跳过首次加载）
  useEffect(() => {
    if (state.loaded) {
      saveCustomers(state.customers);
    }
  }, [state.customers, state.loaded]);

  /** 创建客户 */
  const addCustomer = useCallback((formData) => {
    const now = new Date().toISOString();
    const newCustomer = {
      ...formData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
    return newCustomer;
  }, []);

  /** 更新客户 */
  const updateCustomer = useCallback((id, data) => {
    dispatch({ type: 'UPDATE_CUSTOMER', payload: { id, data } });
  }, []);

  /** 删除客户 */
  const deleteCustomer = useCallback((id) => {
    dispatch({ type: 'DELETE_CUSTOMER', payload: id });
  }, []);

  /** 根据 ID 获取客户 */
  const getCustomerById = useCallback(
    (id) => state.customers.find((c) => c.id === id) || null,
    [state.customers]
  );

  /** 根据名称查找客户（不区分大小写） */
  const findCustomerByName = useCallback(
    (name) => {
      if (!name) return null;
      const kw = name.trim().toLowerCase();
      return (
        state.customers.find((c) => c.name.toLowerCase() === kw) || null
      );
    },
    [state.customers]
  );

  const value = {
    customers: state.customers,
    loaded: state.loaded,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    findCustomerByName,
  };

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

/**
 * 获取客户上下文 hook
 * @returns {Object}
 */
export function useCustomers() {
  const ctx = useContext(CustomerContext);
  if (!ctx) {
    throw new Error('useCustomers 必须在 CustomerProvider 内使用');
  }
  return ctx;
}
