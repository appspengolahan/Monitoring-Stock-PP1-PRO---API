import { useEffect, useState, useCallback } from 'react';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    const doc = document as any;
    const supported = !!(
      doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      doc.mozFullScreenEnabled ||
      doc.msFullscreenEnabled
    );
    setIsSupported(supported);

    const checkStatus = () => {
      const activeElement =
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement;
      setIsFullscreen(!!activeElement);
    };

    checkStatus();

    document.addEventListener('fullscreenchange', checkStatus);
    document.addEventListener('webkitfullscreenchange', checkStatus);
    document.addEventListener('mozfullscreenchange', checkStatus);
    document.addEventListener('MSFullscreenChange', checkStatus);

    return () => {
      document.removeEventListener('fullscreenchange', checkStatus);
      document.removeEventListener('webkitfullscreenchange', checkStatus);
      document.removeEventListener('mozfullscreenchange', checkStatus);
      document.removeEventListener('MSFullscreenChange', checkStatus);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      const doc = document as any;
      const elem = document.documentElement as any;

      const isCurrentFs = !!(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (!isCurrentFs) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          await elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle prevented or unsupported:', err);
    }
  }, []);

  return {
    isFullscreen,
    isSupported,
    toggleFullscreen
  };
}
