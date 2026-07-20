import React, { useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OrderList from './pages/OrderList';
import OrderForm from './pages/OrderForm';
import OrderDetail from './pages/OrderDetail';
import CustomerList from './pages/CustomerList';
import SharePage from './pages/SharePage';
import NotFound from './pages/NotFound';

/**
 * 根据模式生成 MUI 主题
 * @param {'light' | 'dark'} mode - 亮色/暗色模式
 * @returns {import('@mui/material/styles').Theme}
 */
const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#1565c0',
    },
    secondary: {
      main: '#7b1fa2',
    },
    ...(mode === 'light'
      ? {
          background: {
            default: '#f5f5f5',
          },
        }
      : {}),
  },
  typography: {
    fontFamily: '"Roboto", "Noto Sans SC", "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

/**
 * 应用根组件
 * - 管理亮色/暗色主题模式（state + localStorage）
 * - 路由分叉：分享页独立于 Layout，其余页面包裹在 Layout 内
 */
export default function App() {
  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem('themeMode') || 'light'
  );

  const theme = useMemo(() => getTheme(themeMode), [themeMode]);

  /** 切换亮色/暗色模式并持久化到 localStorage */
  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        {/* 分享只读页 — 独立路由，不在 Layout 内 */}
        <Route path="/share/:shareToken" element={<SharePage />} />
        {/* 主应用路由 — 包裹在 Layout（侧边栏 + 顶部导航） */}
        <Route element={<Layout toggleTheme={toggleTheme} themeMode={themeMode} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/new" element={<OrderForm />} />
          <Route path="/orders/:id/edit" element={<OrderForm />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/customers" element={<CustomerList />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
