import { useEffect } from 'react';

/**
 * 监听容器 paste 事件，提取剪贴板中的图片文件
 *
 * 规则：
 * - 仅处理 clipboardData.files 中包含 image/* 类型的情况
 * - 纯文本粘贴不拦截，正常冒泡
 * - 多图按顺序逐一回调
 *
 * @param {React.RefObject<HTMLElement>} containerRef - 监听容器
 * @param {(files: File[]) => void} onImagesPasted - 图片回调
 */
export default function usePasteImage(containerRef, onImagesPasted) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handlePaste = (e) => {
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return; // 纯文本，放行

      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (imageFiles.length === 0) return; // 非图片文件，放行

      e.preventDefault(); // 仅拦截图片粘贴
      onImagesPasted(imageFiles);
    };

    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, [containerRef, onImagesPasted]);
}
