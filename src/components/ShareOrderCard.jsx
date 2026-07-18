import React from 'react';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import StatusBadge from './StatusBadge';

/** 分享页订单信息展示字段定义 */
const ORDER_FIELDS = [
  { label: '客户名称', key: 'customerName' },
  { label: 'PO 号', key: 'poNumber' },
  { label: '产品概述', key: 'productSummary', fullWidth: true },
  { label: '数量', key: 'quantity' },
  { label: '金额', key: 'amount' },
  { label: '贸易术语', key: 'tradeTerm' },
  { label: '起运港', key: 'portOfLoading' },
  { label: '目的港', key: 'portOfDestination' },
];

/**
 * 分享页专用订单信息卡片（只读）
 * 展示订单的核心字段：客户、PO、产品、数量、金额、贸易术语、起运港、目的港、当前状态
 *
 * @param {{ order: Object }} props
 */
export default function ShareOrderCard({ order }) {
  if (!order) return null;

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Grid container spacing={2}>
        {ORDER_FIELDS.map((field) => (
          <Grid
            item
            xs={12}
            sm={field.fullWidth ? 12 : 6}
            key={field.key}
          >
            <Typography variant="caption" color="text.secondary">
              {field.label}
            </Typography>
            <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
              {order[field.key] || '-'}
            </Typography>
          </Grid>
        ))}

        {/* 状态 */}
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              当前状态：
            </Typography>
            <StatusBadge status={order.status} size="medium" />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
