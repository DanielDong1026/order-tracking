import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import dayjs from 'dayjs';
import { useOrders } from '../context/OrderContext';
import { fileToBase64, generateId } from '../utils/storage';
import { PASTE_ATTACHMENT_PREFIX } from '../data/constants';
import StatusBadge from '../components/StatusBadge';
import StatusTimeline from '../components/StatusTimeline';
import ShareLinkSection from '../components/ShareLinkSection';

/**
 * 订单详情页
 * - 全部字段展示
 * - 状态推进（按钮 + 弹窗）
 * - 状态时间线
 * - 删除订单（按钮 + 确认弹窗）
 * - 复制订单
 */
export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getOrderById, advanceStatus, canEdit, getNextStatuses, addAttachments, deleteOrder, addOrder } = useOrders();

  const order = getOrderById(id);

  // 状态推进弹窗
  const [dialogOpen, setDialogOpen] = useState(false);
  const [advanceData, setAdvanceData] = useState({
    status: '',
    date: dayjs().format('YYYY-MM-DD'),
    note: '',
    attachment: null,
  });
  const [advanceError, setAdvanceError] = useState('');
  const [advancing, setAdvancing] = useState(false);

  // 删除确认弹窗
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 删除撤销
  const [deletedOrder, setDeletedOrder] = useState(null);
  const [deleteSnackOpen, setDeleteSnackOpen] = useState(false);

  const fileRef = useRef(null);

  /**
   * 处理粘贴图片归档
   * 将 File[] → Base64[] → AttachmentObject[]，追加到指定节点的附件列表
   */
  const handlePasteImages = useCallback(async (nodeName, files) => {
    if (!order) return;
    const newAttachments = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const base64 = await fileToBase64(files[i]);
        const timestamp = dayjs().format('YYYYMMDD_HHmmss');
        const seq = files.length > 1 ? `_${i + 1}` : '';
        newAttachments.push({
          id: generateId(),
          name: `${PASTE_ATTACHMENT_PREFIX}_${timestamp}${seq}.png`,
          data: base64,
          type: files[i].type,
        });
      } catch (err) {
        console.error('粘贴图片处理失败:', err);
      }
    }
    if (newAttachments.length > 0) {
      addAttachments(order.id, nodeName, newAttachments);
    }
  }, [order?.id, addAttachments]);

  /** 执行删除订单（可撤销） */
  const handleDeleteConfirm = () => {
    if (!order) return;
    setDeletedOrder({ ...order }); // 备份订单
    deleteOrder(order.id);
    setDeleteDialogOpen(false);
    setDeleteSnackOpen(true);
  };

  /** 撤销删除 */
  const handleUndoDelete = () => {
    if (deletedOrder) {
      addOrder(deletedOrder);
      setDeletedOrder(null);
      setDeleteSnackOpen(false);
      navigate(`/orders/${deletedOrder.id}`, { replace: true });
    }
  };

  /** 5秒后自动确认删除 */
  useEffect(() => {
    if (!deleteSnackOpen) return;
    const timer = setTimeout(() => {
      setDeletedOrder(null);
      setDeleteSnackOpen(false);
      navigate('/orders', { replace: true });
    }, 5000);
    return () => clearTimeout(timer);
  }, [deleteSnackOpen]);

  if (!order) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          订单不存在
        </Typography>
        <Button variant="contained" onClick={() => navigate('/orders')}>
          返回订单列表
        </Button>
      </Box>
    );
  }

  const nextStatuses = getNextStatuses(order.status);
  const editable = canEdit(order);

  /** 打开推进弹窗 */
  const handleOpenDialog = () => {
    if (nextStatuses.length === 0) return;
    setAdvanceData({
      status: nextStatuses[0],
      date: dayjs().format('YYYY-MM-DD'),
      note: '',
      attachment: null,
    });
    setAdvanceError('');
    setDialogOpen(true);
  };

  /** 处理附件上传 */
  const handleAdvanceFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setAdvanceData((prev) => ({ ...prev, attachment: base64 }));
      setAdvanceError('');
    } catch (err) {
      setAdvanceError(err.message || '文件读取失败');
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  /** 执行状态推进 */
  const handleAdvance = async () => {
    if (!advanceData.status) {
      setAdvanceError('请选择目标状态');
      return;
    }
    setAdvancing(true);
    try {
      advanceStatus(
        order.id,
        advanceData.status,
        advanceData.date ? dayjs(advanceData.date).startOf('day').toISOString() : dayjs().toISOString(),
        advanceData.note,
        advanceData.attachment
      );
      setDialogOpen(false);
    } catch (err) {
      setAdvanceError(err.message || '状态推进失败');
    } finally {
      setAdvancing(false);
    }
  };

  // 字段展示定义
  const infoFields = [
    { label: '客户名称', value: order.customerName },
    { label: 'PO号', value: order.poNumber },
    { label: '产品概述', value: order.productSummary, fullWidth: true },
    { label: '数量', value: order.quantity },
    { label: '金额', value: order.amount },
    { label: '贸易术语', value: order.tradeTerm },
    { label: '起运港', value: order.portOfLoading || '-' },
    { label: '目的港', value: order.portOfDestination || '-' },
    {
      label: '预计交货日',
      value: order.estimatedDeliveryDate
        ? dayjs(order.estimatedDeliveryDate).format('YYYY-MM-DD')
        : '-',
    },
    { label: '业务员', value: order.salesperson || '-' },
    { label: '工厂名称', value: order.factoryName || '-' },
    { label: '备注', value: order.notes || '-', fullWidth: true },
    { label: '创建时间', value: dayjs(order.createdAt).format('YYYY-MM-DD HH:mm:ss') },
    { label: '最后更新', value: dayjs(order.updatedAt).format('YYYY-MM-DD HH:mm:ss') },
  ];

  return (
    <Box>
      {/* 页头 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/orders')}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight={700} sx={{ flex: 1 }}>
          订单详情
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StatusBadge status={order.status} size="medium" />
          <ShareLinkSection orderId={order.id} shareToken={order.shareToken} />
          {/* 复制订单按钮 */}
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => navigate(`/orders/new?copy=${order.id}`)}
          >
            复制订单
          </Button>
          {editable && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/orders/${order.id}/edit`)}
            >
              编辑
            </Button>
          )}
          {nextStatuses.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ArrowForwardIcon />}
              onClick={handleOpenDialog}
            >
              推进状态
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            删除订单
          </Button>
        </Box>
      </Box>

      {/* 订单基本信息 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          基本信息
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {infoFields.map((field) => (
            <Grid
              item
              xs={12}
              sm={field.fullWidth ? 12 : 6}
              key={field.label}
            >
              <Typography variant="caption" color="text.secondary">
                {field.label}
              </Typography>
              <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                {field.value}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* 标签展示 */}
        {order.tags && order.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 2 }}>
            {order.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Box>
        )}

        {/* PI 附件 */}
        {order.piAttachment && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary" gutterBottom>
              PI 附件
            </Typography>
            <Box>
              {order.piAttachment.startsWith('data:image/') ? (
                <img
                  src={order.piAttachment}
                  alt="PI 附件"
                  className="attachment-preview"
                  style={{ maxWidth: 400, maxHeight: 400 }}
                  onClick={() => window.open(order.piAttachment, '_blank')}
                />
              ) : (
                <Chip
                  label="PI 附件 (PDF)"
                  component="a"
                  href={order.piAttachment}
                  target="_blank"
                  clickable
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </>
        )}
      </Paper>

      {/* 状态时间线 */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          状态时间线
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <StatusTimeline timeline={order.timeline} currentStatus={order.status} onPasteImages={handlePasteImages} />
      </Paper>

      {/* 状态推进弹窗 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>推进订单状态</DialogTitle>
        <DialogContent>
          {advanceError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAdvanceError('')}>
              {advanceError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>目标状态</InputLabel>
              <Select
                value={advanceData.status}
                label="目标状态"
                onChange={(e) =>
                  setAdvanceData((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                {nextStatuses.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="日期"
              type="date"
              size="small"
              value={advanceData.date}
              onChange={(e) =>
                setAdvanceData((prev) => ({ ...prev, date: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              fullWidth
              label="备注"
              multiline
              rows={3}
              size="small"
              value={advanceData.note}
              onChange={(e) =>
                setAdvanceData((prev) => ({ ...prev, note: e.target.value }))
              }
            />

            <Box>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="file-input-hidden"
                onChange={handleAdvanceFile}
                id="advance-attachment-input"
              />
              <label htmlFor="advance-attachment-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  size="small"
                >
                  上传附件 (图片 / PDF，最大 5MB)
                </Button>
              </label>
              {advanceData.attachment && (
                <Chip
                  label="已上传"
                  onDelete={() =>
                    setAdvanceData((prev) => ({ ...prev, attachment: null }))
                  }
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleAdvance}
            disabled={advancing || !advanceData.status}
            startIcon={advancing ? <CircularProgress size={18} /> : undefined}
          >
            确认推进
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>确认删除？</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            此操作不可恢复！
          </Alert>
          <Typography variant="body1">
            将永久删除订单{' '}
            <Typography component="span" fontWeight={700}>
              {order.poNumber}
            </Typography>
            {' '}（{order.customerName}），此操作不可恢复。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDeleteConfirm}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除撤销 Snackbar */}
      <Snackbar
        open={deleteSnackOpen}
        autoHideDuration={5000}
        onClose={() => {}}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={`已删除订单 ${deletedOrder?.poNumber}`}
        action={
          <Button color="inherit" size="small" onClick={handleUndoDelete}>
            撤销
          </Button>
        }
      />
    </Box>
  );
}
