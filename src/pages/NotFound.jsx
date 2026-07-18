import React from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';

/**
 * 404 页面
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 12,
        textAlign: 'center',
      }}
    >
      <Typography variant="h1" fontWeight={700} color="text.secondary" sx={{ fontSize: '6rem' }}>
        404
      </Typography>
      <Typography variant="h5" color="text.secondary" gutterBottom>
        页面不存在
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        您访问的页面可能已被移除或地址有误。
      </Typography>
      <Button
        variant="contained"
        startIcon={<HomeIcon />}
        onClick={() => navigate('/')}
      >
        返回首页
      </Button>
    </Box>
  );
}
