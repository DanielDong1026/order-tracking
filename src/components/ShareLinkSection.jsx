import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useOrders } from '../context/OrderContext';
import { buildShareUrl, copyToClipboard } from '../utils/share';

/**
 * 分享链接操作区组件
 *
 * 状态机：
 * - 未生成：显示「🔗 生成分享链接」按钮
 * - 已生成：显示链接只读输入框 + 「📋 复制」按钮 + 「🔄 重新生成」按钮
 *
 * 复制反馈：按钮文字短暂变为「✓ 已复制」，1.5s 后恢复
 * 重新生成：弹出 MUI Dialog 二次确认
 *
 * @param {{ orderId: string, shareToken?: string }} props
 */
export default function ShareLinkSection({ orderId, shareToken }) {
  const { generateShareToken, regenerateShareToken } = useOrders();
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 派生当前链接：优先使用 props 中的 shareToken
  const currentLink = shareToken ? buildShareUrl(shareToken) : '';

  /** 生成分享链接 */
  const handleGenerate = () => {
    const url = generateShareToken(orderId);
    if (url) {
      // 触发 React 重新渲染以获取新的 shareToken（通过父组件重渲染）
    }
  };

  /** 复制链接到剪贴板 */
  const handleCopy = async () => {
    const success = await copyToClipboard(currentLink);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  /** 打开重新生成确认弹窗 */
  const handleRegenerateClick = () => {
    setConfirmOpen(true);
  };

  /** 确认重新生成 */
  const handleRegenerateConfirm = () => {
    regenerateShareToken(orderId);
    setConfirmOpen(false);
  };

  // ===== 未生成状态 =====
  if (!shareToken) {
    return (
      <Button
        variant="outlined"
        startIcon={<ShareIcon />}
        onClick={handleGenerate}
      >
        生成分享链接
      </Button>
    );
  }

  // ===== 已生成状态 =====
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {/* 链接展示 — 只读输入框，等宽字体 */}
        <TextField
          size="small"
          value={currentLink}
          InputProps={{ readOnly: true }}
          sx={{
            minWidth: 280,
            '& .MuiInputBase-input': {
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              py: 0.75,
            },
          }}
        />

        {/* 复制按钮 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            color={copied ? 'success' : 'default'}
            onClick={handleCopy}
            title="复制链接"
            size="small"
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
          {copied && (
            <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
              ✓ 已复制
            </Typography>
          )}
        </Box>

        {/* 重新生成按钮 */}
        <Button
          variant="text"
          color="warning"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={handleRegenerateClick}
        >
          重新生成
        </Button>
      </Box>

      {/* 重新生成确认弹窗 */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>确认重新生成</DialogTitle>
        <DialogContent>
          <DialogContentText>
            重新生成后，旧链接将立即失效，确认重新生成？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button onClick={handleRegenerateConfirm} color="warning" variant="contained">
            确认
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
