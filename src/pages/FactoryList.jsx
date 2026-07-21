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
import FactoryIcon from '@mui/icons-material/Factory';
import { useFactories } from '../context/FactoryContext';
import { useOrders } from '../context/OrderContext';
import { DEFAULT_FACTORY } from '../data/constants';

/**
 * 工厂管理页面
 * - 工厂列表（搜索 + 增删改查）
 * - 表单弹窗（新增/编辑共用）
 */
export default function FactoryList() {
  const { factories, addFactory, updateFactory, deleteFactory } = useFactories();
  const { orders } = useOrders();

  const [keyword, setKeyword] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FACTORY);
  const [formErrors, setFormErrors] = useState({});
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [snack, setSnack] = useState({ open: false, severity: 'success', message: '' });

  const filtered = useMemo(() => {
    if (!keyword.trim()) return factories;
    const kw = keyword.trim().toLowerCase();
    return factories.filter(
      (f) =>
        f.name.toLowerCase().includes(kw) ||
        (f.contactPerson || '').toLowerCase().includes(kw) ||
        (f.phone || '').toLowerCase().includes(kw)
    );
  }, [factories, keyword]);

  const orderCountByName = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const key = (o.factoryName || '').trim().toLowerCase();
      if (key) map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [orders]);

  const handleOpenAdd = () => { setEditing(null); setForm(DEFAULT_FACTORY); setFormErrors({}); setFormOpen(true); };
  const handleOpenEdit = (f) => {
    setEditing(f);
    setForm({ name: f.name || '', contactPerson: f.contactPerson || '', phone: f.phone || '', email: f.email || '', address: f.address || '', notes: f.notes || '' });
    setFormErrors({});
    setFormOpen(true);
  };
  const handleCloseForm = () => { setFormOpen(false); setEditing(null); setForm(DEFAULT_FACTORY); setFormErrors({}); };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (formErrors[field]) setFormErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = '工厂名称不能为空';
    if (form.name.trim()) {
      const exists = factories.some((f) => f.name.toLowerCase().trim() === form.name.toLowerCase().trim() && (!editing || f.id !== editing.id));
      if (exists) errs.name = '已存在同名工厂';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = '邮箱格式不正确';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const payload = { name: form.name.trim(), contactPerson: form.contactPerson.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), notes: form.notes.trim() };
    if (editing) { updateFactory(editing.id, payload); setSnack({ open: true, severity: 'success', message: `已更新工厂「${payload.name}」` }); }
    else { addFactory(payload); setSnack({ open: true, severity: 'success', message: `已创建工厂「${payload.name}」` }); }
    handleCloseForm();
  };

  const handleDelete = () => {
    if (!deleteCandidate) return;
    const name = deleteCandidate.name;
    deleteFactory(deleteCandidate.id);
    setDeleteCandidate(null);
    setSnack({ open: true, severity: 'success', message: `已删除工厂「${name}」` });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FactoryIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight={700}>工厂管理</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>新建工厂</Button>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField size="small" fullWidth placeholder="搜索工厂名称、联系人或电话…" value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }} />
      </Paper>

      {filtered.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="h6" gutterBottom>{factories.length === 0 ? '还没有工厂' : '没有匹配的工厂'}</Typography>
          <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>{factories.length === 0 ? '点击右上角"新建工厂"按钮添加' : '请调整搜索条件'}</Typography>
          {factories.length === 0 && <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAdd}>立即新建</Button>}
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 700 }}>工厂名称</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>联系人</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>电话</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>地址</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">关联订单</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">操作</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {filtered.map((f) => {
                const oc = orderCountByName[f.name.trim().toLowerCase()] || 0;
                return (
                  <TableRow key={f.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={500}>{f.name}</Typography></TableCell>
                    <TableCell>{f.contactPerson || '-'}</TableCell>
                    <TableCell>{f.phone || '-'}</TableCell>
                    <TableCell><Typography variant="body2" sx={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.address || '-'}</Typography></TableCell>
                    <TableCell align="center"><Typography variant="body2" color={oc > 0 ? 'primary' : 'text.disabled'} fontWeight={oc > 0 ? 600 : 400}>{oc}</Typography></TableCell>
                    <TableCell align="center">
                      <Tooltip title="编辑"><IconButton size="small" onClick={() => handleOpenEdit(f)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="删除"><IconButton size="small" color="error" onClick={() => setDeleteCandidate(f)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>共 {factories.length} 家工厂 · 显示 {filtered.length} 家</Typography>

      <Dialog open={formOpen} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? '编辑工厂' : '新建工厂'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth required label="工厂名称" value={form.name} onChange={handleChange('name')} error={Boolean(formErrors.name)} helperText={formErrors.name} size="small" autoFocus /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="联系人" value={form.contactPerson} onChange={handleChange('contactPerson')} size="small" /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="电话" value={form.phone} onChange={handleChange('phone')} size="small" /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="邮箱" value={form.email} onChange={handleChange('email')} error={Boolean(formErrors.email)} helperText={formErrors.email} size="small" /></Grid>
            <Grid item xs={12}><TextField fullWidth label="地址" value={form.address} onChange={handleChange('address')} size="small" multiline rows={2} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="备注" value={form.notes} onChange={handleChange('notes')} size="small" multiline rows={2} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions><Button onClick={handleCloseForm}>取消</Button><Button variant="contained" onClick={handleSubmit}>{editing ? '保存' : '创建'}</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteCandidate)} onClose={() => setDeleteCandidate(null)} maxWidth="xs" fullWidth>
        <DialogTitle>确认删除工厂？</DialogTitle>
        <DialogContent>
          {deleteCandidate && (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>将永久删除工厂「{deleteCandidate.name}」！</Alert>
              {(orderCountByName[deleteCandidate.name.trim().toLowerCase()] || 0) > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>该工厂名下有 <Typography component="span" fontWeight={700}>{orderCountByName[deleteCandidate.name.trim().toLowerCase()]}</Typography> 个关联订单。删除后，订单上的"工厂名称"字段仍保留原文本。</Alert>
              )}
              <Typography variant="body2">此操作不可恢复！</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDeleteCandidate(null)}>取消</Button><Button variant="contained" color="error" startIcon={<DeleteIcon />} onClick={handleDelete}>确认删除</Button></DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={2500} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnack((s) => ({ ...s, open: false }))} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
