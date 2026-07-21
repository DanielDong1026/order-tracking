/**
 * @file 认证全局状态（本地模式）
 * 数据存 localStorage，不做密码哈希（单机使用场景）
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const USERS_KEY = 'order_tracking_users';
const SESSION_KEY = 'order_tracking_session';

function loadUsers() {
  try { const r = localStorage.getItem(USERS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}
function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}
function loadSession() {
  try { const r = localStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession());

  /** 注册 */
  const register = useCallback((username, password) => {
    const users = loadUsers();
    // 查重
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('用户名已存在');
    }
    const newUser = { username, password, createdAt: new Date().toISOString() };
    users.push(newUser);
    saveUsers(users);
    saveSession(newUser);
    setUser(newUser);
  }, []);

  /** 登录 */
  const login = useCallback((username, password) => {
    const users = loadUsers();
    const found = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (!found) throw new Error('用户名或密码错误');
    saveSession(found);
    setUser(found);
  }, []);

  /** 注销 */
  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const isLoggedIn = Boolean(user);
  const isDemo = Boolean(user?.isDemo);
  const username = user?.username || '';

  return (
    <AuthContext.Provider value={{ isLoggedIn, isDemo, username, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
