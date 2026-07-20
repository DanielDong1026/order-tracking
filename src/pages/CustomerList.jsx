import React, { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import { useCustomers } from '../context/CustomerContext';
import { useOrders } from '../context/OrderContext';
import { DEFAULT_CUSTOMER } from '../data/constants';

/**
 * 客户管理页面
 * - 客户列表（搜索 + 增删改查）
 * - 客户表单弹窗（新增/编辑共用）
 * - 删除前检查：若客户有关联订单，弹警告
 */
export default function CustomerList() {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const { orders } = useOrders();

  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null); // null=新增; obj=编辑
  const [form, setForm] = useState(DEFAULT_CUSTOMER);
  const [formErrors, setFormErrors] = useState({});
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });

  /** 筛选 */
  const filtered = useMemo(() => {
    if (!keyword.trim()) return customers;
    const kw = keyword.trim().toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(kw) ||
        (c.contactPerson || '').toLowerCase().includes(kw) ||
        (c.phone || '').toLowerCase().includes(kw) ||
        (c.email || '').toLowerCase().includes(kw)
    );
  }, [customers, keyword]);

  /** 统计每个客户的关联订单数（按 customerName 模糊匹配） */
  const orderCountByName = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const key = (o.customerName || '').trim().toLowerCase();
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [orders]);

  /** 打开新增弹窗 */
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setForm(DEFAULT_CUSTOMER);
    setFormErrors({});
    setFormOpen(true);
  };

  /** 打开编辑弹窗 */
  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name || '',
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setFormErrors({});
    setFormOpen(true);
  };

  /** 关闭弹窗 */
  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingCustomer(null);
    setForm(DEFAULT_CUSTOMER);
    setFormErrors({});
  };

  /** 表单字段更新 */
  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  /** 校验 */
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '客户名称不能为空';
    // 唯一性校验（不区分大小写）
    if (form.name.trim()) {
      const exists = customers.some(
        (c) =>
          c.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
          (!editingCustomer || c.id !== editingCustomer.id)
      );
      if (exists) errs.name = '已存在同名客户';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = '邮箱格式不正确';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /** 提交表单 */
  const handleSubmit = () => {
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    };
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, payload);
      setSnack({ open: true, severity: 'success', message: `已更新客户「${payload.name}」` });
    } else {
      addCustomer(payload);
      setSnack({ open: true, severity: 'success', message: `已创建客户「${payload.name}」` });
    }
    handleCloseForm();
  };

  /** 删除客户 */
  const handleDelete = () => {
    if (!deleteCandidate) return;
    const name = deleteCandidate.name;
    deleteCustomer(deleteCandidate.id);
    setDeleteCandidate(null);
    setSnack({ open: true, severity: 'success', message: `已删除客户「${name}」` });
  };

  return (
    <Box>
      {/* 标题 + 新建按钮 */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PeopleIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight={700}>
            客户管理
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
        >
          新建客户
        </Button>
      </Box>

      {/* 搜索栏 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="搜索客户名称、联系人、电话或邮箱…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
      </Paper>

      {/* 客户列表 */}
      {filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="h6" gutterBottom>
            {customers.length === 0 ? '还没有客户' : '没有匹配的客户'}
          </Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
            {customers.length === 0
              ? '点击右上角"新建客户"按钮添加第一个客户'
              : '请调整搜索条件'}
          </Typography>
          {customers.length === 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>
              立即新建
            </Button>
          )}
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 700 }}>客户名称</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>联系人</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>电话</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>邮箱</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  关联订单
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  操作
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((c) => {
                const orderCount = orderCountByName[c.name.trim().toLowerCase()] || 0;
                return (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {c.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{c.contactPerson || '-'}</TableCell>
                    <TableCell>{c.phone || '-'}</TableCell>
                    <TableCell>{c.email || '-'}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        color={orderCount > 0 ? 'primary' : 'text.disabled'}
                        fontWeight={orderCount > 0 ? 600 : 400}
                      >
                        {orderCount}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="编辑">
                        <IconButton size="small" onClick={() => handleOpenEdit(c)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteCandidate(c)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        共 {customers.length} 位客户 · 显示 {filtered.length} 条 · 关联订单按客户名称模糊匹配统计
      </Typography>

      {/* 新增/编辑表单 Dialog */}
      <Dialog
        open={formOpen}
        onClose={handleCloseForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingCustomer ? '编辑客户' : '新建客户'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="客户名称"
                value={form.name}
                onChange={handleChange('name')}
                error={Boolean(formErrors.name)}
                helperText={formErrors.name}
                size="small"
                autoFocus
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="联系人"
                value={form.contactPerson}
                onChange={handleChange('contactPerson')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="电话"
                value={form.phone}
                onChange={handleChange('phone')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="邮箱"
                value={form.email}
                onChange={handleChange('email')}
                error={Boolean(formErrors.email)}
                helperText={formErrors.email}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="地址"
                value={form.address}
                onChange={handleChange('address')}
                size="small"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="备注"
                value={form.notes}
                onChange={handleChange('notes')}
                size="small"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>取消</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingCustomer ? '保存' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 Dialog */}
      <Dialog open={Boolean(deleteCandidate)} onClose={() => setDeleteCandidate(null)} maxWidth="xs" fullWidth>
        <DialogTitle>确认删除客户？</DialogTitle>
        <DialogContent>
          {deleteCandidate && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>
                将永久删除客户「{deleteCandidate.name}」！
              </Alert>
              {(orderCountByName[deleteCandidate.name.trim().toLowerCase()] || 0) > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  该客户名下有{' '}
                  <Typography component="span" fontWeight={700}>
                    {orderCountByName[deleteCandidate.name.trim().toLowerCase()]}
                  </Typography>{' '}
                  个关联订单。删除后，订单的"客户名称"字段不会自动更新（仍保留原名字文本）。
                </Alert>
              )}
              <Typography variant="body2">此操作不可恢复！</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCandidate(null)}>取消</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            确认删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* 操作反馈 */}
      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
