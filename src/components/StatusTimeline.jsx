import React, { useRef, useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import { STATUS_NODES, STATUS_COLORS, PASTE_HINT_TEXT } from '../data/constants';
import usePasteImage from '../hooks/usePasteImage';

/**
 * 单个时间线节点卡片（内部组件）
 * 负责粘贴监听、附件渲染、粘贴反馈动画
 *
 * @param {{
 *   node: string,
 *   entry: Object|null,
 *   color: string,
 *   isCurrent: boolean,
 *   isCompleted: boolean,
 *   idx: number,
 *   totalLen: number,
 *   onPasteImages?: (nodeName: string, files: File[]) => void,
 *   onDeleteAttachment?: (nodeName: string, attachmentId: string) => void,
 * }} props
 */
function TimelineNodeCard({
  node,
  entry,
  color,
  isCurrent,
  isCompleted,
  idx,
  totalLen,
  onPasteImages,
  onDeleteAttachment,
}) {
  const nodeRef = useRef(null);

  // 追踪附件数量变化，用于粘贴反馈动画
  const prevCountRef = useRef(entry?.attachments?.length || 0);
  const [highlightIdSet, setHighlightIdSet] = useState(new Set());

  // 粘贴监听
  usePasteImage(nodeRef, (files) => {
    if (entry && onPasteImages) onPasteImages(node, files);
  });

  // 检测新附件并触发高亮动画
  useEffect(() => {
    const attachments = entry?.attachments;
    if (!attachments || attachments.length === 0) {
      prevCountRef.current = 0;
      return;
    }
    const prevCount = prevCountRef.current;
    const currentCount = attachments.length;
    if (currentCount > prevCount) {
      // 收集新增的附件 ID
      const newIds = new Set();
      for (let i = prevCount; i < currentCount; i++) {
        newIds.add(attachments[i].id);
      }
      setHighlightIdSet(newIds);
      const timer = setTimeout(() => setHighlightIdSet(new Set()), 1000);
      prevCountRef.current = currentCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = currentCount;
  }, [entry?.attachments]);

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
        className={`timeline-dot ${isCompleted ? 'completed' : ''}`}
        sx={{
          backgroundColor: isCompleted ? color : '#e0e0e0',
          boxShadow: isCompleted ? `0 0 0 2px ${color}` : '0 0 0 2px #e0e0e0',
          ...(isCurrent && { width: 16, height: 16 }),
        }}
      />
      {idx < totalLen - 1 && (
        <Box
          className="timeline-line"
          sx={{
            backgroundColor: isCompleted ? color : '#e0e0e0',
          }}
        />
      )}
    </Box>
  );

  // 右侧内容
  const content = (
    <Box sx={{ flex: 1, pb: 2 }}>
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

      {entry && (
        <Paper variant="outlined" ref={nodeRef} sx={{ p: 1.5, bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary">
            {dayjs(entry.date).format('YYYY-MM-DD HH:mm')}
          </Typography>
          {entry.note && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {entry.note}
            </Typography>
          )}

          {/* 多附件渲染 */}
          {entry.attachments && entry.attachments.length > 0 && (
            <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {entry.attachments.map((att) => (
                <Box
                  key={att.id}
                  className={highlightIdSet.has(att.id) ? 'paste-highlight' : ''}
                  sx={{ position: 'relative', display: 'inline-flex' }}
                >
                  {att.type && att.type.startsWith('image/') ? (
                    <Box
                      component="img"
                      src={att.data}
                      alt={att.name}
                      sx={{
                        width: 80,
                        height: 80,
                        objectFit: 'cover',
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: '1px solid #e0e0e0',
                      }}
                      onClick={() => window.open(att.data, '_blank')}
                    />
                  ) : (
                    <Chip
                      label={att.name}
                      size="small"
                      component="a"
                      href={att.data}
                      target="_blank"
                      clickable
                      variant="outlined"
                    />
                  )}
                  {onDeleteAttachment && (
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        bgcolor: 'white',
                        width: 20,
                        height: 20,
                        boxShadow: 1,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAttachment(node, att.id);
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* 粘贴提示文字 */}
          <Typography variant="caption" sx={{ color: 'grey.500', fontSize: 12, mt: 0.5, display: 'block' }}>
            {PASTE_HINT_TEXT}
          </Typography>
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
 * 状态时间线组件
 * 展示订单所有状态节点的推进历史
 *
 * @param {{
 *   timeline?: Array<{node: string, date: string, note: string, attachments?: Array<{id: string, name: string, data: string, type: string}>, attachment?: string|null}>,
 *   currentStatus?: string,
 *   onPasteImages?: (nodeName: string, files: File[]) => void,
 *   onDeleteAttachment?: (nodeName: string, attachmentId: string) => void,
 * }} props
 */
export default function StatusTimeline({
  timeline = [],
  currentStatus,
  onPasteImages,
  onDeleteAttachment,
}) {
  if (!timeline || timeline.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">暂无状态记录</Typography>
      </Paper>
    );
  }

  // 按 STATUS_NODES 顺序排版所有 6 个节点
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
          <TimelineNodeCard
            key={node}
            node={node}
            entry={entry || null}
            color={color}
            isCurrent={isCurrent}
            isCompleted={isCompleted}
            idx={idx}
            totalLen={STATUS_NODES.length}
            onPasteImages={onPasteImages}
            onDeleteAttachment={onDeleteAttachment}
          />
        );
      })}
    </Box>
  );
}
