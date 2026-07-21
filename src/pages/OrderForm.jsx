import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Autocomplete from '@mui/material/Autocomplete';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import { useOrders } from '../context/OrderContext';
import { useCustomers } from '../context/CustomerContext';
import { useFactories } from '../context/FactoryContext';
import { TRADE_TERMS, DEFAULT_ORDER_FORM } from '../data/constants';
import { fileToBase64 } from '../utils/storage';
import useAllTags from '../hooks/useAllTags';

/**
 * 订单表单页面（新建 + 编辑 + 复制共用）
 * - 14 个字段
 * - PI 附件 Base64 存储（限制 5MB）
 * - 编辑模式：预填数据，已出货/已收款禁止编辑
 * - 复制模式：通过 ?copy=orderId 预填除 PO 号外的所有字段
 */
export default function OrderForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const copyId = searchParams.get('copy');
  const { addOrder, updateOrder, getOrderById, canEdit, orders } = useOrders();
  const { customers } = useCustomers();
  const { factories } = useFactories();

  const allTags = useAllTags(orders);
  const tagOptions = useMemo(() => allTags.map((t) => t.tag), [allTags]);

  const fileInputRef = useRef(null);
  const productPhotoInputRef = useRef(null);

  const [form, setForm] = useState(DEFAULT_ORDER_FORM);
  const [piPreview, setPiPreview] = useState(null); // 附件预览 URL
  const [productPhotoPreview, setProductPhotoPreview] = useState(null); // 产品照片预览 URL
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // 编辑模式：加载已有数据
  useEffect(() => {
    if (isEdit && id) {
      const order = getOrderById(id);
      if (!order) {
        navigate('/orders', { replace: true });
        return;
      }
      if (!canEdit(order)) {
        // 已出货/已收款订单不可编辑，跳转到详情页
        navigate(`/orders/${id}`, { replace: true });
        return;
      }
      setForm({
        customerName: order.customerName || '',
        poNumber: order.poNumber || '',
        sku: order.sku || '',
        productSummary: order.productSummary || '',
        quantity: order.quantity ?? '',
        amount: order.amount || '',
        tradeTerm: order.tradeTerm || '',
        portOfLoading: order.portOfLoading || '',
        portOfDestination: order.portOfDestination || '',
        estimatedDeliveryDate: order.estimatedDeliveryDate
          ? order.estimatedDeliveryDate.slice(0, 10)
          : '',
        salesperson: order.salesperson || '',
        factoryName: order.factoryName || '',
        notes: order.notes || '',
        piAttachment: order.piAttachment || null,
        productPhoto: order.productPhoto || null,
        tags: order.tags || [],
      });
      if (order.piAttachment) {
        setPiPreview(order.piAttachment);
      }
      if (order.productPhoto) {
        setProductPhotoPreview(order.productPhoto);
      }
    }
  }, [id, isEdit, getOrderById, canEdit, navigate]);

  // 复制模式：预填除 PO 号外的所有字段
  useEffect(() => {
    if (copyId && !isEdit) {
      const sourceOrder = getOrderById(copyId);
      if (sourceOrder) {
        setForm({
          customerName: sourceOrder.customerName || '',
          poNumber: '', // 核心：PO 号留空让用户自己填
          sku: sourceOrder.sku || '',
          productSummary: sourceOrder.productSummary || '',
          quantity: sourceOrder.quantity ?? '',
          amount: sourceOrder.amount || '',
          tradeTerm: sourceOrder.tradeTerm || '',
          portOfLoading: sourceOrder.portOfLoading || '',
          portOfDestination: sourceOrder.portOfDestination || '',
          estimatedDeliveryDate: sourceOrder.estimatedDeliveryDate
            ? sourceOrder.estimatedDeliveryDate.slice(0, 10)
            : '',
          salesperson: sourceOrder.salesperson || '',
          factoryName: sourceOrder.factoryName || '',
          notes: sourceOrder.notes || '',
          piAttachment: sourceOrder.piAttachment || null,
          productPhoto: sourceOrder.productPhoto || null,
          tags: sourceOrder.tags || [],
        });
        if (sourceOrder.piAttachment) {
          setPiPreview(sourceOrder.piAttachment);
        }
        if (sourceOrder.productPhoto) {
          setProductPhotoPreview(sourceOrder.productPhoto);
        }
      }
    }
  }, [copyId, isEdit, getOrderById]);

  /** 更新表单字段 */
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    // 清除该字段错误
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  /** 处理 PI 附件上传 */
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setForm((prev) => ({ ...prev, piAttachment: base64 }));
      setPiPreview(base64);
      setSubmitError('');
    } catch (err) {
      setSubmitError(err.message || '文件读取失败');
    }

    // 重置 input，允许重复选同一个文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /** 移除附件 */
  const handleRemoveAttachment = () => {
    setForm((prev) => ({ ...prev, piAttachment: null }));
    setPiPreview(null);
  };

  /** 处理产品照片上传（仅图片） */
  const handleProductPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSubmitError('产品照片只支持图片格式');
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setForm((prev) => ({ ...prev, productPhoto: base64 }));
      setProductPhotoPreview(base64);
      setSubmitError('');
    } catch (err) {
      setSubmitError(err.message || '产品照片读取失败');
    }

    if (productPhotoInputRef.current) {
      productPhotoInputRef.current.value = '';
    }
  };

  /** 移除产品照片 */
  const handleRemoveProductPhoto = () => {
    setForm((prev) => ({ ...prev, productPhoto: null }));
    setProductPhotoPreview(null);
  };

  /** 表单验证 */
  const validate = () => {
    const newErrors = {};
    if (!form.customerName.trim()) newErrors.customerName = '请输入客户名称';
    if (!form.poNumber.trim()) newErrors.poNumber = '请输入PO号';
    if (!form.productSummary.trim()) newErrors.productSummary = '请输入产品概述';
    if (form.quantity === '' || form.quantity === null) {
      newErrors.quantity = '请输入数量';
    } else if (isNaN(Number(form.quantity)) || Number(form.quantity) <= 0) {
      newErrors.quantity = '请输入有效数量';
    }
    if (!form.amount.trim()) newErrors.amount = '请输入金额';
    if (!form.tradeTerm.trim()) newErrors.tradeTerm = '请选择或输入贸易术语';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** 提交表单 */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const orderData = {
        ...form,
        quantity: Number(form.quantity) || 0,
        estimatedDeliveryDate: form.estimatedDeliveryDate || '',
        piAttachment: form.piAttachment || null,
      };

      if (isEdit) {
        updateOrder(id, orderData);
      } else {
        addOrder(orderData);
      }

      navigate(isEdit ? `/orders/${id}` : '/orders');
    } catch (err) {
      setSubmitError(err.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  /** 页面标题 */
  const pageTitle = copyId ? '复制订单' : isEdit ? '编辑订单' : '新建订单';

  return (
    <Box>
      {/* 页头 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 3,
        }}
      >
        <IconButton onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/orders'))}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight={700}>
          {pageTitle}
        </Typography>
      </Box>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
          {submitError}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* 第一组：基本信息 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            基本信息
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Autocomplete
                freeSolo
                size="small"
                options={customers}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name || '')}
                isOptionEqualToValue={(opt, val) =>
                  (typeof opt === 'string' ? opt : opt.name) ===
                  (typeof val === 'string' ? val : val?.name)
                }
                value={form.customerName}
                onChange={(_, v) => {
                  // 选项或自由输入：只保留 name 字符串
                  const name = typeof v === 'string' ? v : v?.name || '';
                  setForm((prev) => ({ ...prev, customerName: name }));
                  if (errors.customerName) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.customerName;
                      return next;
                    });
                  }
                }}
                onInputChange={(_, v) => {
                  setForm((prev) => ({ ...prev, customerName: v || '' }));
                  if (errors.customerName) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.customerName;
                      return next;
                    });
                  }
                }}
                renderOption={(props, opt) => (
                  <li {...props} key={opt.id}>
                    <Box>
                      <Typography variant="body2">{opt.name}</Typography>
                      {(opt.contactPerson || opt.phone) && (
                        <Typography variant="caption" color="text.secondary">
                          {[opt.contactPerson, opt.phone].filter(Boolean).join(' · ')}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="客户名称"
                    error={Boolean(errors.customerName)}
                    helperText={
                      errors.customerName ||
                      (customers.length === 0
                        ? '暂无客户，请先到"客户管理"页面添加'
                        : '可输入新名称或选择已有客户')
                    }
                    placeholder="如 ABC Trading LLC"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="PO号"
                value={form.poNumber}
                onChange={handleChange('poNumber')}
                error={Boolean(errors.poNumber)}
                helperText={errors.poNumber}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="SKU"
                value={form.sku}
                onChange={handleChange('sku')}
                size="small"
                placeholder="如 SKU-001"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="产品概述"
                value={form.productSummary}
                onChange={handleChange('productSummary')}
                error={Boolean(errors.productSummary)}
                helperText={errors.productSummary}
                multiline
                rows={2}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="数量"
                type="number"
                value={form.quantity}
                onChange={handleChange('quantity')}
                error={Boolean(errors.quantity)}
                helperText={errors.quantity}
                size="small"
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                label="金额"
                placeholder="如 USD 12,500"
                value={form.amount}
                onChange={handleChange('amount')}
                error={Boolean(errors.amount)}
                helperText={errors.amount}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Autocomplete
                freeSolo
                size="small"
                options={TRADE_TERMS}
                value={form.tradeTerm}
                onChange={(_, v) => setForm((prev) => ({ ...prev, tradeTerm: v || '' }))}
                onInputChange={(_, v) => setForm((prev) => ({ ...prev, tradeTerm: v }))}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="贸易术语"
                    error={Boolean(errors.tradeTerm)}
                    helperText={errors.tradeTerm}
                  />
                )}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* 第二组：物流信息 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            物流信息
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="起运港"
                value={form.portOfLoading}
                onChange={handleChange('portOfLoading')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="目的港"
                value={form.portOfDestination}
                onChange={handleChange('portOfDestination')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="预计交货日"
                type="date"
                value={form.estimatedDeliveryDate}
                onChange={handleChange('estimatedDeliveryDate')}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* 第三组：其他信息 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            其他信息
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="业务员"
                value={form.salesperson}
                onChange={handleChange('salesperson')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                size="small"
                options={factories}
                getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.name || '')}
                isOptionEqualToValue={(opt, val) =>
                  (typeof opt === 'string' ? opt : opt.name) ===
                  (typeof val === 'string' ? val : val?.name)
                }
                value={form.factoryName}
                onChange={(_, v) => {
                  const name = typeof v === 'string' ? v : v?.name || '';
                  setForm((prev) => ({ ...prev, factoryName: name }));
                }}
                onInputChange={(_, v) => {
                  setForm((prev) => ({ ...prev, factoryName: v || '' }));
                }}
                renderOption={(props, opt) => (
                  <li {...props} key={opt.id}>
                    <Box>
                      <Typography variant="body2">{opt.name}</Typography>
                      {(opt.contactPerson || opt.phone) && (
                        <Typography variant="caption" color="text.secondary">
                          {[opt.contactPerson, opt.phone].filter(Boolean).join(' · ')}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="工厂名称"
                    placeholder="如 绍兴XX制衣厂"
                    helperText={factories.length === 0 ? '暂无工厂，请先到"工厂管理"页面添加' : '可输入新名称或选择已有工厂'}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="备注"
                value={form.notes}
                onChange={handleChange('notes')}
                multiline
                rows={3}
                size="small"
              />
            </Grid>
          </Grid>

          <Divider sx={{ mb: 3 }} />

          {/* 标签 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            🏷️ 标签
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Autocomplete
              multiple
              freeSolo
              size="small"
              options={tagOptions}
              value={form.tags || []}
              onChange={(e, newValue) => {
                // 大小写不敏感规范化：若输入值匹配已有标签（忽略大小写），则使用已有标签的原始写法
                const normalized = newValue.map((v) => {
                  const trimmed = typeof v === 'string' ? v.trim() : (v?.tag || '').trim();
                  if (!trimmed) return '';
                  const existing = allTags.find(
                    (at) => at.tag.toLowerCase() === trimmed.toLowerCase()
                  );
                  return existing ? existing.tag : trimmed;
                }).filter(Boolean);
                setForm({ ...form, tags: normalized });
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={index}
                    label={option}
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="标签"
                  placeholder="输入标签，回车添加"
                  helperText="回车或逗号分隔，已有标签自动建议"
                />
              )}
              noOptionsText="暂无已有标签"
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* 第四组：产品照片（单张图片，与 PI 附件独立） */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            产品照片
          </Typography>
          <Box sx={{ mb: 3 }}>
            <input
              ref={productPhotoInputRef}
              type="file"
              accept="image/*"
              className="file-input-hidden"
              onChange={handleProductPhotoChange}
              id="product-photo-input"
            />
            <label htmlFor="product-photo-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                size="small"
              >
                上传产品照片（仅图片，最大 5MB）
              </Button>
            </label>
          </Box>

          {productPhotoPreview && (
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
              <img
                src={productPhotoPreview}
                alt="产品照片预览"
                className="attachment-preview"
                style={{ maxWidth: 300, maxHeight: 300 }}
              />
              <IconButton
                size="small"
                onClick={handleRemoveProductPhoto}
                sx={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  bgcolor: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <Divider sx={{ mb: 3 }} />

          {/* 第五组：PI 附件 */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            PI 附件
          </Typography>
          <Box sx={{ mb: 2 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="file-input-hidden"
              onChange={handleFileChange}
              id="pi-attachment-input"
            />
            <label htmlFor="pi-attachment-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUploadIcon />}
                size="small"
              >
                上传附件 (图片 / PDF，最大 5MB)
              </Button>
            </label>
          </Box>

          {piPreview && (
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              {piPreview.startsWith('data:image/') ? (
                <img
                  src={piPreview}
                  alt="PI 附件预览"
                  className="attachment-preview"
                  style={{ maxWidth: 300, maxHeight: 300 }}
                />
              ) : (
                <Chip
                  label="已上传 PDF 文件"
                  onDelete={handleRemoveAttachment}
                  color="primary"
                  variant="outlined"
                />
              )}
              {piPreview.startsWith('data:image/') && (
                <IconButton
                  size="small"
                  onClick={handleRemoveAttachment}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: '#fff',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          )}

          {/* 提交按钮 */}
          <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/orders'))}>
              取消
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              disabled={loading}
            >
              {isEdit ? '保存修改' : '创建订单'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
