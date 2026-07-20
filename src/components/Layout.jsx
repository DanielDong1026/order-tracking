import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PeopleIcon from '@mui/icons-material/People';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import dayjs from 'dayjs';
import { useOrders } from '../context/OrderContext';
import ImportDialog from './ImportDialog';

const NAV_ITEMS = [
  { label: '仪表盘', path: '/', icon: <DashboardIcon /> },
  { label: '订单列表', path: '/orders', icon: <ListAltIcon /> },
  { label: '新建订单', path: '/orders/new', icon: <AddCircleIcon /> },
  { label: '客户管理', path: '/customers', icon: <PeopleIcon /> },
];

/**
 * 全局布局组件：顶部导航栏 + 内容区域 + 页脚
 * @param {{ toggleTheme: () => void, themeMode: 'light' | 'dark' }} props
 */
export default function Layout({ toggleTheme = () => {}, themeMode = 'light' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, importOrders } = useOrders();

  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // 动态页面标题：显示未完成订单数
  const incompleteCount = useMemo(
    () => orders.filter((o) => !['已出货', '已收款'].includes(o.status)).length,
    [orders]
  );

  useEffect(() => {
    document.title = incompleteCount > 0
      ? `📊 (${incompleteCount}) 外贸跟单系统`
      : '📊 外贸跟单系统';
  }, [incompleteCount]);

  /* 全局键盘快捷键 */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 在输入框/文本框中不触发快捷键
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;

      // / 聚焦搜索
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="搜索"]');
        if (searchInput) searchInput.focus();
      }

      // Ctrl/Cmd + N → 新建订单
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/orders/new');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  /** 导出全部数据为 JSON 文件 */
  const handleExport = () => {
    const data = JSON.stringify(
      { orders, exportTime: new Date().toISOString() },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `跟单数据备份_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isDark = themeMode === 'dark';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, mr: 4, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            外贸跟单系统
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Button
                  key={item.path}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                  sx={{
                    fontWeight: isActive ? 700 : 400,
                    borderBottom: isActive ? '2px solid #fff' : '2px solid transparent',
                    borderRadius: 0,
                    pb: 1,
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>

          {/* 右侧操作区：暗色模式切换 + 导出/导入 */}
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {/* 暗色/亮色模式切换 */}
            <Tooltip title={isDark ? '切换亮色模式' : '切换暗色模式'}>
              <IconButton color="inherit" onClick={toggleTheme} size="small">
                {isDark ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="导出全部订单数据为 JSON 文件">
              <Button
                color="inherit"
                size="small"
                startIcon={<SaveAltIcon />}
                onClick={handleExport}
                sx={{ textTransform: 'none' }}
              >
                导出数据
              </Button>
            </Tooltip>
            <Tooltip title="从 JSON 备份文件导入订单数据">
              <Button
                color="inherit"
                size="small"
                startIcon={<FileUploadIcon />}
                onClick={() => setImportDialogOpen(true)}
                sx={{ textTransform: 'none' }}
              >
                导入数据
              </Button>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ flex: 1, py: 3 }}>
        <Outlet />
      </Container>

      <Box
        component="footer"
        sx={{
          textAlign: 'center',
          py: 2,
          color: 'text.secondary',
          fontSize: '0.875rem',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        外贸跟单系统 v1.0 · 数据存储于本地浏览器
      </Box>

      {/* 导入 Dialog */}
      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        orders={orders}
        importOrders={importOrders}
      />
    </Box>
  );
}

Layout.propTypes = {
  toggleTheme: PropTypes.func,
  themeMode: PropTypes.oneOf(['light', 'dark']),
};
