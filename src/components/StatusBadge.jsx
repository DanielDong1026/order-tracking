import React from 'react';
import Chip from '@mui/material/Chip';
import { STATUS_COLORS, STATUS_CHIP_COLORS } from '../data/constants';

/**
 * 状态标签组件
 * @param {{ status: string, size?: 'small'|'medium' }} props
 */
export default function StatusBadge({ status, size = 'small' }) {
  const color = STATUS_CHIP_COLORS[status] || 'default';
  const bgColor = STATUS_COLORS[status] || '#757575';

  return (
    <Chip
      label={status}
      size={size}
      color={color}
      sx={{
        fontWeight: 600,
        backgroundColor: bgColor,
        color: '#fff',
        '& .MuiChip-label': { px: 1.5 },
      }}
    />
  );
}
