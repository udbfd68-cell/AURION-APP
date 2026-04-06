'use client';

import { useCallback, useRef } from 'react';
import { fetchWithRetry } from '@/lib/client-utils';

type VirtualFS = Record<string, { content: string; language: string }>;
type MediaAsset = { id: string; type: 'video' | 'image'; url: string; prompt: string; timestamp: number };

interface UseMediaGenerationDeps {
  setTerminalLines: React.Dispatch<React.SetStateAction<string[]>>;
  setProjectFiles: React.Dispatch<React.SetStateAction<VirtualFS>>;
  setMediaAssets: React.Dispatch<React.SetStateAction<MediaAsset[]>>;
}

export function useMediaGeneration({ setTerminalLines, setProjectFiles, setMediaAssets }: UseMediaGenerationDeps) {
  const pendingVideoRef = useRef(0);
  const pendingImageRef = useRef(0);
  const MAX_CONCURRENT_IMAGES = 4;

  const generateLTXVideo = useCallback(async (videoId: string, prompt: string) => {
    if (pendingVideoRef.current >= 1) {
      setTerminalLines(prev => [...prev, `$ ⏳ Video "${videoId}" skipped (limit reached)`]);
      return;
    }
    pendingVideoRef.current++;
    setTerminalLines(prev => [...prev, `$ 🎬 Generating video "${videoId}"...`]);
    try {
      const res = await fetchWithRetry('/api/ltx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'ltx-2-3-fast',
          duration: 6,
          resolution: '1920x1080',
          fps: 24,
          generate_audio: false,
        }),
        timeout: 300000,
      }, 0);

      const contentType = res.headers.get('content-type') || '';
      let videoUrl: string;
      if (contentType.includes('video/')) {
        const blob = await res.blob();
        videoUrl = URL.createObjectURL(blob);
      } else {
        const data = await res.json();
        if (!data.success || !data.video_url) {
          setTerminalLines(prev => [...prev, `$ ✗ Video "${videoId}" failed: ${data.error || 'Unknown error'}`]);
          return;
        }
        videoUrl = data.video_url;
      }

      const placeholder = `__LTX_VIDEO_${videoId}__`;
      setProjectFiles(prev => {
        const updated = { ...prev };
        for (const [path, file] of Object.entries(updated)) {
          if (file.content.includes(placeholder)) {
            updated[path] = { ...file, content: file.content.replaceAll(placeholder, videoUrl) };
          }
        }
        return updated;
      });
      const dur = res.headers.get('x-video-duration') || '6';
      const rez = res.headers.get('x-video-resolution') || '1920x1080';
      setTerminalLines(prev => [...prev, `$ ✓ Video "${videoId}" generated (${dur}s ${rez})`]);
      setMediaAssets(prev => [...prev, { id: videoId, type: 'video', url: videoUrl, prompt, timestamp: Date.now() }]);
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ ✗ Video "${videoId}" error: ${err instanceof Error ? err.message : 'Unknown'}`]);
    } finally {
      pendingVideoRef.current--;
    }
  }, [setTerminalLines, setProjectFiles, setMediaAssets]);

  const generateGeminiImage = useCallback(async (imageId: string, prompt: string) => {
    if (pendingImageRef.current >= MAX_CONCURRENT_IMAGES) {
      setTerminalLines(prev => [...prev, `$ ⏳ Image "${imageId}" queued (limit reached)`]);
      return;
    }
    pendingImageRef.current++;
    setTerminalLines(prev => [...prev, `$ 🎨 Generating image "${imageId}"...`]);
    try {
      const res = await fetchWithRetry('/api/pexels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        timeout: 300000,
      }, 0);
      const data = await res.json();
      if (data.success && data.image_url) {
        const placeholder = `__GEMINI_IMAGE_${imageId}__`;
        setProjectFiles(prev => {
          const updated = { ...prev };
          for (const [path, file] of Object.entries(updated)) {
            if (file.content.includes(placeholder)) {
              updated[path] = { ...file, content: file.content.replaceAll(placeholder, data.image_url) };
            }
          }
          return updated;
        });
        setTerminalLines(prev => [...prev, `$ ✓ Image "${imageId}" generated${data.note ? ' (placeholder)' : ''}`]);
        setMediaAssets(prev => [...prev, { id: imageId, type: 'image', url: data.image_url, prompt, timestamp: Date.now() }]);
      } else {
        setTerminalLines(prev => [...prev, `$ ✗ Image "${imageId}" failed: ${data.error || 'Unknown error'}`]);
      }
    } catch (err) {
      setTerminalLines(prev => [...prev, `$ ✗ Image "${imageId}" error: ${err instanceof Error ? err.message : 'Unknown'}`]);
    } finally {
      pendingImageRef.current--;
    }
  }, [setTerminalLines, setProjectFiles, setMediaAssets]);

  return { generateLTXVideo, generateGeminiImage, MAX_CONCURRENT_IMAGES };
}
