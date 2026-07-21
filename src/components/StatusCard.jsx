import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { STATUS_COLORS } from '../data/constants';

/**
 * 仪表盘状态卡片
 * @param {{ status: string, count: number, warning?: boolean }} props
 */
export default function StatusCard({ status, count, warning = false }) {
  const navigate = useNavigate();
  const color = STATUS_COLORS[status] || '#757575';

  return (
    <Card
      sx={{
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        borderLeft: `4px solid ${color}`,
        ...(warning && {
          borderLeftColor: '#d32f2f',
          backgroundColor: '#fff5f5',
        }),
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
      }}
      onClick={() => navigate(`/orders?status=${encodeURIComponent(status)}`)}
    >
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {status}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: warning ? '#d32f2f' : color,
            }}
          >
            {count}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            个订单
          </Typography>
        </Box>
        {warning && (
          <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
            ⚠️ 逾期未收款预警
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
