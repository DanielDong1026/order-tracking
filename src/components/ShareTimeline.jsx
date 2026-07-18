import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import dayjs from 'dayjs';
import { STATUS_NODES, STATUS_COLORS } from '../data/constants';

/**
 * 单个只读时间线节点（内部组件）
 *
 * 与 StatusTimeline 的 TimelineNodeCard 视觉一致，但：
 * - 无粘贴图片功能
 * - 附件仅显示存在性（count），不读取 data 字段
 * - 无删除附件按钮
 *
 * @param {{
 *   node: string,
 *   entry: Object|null,
 *   color: string,
 *   isCurrent: boolean,
 *   isCompleted: boolean,
 *   idx: number,
 *   totalLen: number,
 * }} props
 */
function TimelineNodeReadonly({ node, entry, color, isCurrent, isCompleted, idx, totalLen }) {
  // 左侧圆点 + 连线
  const dotLine = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: 24,
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: isCompleted ? color : '#e0e0e0',
          boxShadow: isCompleted ? `0 0 0 2px ${color}` : '0 0 0 2px #e0e0e0',
          ...(isCurrent && { width: 16, height: 16 }),
        }}
      />
      {idx < totalLen - 1 && (
        <Box
          sx={{
            width: 2,
            flex: 1,
            minHeight: 24,
            backgroundColor: isCompleted ? color : '#e0e0e0',
          }}
        />
      )}
    </Box>
  );

  // 右侧内容
  const content = (
    <Box sx={{ flex: 1, pb: 2 }}>
      {/* 节点标签 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Chip
          label={node}
          size="small"
          sx={{
            fontWeight: isCurrent ? 700 : 500,
            backgroundColor: isCompleted ? color : '#e0e0e0',
            color: isCompleted ? '#fff' : '#9e9e9e',
            fontSize: '0.75rem',
          }}
        />
        {isCurrent && (
          <Typography variant="caption" color="primary" fontWeight={700}>
            当前状态
          </Typography>
        )}
      </Box>

      {/* 节点详情 */}
      {entry && (
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary">
            {dayjs(entry.date).format('YYYY-MM-DD HH:mm')}
          </Typography>
          {entry.note && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {entry.note}
            </Typography>
          )}

          {/* 附件存在性指示 — 仅读取 length，绝对不访问 data */}
          {entry.attachments && entry.attachments.length > 0 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: 'block' }}
            >
              📎 有 {entry.attachments.length} 个附件
            </Typography>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: 'block' }}
            >
              (无附件)
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', gap: 2, minHeight: entry ? 80 : 40 }}>
      {dotLine}
      {content}
    </Box>
  );
}

/**
 * 分享页专用时间线（只读）
 *
 * 按 STATUS_NODES 顺序展示所有 6 个节点。
 * 已完成的节点高亮，当前节点标注「当前状态」。
 * 每个节点展示日期、备注、附件数量（不展示附件内容/缩略图/下载链接）。
 *
 * @param {{
 *   timeline?: Array<{node: string, date: string, note: string, attachments?: Array}>,
 *   currentStatus?: string,
 * }} props
 */
export default function ShareTimeline({ timeline = [], currentStatus }) {
  if (!timeline || timeline.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">暂无状态记录</Typography>
      </Paper>
    );
  }

  // 构建节点 → 数据映射
  const currentIdx = STATUS_NODES.indexOf(currentStatus);
  const timelineMap = {};
  timeline.forEach((t) => {
    timelineMap[t.node] = t;
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {STATUS_NODES.map((node, idx) => {
        const entry = timelineMap[node];
        const isCompleted = idx <= currentIdx;
        const isCurrent = node === currentStatus;
        const color = STATUS_COLORS[node] || '#757575';

        return (
          <TimelineNodeReadonly
            key={node}
            node={node}
            entry={entry || null}
            color={color}
            isCurrent={isCurrent}
            isCompleted={isCompleted}
            idx={idx}
            totalLen={STATUS_NODES.length}
          />
        );
      })}
    </Box>
  );
}
