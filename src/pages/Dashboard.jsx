import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import BarChartIcon from '@mui/icons-material/BarChart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import dayjs from 'dayjs';
import { useOrders } from '../context/OrderContext';
import { STATUS_NODES, STATUS_COLORS } from '../data/constants';
import StatusCard from '../components/StatusCard';

/**
 * 演示数据：5 条不同状态的模拟订单，让新用户快速理解产品
 * 注意：productDesc 映射为 productSummary 以匹配系统字段
 */
const DEMO_ORDERS = [
  {
    id: 'demo-1',
    poNumber: 'PO-2024-088',
    customerName: 'ABC Trading LLC',
    productSummary: "Men's Cotton T-Shirt, 3 colors",
    quantity: 5000,
    amount: 'USD 28,500',
    tradeTerm: 'FOB',
    portOfLoading: 'Ningbo',
    portOfDestination: 'Los Angeles',
    estimatedDeliveryDate: '2024-07-15',
    salesperson: '张三',
    factoryName: '绍兴XX制衣厂',
    notes: '客户老订单，质量要求高',
    tags: ['#A客户', '#美国线'],
    status: '生产中',
    timeline: [
      { node: '已接单', date: '2024-05-10T08:00:00.000Z', note: '', attachments: [] },
      { node: '生产中', date: '2024-05-15T10:00:00.000Z', note: '面料已到厂，预计6月5日完成', attachments: [] },
    ],
    createdAt: '2024-05-10T08:00:00.000Z',
    updatedAt: '2024-05-15T10:00:00.000Z',
  },
  {
    id: 'demo-2',
    poNumber: 'PO-2024-089',
    customerName: 'Euro Fashion GmbH',
    productSummary: 'Ladies Summer Dress, 5 styles',
    quantity: 3000,
    amount: 'EUR 42,000',
    tradeTerm: 'CIF',
    portOfLoading: 'Shanghai',
    portOfDestination: 'Hamburg',
    estimatedDeliveryDate: '2024-06-20',
    salesperson: '李四',
    factoryName: '杭州XX服装厂',
    notes: '',
    tags: ['#B客户', '#欧洲线'],
    status: '验货',
    timeline: [
      { node: '已接单', date: '2024-04-20T08:00:00.000Z', note: '', attachments: [] },
      { node: '生产中', date: '2024-05-01T10:00:00.000Z', note: '5月1日已排产', attachments: [] },
      { node: '验货', date: '2024-06-10T14:00:00.000Z', note: '第三方验货通过', attachments: [] },
    ],
    createdAt: '2024-04-20T08:00:00.000Z',
    updatedAt: '2024-06-10T14:00:00.000Z',
  },
  {
    id: 'demo-3',
    poNumber: 'PO-2024-090',
    customerName: 'Tokyo Imports Ltd',
    productSummary: 'Electronic Components Kit',
    quantity: 10000,
    amount: 'USD 15,800',
    tradeTerm: 'EXW',
    portOfLoading: 'Shenzhen',
    portOfDestination: 'Tokyo',
    estimatedDeliveryDate: '2024-06-01',
    salesperson: '王五',
    factoryName: '东莞XX电子厂',
    notes: '紧急订单，已超期',
    tags: ['#C客户', '#日本线', '#急单'],
    status: '待出货',
    timeline: [
      { node: '已接单', date: '2024-05-01T08:00:00.000Z', note: '', attachments: [] },
      { node: '生产中', date: '2024-05-10T10:00:00.000Z', note: '', attachments: [] },
      { node: '验货', date: '2024-05-25T14:00:00.000Z', note: '全检通过', attachments: [] },
      { node: '待出货', date: '2024-06-15T09:00:00.000Z', note: '等拼柜，预计7月1日船期', attachments: [] },
    ],
    createdAt: '2024-05-01T08:00:00.000Z',
    updatedAt: '2024-06-15T09:00:00.000Z',
  },
  {
    id: 'demo-4',
    poNumber: 'PO-2024-091',
    customerName: 'Global Trade Co.',
    productSummary: 'Stainless Steel Kitchenware Set',
    quantity: 2000,
    amount: 'USD 35,000',
    tradeTerm: 'FOB',
    portOfLoading: 'Ningbo',
    portOfDestination: 'New York',
    estimatedDeliveryDate: '2024-05-15',
    salesperson: '张三',
    factoryName: '永康XX五金厂',
    notes: '',
    tags: ['#A客户', '#美国线'],
    status: '已出货',
    timeline: [
      { node: '已接单', date: '2024-04-01T08:00:00.000Z', note: '', attachments: [] },
      { node: '生产中', date: '2024-04-15T10:00:00.000Z', note: '', attachments: [] },
      { node: '验货', date: '2024-05-05T14:00:00.000Z', note: '验货通过', attachments: [] },
      { node: '待出货', date: '2024-05-10T09:00:00.000Z', note: '', attachments: [] },
      { node: '已出货', date: '2024-06-20T16:00:00.000Z', note: '船名：EVER GIVEN，航次：045W，ETD 6/20', attachments: [] },
    ],
    createdAt: '2024-04-01T08:00:00.000Z',
    updatedAt: '2024-06-20T16:00:00.000Z',
  },
  {
    id: 'demo-5',
    poNumber: 'PO-2024-092',
    customerName: 'Dubai General Trading',
    productSummary: 'Home Decor Items, 10 SKUs',
    quantity: 800,
    amount: 'USD 22,000',
    tradeTerm: 'CFR',
    portOfLoading: 'Guangzhou',
    portOfDestination: 'Dubai',
    estimatedDeliveryDate: '2024-04-01',
    salesperson: '赵六',
    factoryName: '义乌XX工艺品厂',
    notes: '老客户返单',
    tags: ['#D客户', '#中东线', '#老客户'],
    status: '已收款',
    timeline: [
      { node: '已接单', date: '2024-02-01T08:00:00.000Z', note: '', attachments: [] },
      { node: '生产中', date: '2024-02-20T10:00:00.000Z', note: '', attachments: [] },
      { node: '验货', date: '2024-03-15T14:00:00.000Z', note: '', attachments: [] },
      { node: '待出货', date: '2024-03-20T09:00:00.000Z', note: '', attachments: [] },
      { node: '已出货', date: '2024-04-05T16:00:00.000Z', note: 'B/L: COSCO123456', attachments: [] },
      { node: '已收款', date: '2024-05-01T10:00:00.000Z', note: '尾款到账', attachments: [] },
    ],
    createdAt: '2024-02-01T08:00:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
  },
];

/**
 * 仪表盘页面
 * - 各状态数量卡片
 * - 已出货未收款红色预警
 * - 最近 5 条更新
 * - 空状态时显示"加载演示数据"按钮
 */
export default function Dashboard() {
  const { orders, importOrders } = useOrders();
  const navigate = useNavigate();

  // 周报相关 state
  const [reportOpen, setReportOpen] = useState(false);
  const [dateRange, setDateRange] = useState('week'); // 'week' | 'month' | 'custom'
  const [customStart, setCustomStart] = useState(dayjs().startOf('week').format('YYYY-MM-DD'));
  const [customEnd, setCustomEnd] = useState(dayjs().format('YYYY-MM-DD'));
  const [copied, setCopied] = useState(false);

  // 演示数据加载
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSnackbar, setDemoSnackbar] = useState({ open: false, message: '', severity: 'success' });

  /** 根据当前选择返回时间范围的起止 dayjs 对象 */
  const getDateRange = () => {
    const today = dayjs();
    if (dateRange === 'week') return { start: today.startOf('week'), end: today.endOf('week') };
    if (dateRange === 'month') return { start: today.startOf('month'), end: today };
    return { start: dayjs(customStart), end: dayjs(customEnd) };
  };

  /** 生成周报统计数据 */
  const generateReport = () => {
    const { start, end } = getDateRange();
    const startStr = start.format('YYYY-MM-DD');
    const endStr = end.format('YYYY-MM-DD');

    let newCount = 0;
    let newAmount = 0;
    let shippedCount = 0;
    let paidCount = 0;
    let paidAmount = 0;

    orders.forEach((order) => {
      // 新接订单：createdAt 在范围内
      if (order.createdAt) {
        const d = dayjs(order.createdAt);
        if (d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'))) {
          newCount++;
          const amt = parseFloat(order.amount?.replace(/[^0-9.]/g, '') || 0);
          newAmount += amt;
        }
      }

      // 出货：timeline 中「已出货」节点日期在范围内
      const shipped = order.timeline?.find((t) => t.node === '已出货');
      if (shipped?.date) {
        const d = dayjs(shipped.date);
        if (d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'))) {
          shippedCount++;
        }
      }

      // 收款：timeline 中「已收款」节点日期在范围内
      const paid = order.timeline?.find((t) => t.node === '已收款');
      if (paid?.date) {
        const d = dayjs(paid.date);
        if (d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'))) {
          paidCount++;
          const amt = parseFloat(order.amount?.replace(/[^0-9.]/g, '') || 0);
          paidAmount += amt;
        }
      }
    });

    // 快照指标（不限时间）
    const inProduction = orders.filter((o) => o.status === '生产中').length;
    const unpaid = orders.filter((o) => o.status === '已出货').length;

    return { startStr, endStr, newCount, newAmount, shippedCount, paidCount, paidAmount, inProduction, unpaid };
  };

  /** 金额格式化 */
  const formatAmount = (v) =>
    '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /** 报表文本 */
  const getReportText = (r) =>
    `📋 跟单周报（${r.startStr} ~ ${r.endStr}）

📦 新接订单：${r.newCount} 单，合计 ${formatAmount(r.newAmount)}
🚢 出货订单：${r.shippedCount} 单
💰 收款订单：${r.paidCount} 单，合计 ${formatAmount(r.paidAmount)}
🏭 当前卡在生产中：${r.inProduction} 单
⚠️  已出货未收款：${r.unpaid} 单`;

  /** CSV 导出 */
  const exportCSV = (r) => {
    const csv = [
      '指标,数值',
      `新接订单（单）,${r.newCount}`,
      `新接订单金额（USD）,${r.newAmount.toFixed(2)}`,
      `出货订单（单）,${r.shippedCount}`,
      `收款订单（单）,${r.paidCount}`,
      `收款订单金额（USD）,${r.paidAmount.toFixed(2)}`,
      `当前卡在生产中（单）,${r.inProduction}`,
      `已出货未收款（单）,${r.unpaid}`,
      `统计时间,${r.startStr} ~ ${r.endStr}`,
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `周报_${r.startStr}_${r.endStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 加载演示数据 */
  const handleLoadDemo = () => {
    setDemoLoading(true);
    try {
      const result = importOrders(DEMO_ORDERS, 'merge');
      setDemoSnackbar({
        open: true,
        message: `已加载 ${result.added} 条演示数据`,
        severity: 'success',
      });
    } catch (err) {
      setDemoSnackbar({
        open: true,
        message: '加载演示数据失败：' + (err.message || '未知错误'),
        severity: 'error',
      });
    } finally {
      setDemoLoading(false);
    }
  };

  // 周报数据缓存（依赖 orders 和时间选择）
  const report = useMemo(() => generateReport(), [orders, dateRange, customStart, customEnd]);

  // 按状态分组统计
  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_NODES.forEach((s) => {
      counts[s] = 0;
    });
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return counts;
  }, [orders]);

  // 已出货未收款：状态为「已出货」但未「已收款」的订单
  const shippedUnpaid = useMemo(
    () => orders.filter((o) => o.status === '已出货'),
    [orders]
  );

  // 最近 5 条时间线更新
  const recentUpdates = useMemo(() => {
    const allUpdates = [];
    orders.forEach((o) => {
      o.timeline.forEach((t) => {
        allUpdates.push({
          orderId: o.id,
          customerName: o.customerName,
          poNumber: o.poNumber,
          node: t.node,
          date: t.date,
          note: t.note,
        });
      });
    });
    allUpdates.sort((a, b) => new Date(b.date) - new Date(a.date));
    return allUpdates.slice(0, 5);
  }, [orders]);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        仪表盘
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="body1" color="text.secondary">
          共 {orders.length} 个订单
        </Typography>
        <Button
          variant="outlined"
          startIcon={<BarChartIcon />}
          onClick={() => setReportOpen(true)}
        >
          生成周报
        </Button>
      </Box>

      {/* 空状态：加载演示数据引导 */}
      {orders.length === 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            mb: 3,
            textAlign: 'center',
            bgcolor: '#f0f7ff',
            borderColor: '#90caf9',
          }}
        >
          <Typography variant="h6" gutterBottom color="primary">
            欢迎使用外贸跟单系统！
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            看起来还没有任何订单，加载演示数据可以帮你快速了解系统功能。
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<PlaylistAddIcon />}
            onClick={handleLoadDemo}
            disabled={demoLoading}
          >
            📋 加载演示数据
          </Button>
          {demoLoading && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              正在加载...
            </Typography>
          )}
        </Paper>
      )}

      {/* 状态卡片网格 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {STATUS_NODES.map((status) => (
          <Grid item xs={6} sm={4} md={2} key={status}>
            <StatusCard status={status} count={statusCounts[status]} />
          </Grid>
        ))}
      </Grid>

      {/* 已出货未收款预警 */}
      {shippedUnpaid.length > 0 && (
        <Alert
          severity="error"
          variant="outlined"
          sx={{ mb: 3 }}
          action={
            <Box
              component="span"
              sx={{ cursor: 'pointer', textDecoration: 'underline', fontSize: '0.875rem' }}
              onClick={() => navigate('/orders')}
            >
              查看详情
            </Box>
          }
        >
          <AlertTitle>已出货未收款预警</AlertTitle>
          有 {shippedUnpaid.length} 个订单已出货但尚未收款：
          {shippedUnpaid.map((o) => (
            <span
              key={o.id}
              style={{ cursor: 'pointer', textDecoration: 'underline', marginLeft: 4 }}
              onClick={() => navigate(`/orders/${o.id}`)}
            >
              {o.poNumber}({o.customerName})
            </span>
          ))}
        </Alert>
      )}

      {/* 最近更新 */}
      <Paper variant="outlined">
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            最近更新
          </Typography>
        </Box>
        <Divider />
        {recentUpdates.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">暂无数据，去创建第一个订单吧</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {recentUpdates.map((update, idx) => (
              <React.Fragment key={`${update.orderId}-${update.node}-${idx}`}>
                <ListItemButton
                  onClick={() => navigate(`/orders/${update.orderId}`)}
                  sx={{ py: 1.5 }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: STATUS_COLORS[update.node] || '#757575',
                        width: 36,
                        height: 36,
                        fontSize: '0.75rem',
                      }}
                    >
                      {update.node.charAt(0)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight={500}>
                        {update.customerName} — {update.poNumber}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {update.node} · {update.note || '无备注'} ·{' '}
                        {dayjs(update.date).format('MM-DD HH:mm')}
                      </Typography>
                    }
                  />
                </ListItemButton>
                {idx < recentUpdates.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* 周报生成 Dialog */}
      <Dialog
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setCopied(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>📊 生成周报</DialogTitle>
        <DialogContent>
          {/* 时间范围选择 */}
          <RadioGroup
            row
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="week" control={<Radio />} label="本周" />
            <FormControlLabel value="month" control={<Radio />} label="本月" />
            <FormControlLabel value="custom" control={<Radio />} label="自定义" />
          </RadioGroup>

          {/* 自定义日期选择器 */}
          {dateRange === 'custom' && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                type="date"
                label="起始"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <TextField
                type="date"
                label="结束"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* 报表文本 */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              fontSize: 14,
            }}
          >
            {getReportText(report)}
            {report.unpaid > 0 && (
              <Box
                component="span"
                sx={{ color: 'error.main', fontWeight: 'bold' }}
              >
                {'  ⚡ 请尽快跟进收款！'}
              </Box>
            )}
          </Paper>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            startIcon={<ContentCopyIcon />}
            variant="contained"
            onClick={() => {
              navigator.clipboard.writeText(getReportText(report));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? '✓ 已复制' : '一键复制'}
          </Button>
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            onClick={() => exportCSV(report)}
          >
            导出 CSV
          </Button>
        </DialogActions>
      </Dialog>

      {/* 演示数据加载结果提示 */}
      <Snackbar
        open={demoSnackbar.open}
        autoHideDuration={3000}
        onClose={() => setDemoSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setDemoSnackbar((prev) => ({ ...prev, open: false }))}
          severity={demoSnackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {demoSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
