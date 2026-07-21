/**
 * @file 工厂数据全局状态
 * 管理工厂的 CRUD，独立于订单（工厂删除不影响历史订单）
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { loadFactories, saveFactories, generateId } from '../utils/storage';

const FactoryContext = createContext(null);

function factoryReducer(state, action) {
  switch (action.type) {
    case 'LOAD_FACTORIES':
      return { ...state, factories: action.payload, loaded: true };
    case 'ADD_FACTORY':
      return { ...state, factories: [action.payload, ...state.factories] };
    case 'UPDATE_FACTORY': {
      const now = new Date().toISOString();
      return {
        ...state,
        factories: state.factories.map((f) =>
          f.id === action.payload.id
            ? { ...f, ...action.payload.data, updatedAt: now }
            : f
        ),
      };
    }
    case 'DELETE_FACTORY':
      return {
        ...state,
        factories: state.factories.filter((f) => f.id !== action.payload),
      };
    default:
      return state;
  }
}

export function FactoryProvider({ children }) {
  const [state, dispatch] = useReducer(factoryReducer, { factories: [], loaded: false });

  useEffect(() => {
    const factories = loadFactories();
    dispatch({ type: 'LOAD_FACTORIES', payload: factories });
  }, []);

  useEffect(() => {
    if (state.loaded) saveFactories(state.factories);
  }, [state.factories, state.loaded]);

  const addFactory = useCallback((formData) => {
    const now = new Date().toISOString();
    const f = { ...formData, id: generateId(), createdAt: now, updatedAt: now };
    dispatch({ type: 'ADD_FACTORY', payload: f });
    return f;
  }, []);

  const updateFactory = useCallback((id, data) => {
    dispatch({ type: 'UPDATE_FACTORY', payload: { id, data } });
  }, []);

  const deleteFactory = useCallback((id) => {
    dispatch({ type: 'DELETE_FACTORY', payload: id });
  }, []);

  const value = {
    factories: state.factories,
    loaded: state.loaded,
    addFactory,
    updateFactory,
    deleteFactory,
  };

  return <FactoryContext.Provider value={value}>{children}</FactoryContext.Provider>;
}

export function useFactories() {
  const ctx = useContext(FactoryContext);
  if (!ctx) throw new Error('useFactories must be used within FactoryProvider');
  return ctx;
}
