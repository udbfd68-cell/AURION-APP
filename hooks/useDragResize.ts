import { useEffect, useRef, useState } from 'react';

export function useDragResize() {
  const [chatWidth, setChatWidth] = useState(380);
  const [terminalHeight, setTerminalHeight] = useState(200);
  const chatDragRef = useRef(false);
  const termDragRef = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (chatDragRef.current) {
        const w = Math.max(280, Math.min(600, e.clientX));
        setChatWidth(w);
      }
      if (termDragRef.current) {
        const rect = document.getElementById('right-panel')?.getBoundingClientRect();
        if (rect) {
          const h = Math.max(100, Math.min(500, rect.bottom - e.clientY));
          setTerminalHeight(h);
        }
      }
    };
    const onUp = () => {
      chatDragRef.current = false;
      termDragRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  return { chatWidth, setChatWidth, terminalHeight, setTerminalHeight, chatDragRef, termDragRef };
}
