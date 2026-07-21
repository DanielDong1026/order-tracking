import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { useAuth } from '../context/AuthContext';

/**
 * 登录/注册页
 * - 支持注册、登录、"演示体验"三种方式入口
 */
export default function AuthPage() {
  const { login, register } = useAuth();

  const [tab, setTab] = useState(0); // 0=登录 1=注册
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('请填写用户名和密码');
      return;
    }

    if (tab === 1) {
      // 注册
      if (password !== password2) {
        setError('两次密码不一致');
        return;
      }
      if (password.length < 4) {
        setError('密码至少 4 位');
        return;
      }
      if (username.trim().length < 2) {
        setError('用户名至少 2 个字符');
        return;
      }
    }

    setLoading(true);
    try {
      if (tab === 1) {
        register(username.trim(), password);
      } else {
        login(username.trim(), password);
      }
    } catch (err) {
      setError(err.message || (tab === 1 ? '注册失败' : '登录失败'));
      setLoading(false);
    }
  };

  /** 演示体验 */
  const handleDemo = () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: '演示用户', isDemo: true }));
    // Demo 数据已在 Dashboard 加载演示数据逻辑中处理；这里直接刷新
    window.location.reload();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f0f2f5',
        px: 2,
      }}
    >
      <Paper elevation={4} sx={{ p: 4, maxWidth: 420, width: '100%', borderRadius: 2 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="primary" gutterBottom>
            📊
          </Typography>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            外贸跟单系统
          </Typography>
          <Typography variant="body2" color="text.secondary">
            外贸业务员的高效跟单工具
          </Typography>
        </Box>

        {/* 登录/注册切换 */}
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setError(''); }}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab label="登录" />
          <Tab label="注册" />
        </Tabs>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 表单 */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            size="medium"
            sx={{ mb: 2 }}
            autoFocus
            autoComplete="username"
          />
          <TextField
            fullWidth
            label="密码"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="medium"
            sx={{ mb: tab === 1 ? 2 : 3 }}
            autoComplete={tab === 1 ? 'new-password' : 'current-password'}
          />
          {tab === 1 && (
            <TextField
              fullWidth
              label="确认密码"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              size="medium"
              sx={{ mb: 3 }}
              autoComplete="new-password"
            />
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            sx={{ py: 1.5, fontWeight: 600, fontSize: '1rem' }}
          >
            {tab === 1 ? '注册' : '登录'}
          </Button>
        </Box>

        {/* 演示体验 — 跳过注册 */}
        <Divider sx={{ my: 3 }}>
          <Typography variant="caption" color="text.disabled" sx={{ px: 1 }}>
            或
          </Typography>
        </Divider>
        <Button
          variant="outlined"
          fullWidth
          size="large"
          startIcon={<EngineeringIcon />}
          onClick={handleDemo}
          sx={{ py: 1.5, color: 'text.secondary' }}
        >
          演示体验（跳过注册）
        </Button>

        {/* 提示 */}
        <Typography variant="caption" color="text.disabled" sx={{ mt: 3, display: 'block', textAlign: 'center' }}>
          演示模式可预览全部功能 · 注册可保存自己的数据
        </Typography>
      </Paper>
    </Box>
  );
}

const SESSION_KEY = 'order_tracking_session';
