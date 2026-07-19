import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import dayjs from 'dayjs';
import { useOrders } from '../context/OrderContext';
import {
  STATUS_NODES,
  OVERDUE_RED_BG,
  STALE_YELLOW_BG,
  STALE_DAYS_THRESHOLD,
  OVERDUE_EXEMPT_STATUSES,
} from '../data/constants';
import StatusBadge from '../components/StatusBadge';
import useAllTags from '../hooks/useAllTags';

/**
 * 状态 → 左侧彩色竖条颜色映射
 * 与 STATUS_COLORS 独立，便于视觉微调
 * @type {Record<string, string>}
 */
const STATUS_STRIPE_COLORS = {
  '已接单': '#9E9E9E',   // 灰色
  '生产中': '#2196F3',   // 蓝色
  '验货': '#FF9800',     // 橙色
  '待出货': '#9C27B0',   // 紫色
  '已出货': '#4CAF50',   // 绿色
  '已收款': '#78909C',   // 蓝灰色
};

/**
 * 导出订单为 CSV 文件
 * @param {Array} orders - 订单列表
 */
function exportToCSV(orders) {
  const headers = [
    '客户名称', 'PO号', 'SKU', '产品概述', '数量', '金额', '贸易术语',
    '起运港', '目的港', '预计交货日', '业务员', '工厂名称', '备注', '状态', '创建时间',
  ];
  const rows = orders.map((o) => [
    o.customerName,
    o.poNumber,
    o.sku,
    o.productSummary,
    o.quantity,
    o.amount,
    o.tradeTerm,
    o.portOfLoading,
    o.portOfDestination,
    o.estimatedDeliveryDate,
    o.salesperson,
    o.factoryName,
    o.notes,
    o.status,
    o.createdAt,
  ]);

  const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `订单导出_${dayjs().format('YYYYMMDD')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 订单列表页面
 * - 桌面端：表格视图 + 左侧状态彩色竖条
 * - 移动端（<600px）：卡片布局
 * - 状态筛选 + 关键字搜索（客户名、PO号）
 * - CSV 导出 + 复制订单 + 快速状态推进
 */
export default function OrderList() {
  const { orders, canEdit, advanceStatus, getNextStatuses } = useOrders();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // <600px

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);

  // 快速状态推进：每行的下拉菜单锚点
  const [advanceAnchor, setAdvanceAnchor] = useState(null);
  const [advanceOrderId, setAdvanceOrderId] = useState(null);

  // 鼠标悬停产品照片：{ orderId, anchorEl } | null
  const [hoveredRow, setHoveredRow] = useState(null);
  const hoverLeaveTimerRef = useRef(null);

  // 状态推进成功提示
  const [advanceSnackbar, setAdvanceSnackbar] = useState({ open: false, message: '' });

  const allTags = useAllTags(orders);

  // 筛选 + 搜索
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (statusFilter) {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      result = result.filter(
        (o) =>
          o.customerName.toLowerCase().includes(kw) ||
          o.poNumber.toLowerCase().includes(kw)
      );
    }

    // 标签筛选（AND 逻辑：订单必须同时包含所有选中的标签）
    const selectedTagLowers = selectedTags.map((t) => t.toLowerCase());
    if (selectedTagLowers.length > 0) {
      result = result.filter((order) =>
        selectedTagLowers.every((st) =>
          (order.tags || []).some(
            (t) => t.toLowerCase().trim() === st
          )
        )
      );
    }

    return result;
  }, [orders, keyword, statusFilter, selectedTags]);

  /**
   * 判断订单行是否需高亮预警
   * - 红色：预计交货日已过 且 状态非已出货/已收款
   * - 黄色：超过阈值天数未更新 且 非红色
   * - null：无需高亮
   * @param {object} order
   * @returns {'red' | 'yellow' | null}
   */
  const getRowHighlight = (order) => {
    const today = dayjs().startOf('day');

    // 红色：交货日已过 且 未在豁免状态
    if (
      order.estimatedDeliveryDate &&
      !OVERDUE_EXEMPT_STATUSES.includes(order.status)
    ) {
      const delivery = dayjs(order.estimatedDeliveryDate).startOf('day');
      if (delivery.isBefore(today)) {
        return 'red';
      }
    }

    // 黄色：超过 N 天未更新
    if (order.updatedAt) {
      const updated = dayjs(order.updatedAt);
      const daysSinceUpdate = today.diff(updated, 'day');
      if (daysSinceUpdate > STALE_DAYS_THRESHOLD) {
        return 'yellow';
      }
    }

    return null;
  };

  /** 打开状态推进菜单 */
  const handleOpenAdvanceMenu = (event, orderId) => {
    event.stopPropagation();
    setAdvanceAnchor(event.currentTarget);
    setAdvanceOrderId(orderId);
  };

  /** 关闭状态推进菜单 */
  const handleCloseAdvanceMenu = () => {
    setAdvanceAnchor(null);
    setAdvanceOrderId(null);
  };

  /** 执行快速状态推进 */
  const handleQuickAdvance = (newStatus) => {
    if (advanceOrderId) {
      advanceStatus(advanceOrderId, newStatus);
      setAdvanceSnackbar({ open: true, message: `订单状态已推进至「${newStatus}」` });
    }
    handleCloseAdvanceMenu();
  };

  /**
   * 获取行背景色（基于高亮状态）
   * @param {'red' | 'yellow' | null} highlight
   * @returns {string}
   */
  const getRowBgcolor = (highlight) => {
    if (highlight === 'red') return OVERDUE_RED_BG;
    if (highlight === 'yellow') return STALE_YELLOW_BG;
    return 'transparent';
  };

  /**
   * 获取行 hover 背景色
   * @param {'red' | 'yellow' | null} highlight
   * @returns {string | undefined}
   */
  const getRowHoverBgcolor = (highlight) => {
    if (highlight === 'red') return '#FFE0E0';
    if (highlight === 'yellow') return '#FFF8D0';
    return undefined;
  };

  // ---- 移动端卡片渲染 ----
  const renderMobileCards = () => (
    <Stack spacing={1.5}>
      {filteredOrders.map((order) => {
        const highlight = getRowHighlight(order);
        const nextStatuses = getNextStatuses(order.status);
        return (
          <Paper
            key={order.id}
            elevation={0}
            variant="outlined"
            sx={{
              p: 2,
              borderLeft: `3px solid ${STATUS_STRIPE_COLORS[order.status] || 'transparent'}`,
              bgcolor: getRowBgcolor(highlight),
              cursor: 'pointer',
              transition: 'box-shadow 0.2s',
              '&:hover': {
                boxShadow: 2,
              },
            }}
            onClick={() => navigate(`/orders/${order.id}`)}
          >
            {/* 第一行：PO号 + 状态 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {order.poNumber}
              </Typography>
              <Box sx={{ textAlign: 'right' }}>
                <StatusBadge status={order.status} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10, display: 'block' }}>
                  {(() => {
                    const days = dayjs().diff(dayjs(order.updatedAt), 'day');
                    return days === 0 ? '今天' : `${days} 天`;
                  })()}
                </Typography>
              </Box>
            </Box>

            {/* 客户名称 */}
            <Typography variant="body2" color="text.secondary">
              {order.customerName}
            </Typography>

            {/* SKU（如果有） */}
            {order.sku && (
              <Typography
                variant="caption"
                sx={{ fontFamily: 'monospace', color: 'text.disabled', display: 'block' }}
              >
                SKU: {order.sku}
              </Typography>
            )}

            {/* 产品描述 + 数量 */}
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {order.productSummary}{order.quantity ? ` · ${order.quantity} pcs` : ''}
            </Typography>

            {/* 金额 + 更新时间 */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                {order.amount || '-'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {order.updatedAt ? dayjs(order.updatedAt).format('MM-DD HH:mm') : ''}
              </Typography>
            </Box>

            {/* 标签 */}
            {order.tags && order.tags.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                {order.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Box>
            )}

            {/* 快速操作按钮 */}
            <Box
              sx={{ display: 'flex', gap: 0.5, mt: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip title="查看详情">
                <IconButton
                  size="small"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {/* 复制订单 */}
              <Tooltip title="复制订单">
                <IconButton
                  size="small"
                  onClick={() => navigate(`/orders/new?copy=${order.id}`)}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {/* 快速状态推进 */}
              {nextStatuses.length > 0 && (
                <Tooltip title="快速推进状态">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={(e) => handleOpenAdvanceMenu(e, order.id)}
                  >
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );

  // ---- 桌面端表格渲染 ----
  const renderDesktopTable = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#f5f5f5' }}>
            <TableCell sx={{ fontWeight: 700 }}>客户名称</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>PO号</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>产品概述</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>数量</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>金额</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>贸易术语</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>状态</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>预计交货日</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>更新时间</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="center">
              操作
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredOrders.map((order) => {
            const highlight = getRowHighlight(order);
            const nextStatuses = getNextStatuses(order.status);
            return (
            <TableRow
              key={order.id}
              hover
              sx={{
                cursor: 'pointer',
                borderLeft: `3px solid ${STATUS_STRIPE_COLORS[order.status] || 'transparent'}`,
                bgcolor: getRowBgcolor(highlight),
                '&:hover': {
                  bgcolor: getRowHoverBgcolor(highlight),
                },
              }}
              onClick={() => navigate(`/orders/${order.id}`)}
              onMouseEnter={(e) => {
                if (hoverLeaveTimerRef.current) {
                  clearTimeout(hoverLeaveTimerRef.current);
                  hoverLeaveTimerRef.current = null;
                }
                setHoveredRow({ orderId: order.id, anchorEl: e.currentTarget });
              }}
              onMouseLeave={() => {
                if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
                hoverLeaveTimerRef.current = setTimeout(() => {
                  setHoveredRow(null);
                  hoverLeaveTimerRef.current = null;
                }, 150);
              }}
            >
              <TableCell>{order.customerName}</TableCell>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {order.poNumber}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  sx={{
                    maxWidth: 180,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {order.productSummary}
                </Typography>
              </TableCell>
              <TableCell>
                {order.sku ? (
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 140,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    {order.sku}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.disabled">-</Typography>
                )}
              </TableCell>
              <TableCell>{order.quantity}</TableCell>
              <TableCell>{order.amount}</TableCell>
              <TableCell>{order.tradeTerm}</TableCell>
              <TableCell>
                <StatusBadge status={order.status} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, display: 'block', mt: 0.25 }}>
                  {(() => {
                    const days = dayjs().diff(dayjs(order.updatedAt), 'day');
                    return days === 0 ? '今天更新' : `已停留 ${days} 天`;
                  })()}
                </Typography>
              </TableCell>
              <TableCell>
                {order.estimatedDeliveryDate
                  ? dayjs(order.estimatedDeliveryDate).format('YYYY-MM-DD')
                  : '-'}
              </TableCell>
              <TableCell>
                {order.updatedAt ? dayjs(order.updatedAt).format('MM-DD HH:mm') : '-'}
              </TableCell>
              <TableCell align="center">
                <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  <Tooltip title="查看详情">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={canEdit(order) ? '编辑' : '已出货/已收款订单不可编辑'}
                  >
                    <span>
                      <IconButton
                        size="small"
                        disabled={!canEdit(order)}
                        onClick={() => navigate(`/orders/${order.id}/edit`)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {/* 复制订单 */}
                  <Tooltip title="复制订单">
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/orders/new?copy=${order.id}`)}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {/* 快速状态推进 */}
                  {nextStatuses.length > 0 && (
                    <Tooltip title="快速推进状态">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => handleOpenAdvanceMenu(e, order.id)}
                      >
                        <ArrowForwardIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          );
        })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {/* 标题栏 */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          gap: 2,
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          订单列表
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => exportToCSV(filteredOrders)}
            disabled={filteredOrders.length === 0}
          >
            导出 CSV
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/orders/new')}
          >
            新建订单
          </Button>
        </Stack>
      </Box>

      {/* 筛选栏 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="搜索客户名称或PO号…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ minWidth: 260 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>状态筛选</InputLabel>
            <Select
              value={statusFilter}
              label="状态筛选"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">全部状态</MenuItem>
              {STATUS_NODES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
            共 {filteredOrders.length} 条
          </Typography>
        </Stack>
      </Paper>

      {/* 标签筛选 Chip 行 */}
      {allTags.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.5,
            mb: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Chip
            label="全部"
            variant={selectedTags.length === 0 ? 'filled' : 'outlined'}
            color={selectedTags.length === 0 ? 'primary' : 'default'}
            onClick={() => setSelectedTags([])}
            size="small"
          />
          {allTags.map(({ tag, count }) => {
            const selected = selectedTags.includes(tag);
            return (
              <Chip
                key={tag}
                label={`${tag} (${count})`}
                variant={selected ? 'filled' : 'outlined'}
                color={selected ? 'primary' : 'default'}
                size="small"
                onClick={() => {
                  if (selected) {
                    setSelectedTags((prev) => prev.filter((t) => t !== tag));
                  } else {
                    setSelectedTags((prev) => [...prev, tag]);
                  }
                }}
              />
            );
          })}
        </Box>
      )}

      {/* 空数据提示 */}
      {filteredOrders.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="h6" gutterBottom>
            暂无数据
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {orders.length === 0
              ? '还没有订单，去创建一个吧'
              : '没有匹配的订单，请调整筛选条件'}
          </Typography>
        </Paper>
      ) : isMobile ? (
        renderMobileCards()
      ) : (
        renderDesktopTable()
      )}

      {/* 快速状态推进下拉菜单 */}
      <Menu
        anchorEl={advanceAnchor}
        open={Boolean(advanceAnchor)}
        onClose={handleCloseAdvanceMenu}
        onClick={(e) => e.stopPropagation()}
      >
        {advanceOrderId && getNextStatuses(
          orders.find((o) => o.id === advanceOrderId)?.status || ''
        ).map((s) => (
          <MenuItem key={s} onClick={() => handleQuickAdvance(s)}>
            ⏩ 推进至「{s}」
          </MenuItem>
        ))}
      </Menu>

      {/* 鼠标悬停产品照片预览：固定右下角浮窗（不挡页面、始终完整显示） */}
      {hoveredRow && (() => {
        const hoverOrder = orders.find((o) => o.id === hoveredRow.orderId);
        if (!hoverOrder || !hoverOrder.productPhoto) return null;
        return (
          <Box
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1300,
              pointerEvents: 'auto',
            }}
            onMouseEnter={() => {
              if (hoverLeaveTimerRef.current) {
                clearTimeout(hoverLeaveTimerRef.current);
                hoverLeaveTimerRef.current = null;
              }
            }}
            onMouseLeave={() => {
              if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
              hoverLeaveTimerRef.current = setTimeout(() => {
                setHoveredRow(null);
                hoverLeaveTimerRef.current = null;
              }, 100);
            }}
          >
            <Paper elevation={8} sx={{ borderRadius: 1, overflow: 'hidden' }}>
              <img
                src={hoverOrder.productPhoto}
                alt="产品照片"
                style={{ width: 240, height: 240, objectFit: 'cover', display: 'block' }}
              />
              <Box sx={{ px: 1.5, py: 1, maxWidth: 240 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {hoverOrder.poNumber}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {hoverOrder.customerName}
                </Typography>
              </Box>
            </Paper>
          </Box>
        );
      })()}

      {/* 状态推进成功提示 */}
      <Snackbar
        open={advanceSnackbar.open}
        autoHideDuration={2000}
        onClose={() => setAdvanceSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setAdvanceSnackbar((prev) => ({ ...prev, open: false }))}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {advanceSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
