import React, { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { useAuth } from '../context/AuthContext';

const SESSION_KEY = 'order_tracking_session';

/**
 * 应用 logo（自绘 SVG）
 * 寓意：地球（国际）+ 飞越箭头（贸易流通）+ 品牌主色
 */
function AppLogo({ size = 80 }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: `${size * 0.22}px`,
        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto',
        boxShadow: '0 6px 18px rgba(21, 101, 192, 0.28)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <svg viewBox="0 0 80 80" width={size * 0.78} height={size * 0.78}>
        {/* 地球经纬线 */}
        <circle cx="40" cy="40" r="26" fill="none" stroke="#fff" strokeWidth="2.2" opacity="0.92" />
        <ellipse cx="40" cy="40" rx="26" ry="10" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.75" />
        <ellipse cx="40" cy="40" rx="10" ry="26" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.75" />
        <line x1="14" y1="40" x2="66" y2="40" stroke="#fff" strokeWidth="1.4" opacity="0.6" />
        {/* 外贸箭头（飞越地球） */}
        <path
          d="M 12 22 Q 30 8 56 12"
          fill="none"
          stroke="#FFB300"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M 56 12 L 50 8 M 56 12 L 51 17"
          fill="none"
          stroke="#FFB300"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </Box>
  );
}

/**
 * 滑动验证组件（纯前端，无第三方依赖）
 * - 拖到右端即成功
 * - 3 秒后自动重置
 */
function SliderCaptcha({ onChange }) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'verifying' | 'success'
  const [progress, setProgress] = useState(0); // 0~100
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current || !trackRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const trackRect = trackRef.current.getBoundingClientRect();
      const maxX = trackRect.width - 44; // 滑块宽 44px
      const delta = clientX - startXRef.current + offsetRef.current;
      const next = Math.max(0, Math.min(delta, maxX));
      setProgress((next / maxX) * 100);
    };
    const handleUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (progress > 92) {
        setProgress(100);
        setStatus('success');
        onChange && onChange(true);
        // 3 秒后自动重置
        setTimeout(() => {
          setStatus('idle');
          setProgress(0);
          offsetRef.current = 0;
          onChange && onChange(false);
        }, 3000);
      } else {
        // 没到 100% 弹回
        setProgress(0);
        offsetRef.current = 0;
      }
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [progress, onChange]);

  const handleDown = (e) => {
    if (status !== 'idle') return;
    draggingRef.current = true;
    startXRef.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleRefresh = () => {
    setStatus('idle');
    setProgress(0);
    offsetRef.current = 0;
    onChange && onChange(false);
  };

  const trackText = status === 'success' ? '✓ 验证成功' : '请按住滑块向右拖动';
  const sliderColor = status === 'success' ? '#4caf50' : '#1565c0';
  const trackBg = status === 'success' ? '#e8f5e9' : '#f5f5f5';

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        ref={trackRef}
        sx={{
          position: 'relative',
          height: 44,
          bgcolor: trackBg,
          borderRadius: 22,
          overflow: 'hidden',
          userSelect: 'none',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'background-color 0.2s',
        }}
      >
        {/* 进度填充 */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress}%`,
            bgcolor: status === 'success' ? '#c8e6c9' : '#bbdefb',
            transition: status === 'idle' && progress > 0 ? 'width 0.3s' : 'none',
          }}
        />
        {/* 文字 */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: status === 'success' ? '#2e7d32' : 'text.secondary',
              fontSize: 14,
              fontWeight: status === 'success' ? 600 : 400,
            }}
          >
            {trackText}
          </Typography>
        </Box>
        {/* 滑块 */}
        <Box
          onMouseDown={handleDown}
          onTouchStart={handleDown}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: sliderColor,
            color: '#fff',
            borderRadius: '50%',
            transform: `translateX(${progress}%)`,
            transition: status === 'idle' && progress > 0 && progress < 100 ? 'transform 0.3s' : 'none',
            cursor: status === 'idle' ? 'grab' : 'default',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            zIndex: 1,
            '&:active': { cursor: 'grabbing' },
          }}
        >
          {status === 'success' ? <CheckCircleIcon fontSize="small" /> : <ChevronRightIcon />}
        </Box>
        {/* 重置按钮（成功后显示） */}
        {status === 'success' && (
          <IconButton
            size="small"
            onClick={handleRefresh}
            sx={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 2,
          mt: 0.5,
          borderRadius: 1,
          opacity: progress > 0 ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
    </Box>
  );
}

/**
 * 手机号校验
 */
function isValidPhone(p) {
  return /^1[3-9]\d{9}$/.test(p);
}

/**
 * 登录/注册页
 */
export default function AuthPage() {
  const { login, register } = useAuth();

  const [tab, setTab] = useState(0); // 0=登录 1=注册
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [captchaOk, setCaptchaOk] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidPhone(phone)) {
      setError('请输入正确的 11 位手机号');
      return;
    }
    if (!password || password.length < 4) {
      setError('密码至少 4 位');
      return;
    }
    if (tab === 1 && password !== password2) {
      setError('两次密码不一致');
      return;
    }
    if (tab === 1 && !captchaOk) {
      setError('请先完成滑动验证');
      return;
    }

    setLoading(true);
    try {
      if (tab === 1) {
        register(phone, password);
      } else {
        login(phone, password);
      }
    } catch (err) {
      setError(err.message || (tab === 1 ? '注册失败' : '登录失败'));
      setLoading(false);
    }
  };

  /** 演示体验（跳过注册） */
  const handleDemo = () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ username: '演示用户', isDemo: true }));
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
      <Paper elevation={4} sx={{ p: 4, maxWidth: 440, width: '100%', borderRadius: 2 }}>
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <AppLogo size={72} />
        </Box>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            size="medium"
            sx={{ mb: 2 }}
            autoFocus
            autoComplete="tel"
            inputMode="numeric"
            placeholder="11 位手机号"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography variant="body2" color="text.secondary">+86</Typography>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label="密码"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="medium"
            sx={{ mb: tab === 1 ? 2 : 2 }}
            autoComplete={tab === 1 ? 'new-password' : 'current-password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPwd((v) => !v)} edge="end">
                    {showPwd ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {tab === 1 && (
            <TextField
              fullWidth
              label="确认密码"
              type={showPwd ? 'text' : 'password'}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              size="medium"
              sx={{ mb: 2 }}
              autoComplete="new-password"
            />
          )}

          {/* 滑动验证（仅注册时显示） */}
          {tab === 1 && <SliderCaptcha onChange={setCaptchaOk} />}

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

        {/* 演示体验 — 仅注册页显示 */}
        {tab === 1 && (
          <>
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
          </>
        )}

        {tab === 1 && (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 3, display: 'block', textAlign: 'center' }}>
            演示模式可预览全部功能 · 手机号注册可保存自己的数据
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
