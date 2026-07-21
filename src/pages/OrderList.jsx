import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';
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
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
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
 * - 状态筛选 + 关键字搜索（客户名、PO号、SKU）
 * - CSV 导出 + 复制订单 + 快速状态推进 + 批量推进 + 列可见性
 */

/** 可隐藏的列定义（key 对应 order 字段名或渲染 key） */
const ALL_COLUMNS = [
  { key: 'customerName', label: '客户名称' },
  { key: 'poNumber', label: 'PO号' },
  { key: 'sku', label: 'SKU' },
  { key: 'productSummary', label: '产品概述' },
  { key: 'quantity', label: '数量' },
  { key: 'amount', label: '金额' },
  { key: 'tradeTerm', label: '贸易术语' },
  { key: 'status', label: '状态' },
  { key: 'estimatedDeliveryDate', label: '预计交货日' },
  { key: 'salesperson', label: '业务员' },
  { key: 'portOfLoading', label: '起运港' },
  { key: 'updatedAt', label: '更新时间' },
];

function loadColPrefs() {
  try {
    const r = localStorage.getItem('ot_col_visible');
    return r ? JSON.parse(r) : null;
  } catch { return null; }
}
function saveColPrefs(prefs) {
  try { localStorage.setItem('ot_col_visible', JSON.stringify(prefs)); } catch {}
}

export default function OrderList() {
  const { orders, canEdit, advanceStatus, getNextStatuses } = useOrders();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // <600px

  const [keyword, setKeyword] = useState('');
  // 初始值从 URL ?status= 读取，便于从仪表盘"已接单/生产中/…"等状态卡片点入
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '');

  // URL 参数变化时同步 statusFilter（如浏览器后退 / 点侧栏仪表盘）
  useEffect(() => {
    const urlStatus = searchParams.get('status') || '';
    setStatusFilter((prev) => (prev === urlStatus ? prev : urlStatus));
  }, [searchParams]);

  // 修改筛选时同步回 URL（无副作用，且可分享筛选后的 URL）
  const updateStatusFilter = (val) => {
    setStatusFilter(val);
    const next = new URLSearchParams(searchParams);
    if (val) next.set('status', val);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  };
  const [selectedTags, setSelectedTags] = useState([]);

  // 快速状态推进：每行的下拉菜单锚点
  const [advanceAnchor, setAdvanceAnchor] = useState(null);
  const [advanceOrderId, setAdvanceOrderId] = useState(null);

  // 批量推进
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchTargetStatus, setBatchTargetStatus] = useState('');

  // 列可见性
  const [colMenuAnchor, setColMenuAnchor] = useState(null);
  const [visibleCols, setVisibleCols] = useState(() => {
    const saved = loadColPrefs();
    // 默认：前 9 列可见，业务员 / 起运港 隐藏
    if (saved) return saved;
    const defaults = {};
    ALL_COLUMNS.forEach((c) => { defaults[c.key] = !['salesperson', 'portOfLoading'].includes(c.key); });
    return defaults;
  });

  // 鼠标悬停产品照片：{ orderId, anchorEl } | null
  const [hoveredRow, setHoveredRow] = useState(null);
  // 鼠标当前位置（让产品照片跟随光标，浮在光标左上角）
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
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
          o.poNumber.toLowerCase().includes(kw) ||
          (o.sku || '').toLowerCase().includes(kw)
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

  /** 批量推进：对已选订单逐一推进到目标状态（只处理允许该切换的订单） */
  const handleBatchAdvance = () => {
    if (!batchTargetStatus || selectedIds.size === 0) return;
    let count = 0;
    const ids = Array.from(selectedIds);
    ids.forEach((id) => {
      const order = orders.find((o) => o.id === id);
      if (!order) return;
      const nextStatuses = getNextStatuses(order.status);
      if (nextStatuses.includes(batchTargetStatus)) {
        advanceStatus(id, batchTargetStatus);
        count++;
      }
    });
    setBatchDialogOpen(false);
    setBatchTargetStatus('');
    setSelectedIds(new Set());
    setAdvanceSnackbar({
      open: true,
      message: count > 0
        ? `已推进 ${count} 个订单至「${batchTargetStatus}」${count < ids.length ? `（${ids.length - count} 个不在可推进状态）` : ''}`
        : `所选订单均无法推进至「${batchTargetStatus}」`,
    });
  };

  /** 全选/取消全选 */
  const handleToggleAll = () => {
    if (selectedIds.size === filteredOrders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  /** 单行选中/取消 */
  const handleToggleRow = (orderId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  /** 列可见性切换 */
  const handleToggleCol = (colKey) => {
    setVisibleCols((prev) => {
      const next = { ...prev, [colKey]: !prev[colKey] };
      saveColPrefs(next);
      return next;
    });
  };

  // 与批量推进兼容的目标状态列表（选 id 的交集可推进状态）
  const batchAvailableStatuses = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const selectedOrders = orders.filter((o) => selectedIds.has(o.id));
    if (selectedOrders.length === 0) return [];
    // 取所有已选订单可推进状态的交集
    let common = null;
    for (const order of selectedOrders) {
      const ns = new Set(getNextStatuses(order.status));
      if (common === null) common = ns;
      else common = new Set([...common].filter((s) => ns.has(s)));
    }
    return [...(common || [])];
  }, [selectedIds, orders, getNextStatuses]);

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
   * 获取行背景色（暗色模式下用半透明色，避免浅色背景 + 浅色文字）
   * @param {'red' | 'yellow' | null} highlight
   */
  const getRowBgcolor = (highlight) => {
    const isDark = theme.palette.mode === 'dark';
    if (highlight === 'red') return isDark ? 'rgba(244, 67, 54, 0.18)' : OVERDUE_RED_BG;
    if (highlight === 'yellow') return isDark ? 'rgba(255, 193, 7, 0.18)' : STALE_YELLOW_BG;
    return 'transparent';
  };

  /**
   * 获取行 hover 背景色
   * @param {'red' | 'yellow' | null} highlight
   */
  const getRowHoverBgcolor = (highlight) => {
    const isDark = theme.palette.mode === 'dark';
    if (highlight === 'red') return isDark ? 'rgba(244, 67, 54, 0.28)' : '#FFE0E0';
    if (highlight === 'yellow') return isDark ? 'rgba(255, 193, 7, 0.28)' : '#FFF8D0';
    return isDark ? 'rgba(255, 255, 255, 0.08)' : undefined;
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
          <TableRow sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#f5f5f5' }}>
            <TableCell sx={{ fontWeight: 700, width: 48 }}>
              <Checkbox
                size="small"
                checked={selectedIds.size > 0 && selectedIds.size === filteredOrders.length}
                indeterminate={selectedIds.size > 0 && selectedIds.size < filteredOrders.length}
                onChange={handleToggleAll}
              />
            </TableCell>
            {ALL_COLUMNS.filter((c) => visibleCols[c.key]).map((c) => (
              <TableCell key={c.key} sx={{ fontWeight: 700 }}>{c.label}</TableCell>
            ))}
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
                setMousePos({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                // 仅当坐标变化时才更新 state，避免无效 re-render
                setMousePos((prev) =>
                  prev.x === e.clientX && prev.y === e.clientY
                    ? prev
                    : { x: e.clientX, y: e.clientY }
                );
              }}
              onMouseLeave={() => {
                if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
                hoverLeaveTimerRef.current = setTimeout(() => {
                  setHoveredRow(null);
                  hoverLeaveTimerRef.current = null;
                }, 150);
              }}
            >
              {/* 复选框 */}
              <TableCell onClick={(e) => e.stopPropagation()} sx={{ p: 1, width: 48 }}>
                <Checkbox
                  size="small"
                  checked={selectedIds.has(order.id)}
                  onChange={() => handleToggleRow(order.id)}
                />
              </TableCell>
              {/* 动态列 */}
              {ALL_COLUMNS.filter((c) => visibleCols[c.key]).map((c) => {
                switch (c.key) {
                  case 'customerName': return <TableCell key={c.key}>{order.customerName}</TableCell>;
                  case 'poNumber': return <TableCell key={c.key}><Typography variant="body2" fontWeight={500}>{order.poNumber}</Typography></TableCell>;
                  case 'sku': return <TableCell key={c.key}>{order.sku ? <Typography variant="body2" sx={{maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:'monospace',fontSize:12,color:'text.secondary'}}>{order.sku}</Typography> : <Typography variant="body2" color="text.disabled">-</Typography>}</TableCell>;
                  case 'productSummary': return <TableCell key={c.key}><Typography variant="body2" sx={{maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{order.productSummary}</Typography></TableCell>;
                  case 'quantity': return <TableCell key={c.key}>{order.quantity}</TableCell>;
                  case 'amount': return <TableCell key={c.key}>{order.amount}</TableCell>;
                  case 'tradeTerm': return <TableCell key={c.key}>{order.tradeTerm}</TableCell>;
                  case 'status': return <TableCell key={c.key}><StatusBadge status={order.status} /><Typography variant="caption" sx={{color:'text.secondary',fontSize:11,display:'block',mt:0.25}}>{(() => { const days = dayjs().diff(dayjs(order.updatedAt), 'day'); return days === 0 ? '今天更新' : `已停留 ${days} 天`; })()}</Typography></TableCell>;
                  case 'estimatedDeliveryDate': return <TableCell key={c.key}>{order.estimatedDeliveryDate ? dayjs(order.estimatedDeliveryDate).format('YYYY-MM-DD') : '-'}</TableCell>;
                  case 'salesperson': return <TableCell key={c.key}>{order.salesperson || '-'}</TableCell>;
                  case 'portOfLoading': return <TableCell key={c.key}>{order.portOfLoading || '-'}</TableCell>;
                  case 'updatedAt': return <TableCell key={c.key}>{order.updatedAt ? dayjs(order.updatedAt).format('MM-DD HH:mm') : '-'}</TableCell>;
                  default: return <TableCell key={c.key}>-</TableCell>;
                }
              })}
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
          {/* 批量推进 */}
          {selectedIds.size > 0 && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<PlaylistAddCheckIcon />}
              onClick={() => setBatchDialogOpen(true)}
              size="small"
            >
              批量推进 ({selectedIds.size})
            </Button>
          )}
          {/* 列可见性 */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewColumnIcon />}
            onClick={(e) => setColMenuAnchor(e.currentTarget)}
          >
            列
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={() => exportToCSV(filteredOrders)}
            disabled={filteredOrders.length === 0}
          >
            导出 CSV
          </Button>
          <Button
            variant="contained"
            size="small"
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
            placeholder="搜索客户名称、PO号或SKU…"
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
              onChange={(e) => updateStatusFilter(e.target.value)}
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

      {/* 鼠标悬停产品照片预览：跟随鼠标，浮在光标左上角（不挡表格内容） */}
      {hoveredRow && (() => {
        const hoverOrder = orders.find((o) => o.id === hoveredRow.orderId);
        if (!hoverOrder || !hoverOrder.productPhoto) return null;
        // 照片 + 标签区域总尺寸约 180×220；左上偏移 16px；与视口边缘最小 8px
        const PHOTO_W = 180;
        const PHOTO_H = 220;
        const OFFSET = 16;
        const left = Math.max(8, mousePos.x - PHOTO_W - OFFSET);
        const top = Math.max(8, mousePos.y - PHOTO_H - OFFSET);
        return (
          <Box
            sx={{
              position: 'fixed',
              left,
              top,
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
                style={{ width: PHOTO_W, height: PHOTO_W, objectFit: 'cover', display: 'block' }}
              />
              <Box sx={{ px: 1.5, py: 1, maxWidth: PHOTO_W }}>
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

      {/* 批量推进 Dialog */}
      <Dialog
        open={batchDialogOpen}
        onClose={() => { setBatchDialogOpen(false); setBatchTargetStatus(''); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>批量推进 {selectedIds.size} 个订单</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            选择目标状态（只会推进那些当前允许切换到该状态的订单）：
          </Typography>
          {batchAvailableStatuses.length === 0 ? (
            <Alert severity="warning">所选订单没有共同可推进的状态</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {batchAvailableStatuses.map((s) => (
                <Button
                  key={s}
                  variant={batchTargetStatus === s ? 'contained' : 'outlined'}
                  color="primary"
                  onClick={() => setBatchTargetStatus(s)}
                  fullWidth
                >
                  推进至「{s}」
                </Button>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setBatchDialogOpen(false); setBatchTargetStatus(''); }}>取消</Button>
          <Button
            variant="contained"
            onClick={handleBatchAdvance}
            disabled={!batchTargetStatus}
          >
            确认推进
          </Button>
        </DialogActions>
      </Dialog>

      {/* 列可见性切换 Menu */}
      <Menu
        anchorEl={colMenuAnchor}
        open={Boolean(colMenuAnchor)}
        onClose={() => setColMenuAnchor(null)}
      >
        {ALL_COLUMNS.map((c) => (
          <MenuItem key={c.key} onClick={() => handleToggleCol(c.key)} dense>
            <Checkbox
              size="small"
              checked={visibleCols[c.key]}
              sx={{ p: 0.5 }}
            />
            <Typography variant="body2">{c.label}</Typography>
          </MenuItem>
        ))}
      </Menu>

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
