import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';
import { loadOrders } from '../utils/storage';
import { APP_NAME } from '../data/constants';
import ShareOrderCard from '../components/ShareOrderCard';
import ShareTimeline from '../components/ShareTimeline';

/**
 * 剥离时间线附件中的数据字段
 * 每个 attachment 仅保留 id、name、type，删除 data（Base64）
 *
 * @param {Object} order - 原始订单对象
 * @returns {Object} 剥离附件数据后的订单对象
 */
function stripAttachmentData(order) {
  if (!order || !order.timeline) return order;
  return {
    ...order,
    timeline: order.timeline.map((entry) => ({
      ...entry,
      attachments: (entry.attachments || []).map((att) => ({
        id: att.id,
        name: att.name,
        type: att.type,
      })),
    })),
  };
}

/**
 * 分享只读页
 *
 * 独立路由 /share/:shareToken，不嵌套在 Layout 内（无侧边栏/导航）。
 * 直接从 localStorage 读取订单数据，按 shareToken 匹配。
 *
 * - 找到订单 → 渲染 ShareOrderCard + ShareTimeline
 * - 未找到 → 渲染「链接已失效或不存在」错误页
 */
export default function SharePage() {
  const { shareToken } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // 动态设置页面标题
    document.title = `订单状态分享 — ${APP_NAME}`;

    try {
      const orders = loadOrders();
      const found = orders.find((o) => o.shareToken === shareToken);
      if (found) {
        setOrder(stripAttachmentData(found));
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [shareToken]);

  // ===== 加载中 =====
  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography color="text.secondary">加载中...</Typography>
      </Container>
    );
  }

  // ===== 错误 / 链接失效 =====
  if (error || !order) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="sm" sx={{ py: 8, flex: 1 }}>
          <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h4" fontWeight={700} color="text.secondary" gutterBottom>
              链接已失效或不存在
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              该分享链接可能已被重新生成，或订单已不存在。
            </Typography>
            <Button
              variant="outlined"
              startIcon={<HomeIcon />}
              component={Link}
              to="/"
            >
              返回首页
            </Button>
          </Paper>
        </Container>

        {/* 页脚 */}
        <Box
          component="footer"
          sx={{
            textAlign: 'center',
            py: 2,
            color: 'text.secondary',
            fontSize: '0.75rem',
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fff',
          }}
        >
          本页面由{APP_NAME}生成
        </Box>
      </Box>
    );
  }

  // ===== 正常展示 =====
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="sm" sx={{ py: 4, flex: 1 }}>
        {/* 页面标题 */}
        <Typography variant="h5" fontWeight={700} textAlign="center" gutterBottom>
          📦 订单状态分享
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          以下为订单当前状态，信息实时更新
        </Typography>

        {/* 订单基本信息卡片 */}
        <ShareOrderCard order={order} />

        {/* 时间线标题 */}
        <Typography variant="h6" fontWeight={600} sx={{ mt: 3, mb: 2 }}>
          📋 跟单时间线
        </Typography>

        {/* 只读时间线 */}
        <ShareTimeline timeline={order.timeline} currentStatus={order.status} />
      </Container>

      {/* 品牌页脚 */}
      <Box
        component="footer"
        sx={{
          textAlign: 'center',
          py: 2,
          color: 'text.secondary',
          fontSize: '0.75rem',
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fff',
        }}
      >
        本页面由{APP_NAME}生成
      </Box>
    </Box>
  );
}
