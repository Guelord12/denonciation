import { useEffect, useRef, useState, useCallback } from 'react';

interface UsePictureInPictureReturn {
  isPiPActive: boolean;
  requestPiP: () => Promise<void>;
  exitPiP: () => Promise<void>;
  togglePiP: () => Promise<void>;
  isPiPSupported: boolean;
}

/**
 * Hook personnalisé pour gérer le Picture-in-Picture
 * @param videoRef - Référence vers l'élément vidéo HTML
 */
export function usePictureInPicture(
  videoRef: React.RefObject<HTMLVideoElement>
): UsePictureInPictureReturn {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);

  // Vérifier le support du PiP
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const supported = 
      document.pictureInPictureEnabled === true &&
      video.requestPictureInPicture !== undefined;
    
    setIsPiPSupported(supported);
  }, [videoRef]);

  // Surveiller les changements d'état PiP
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnterPiP = () => setIsPiPActive(true);
    const handleLeavePiP = () => setIsPiPActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPiP);
    video.addEventListener('leavepictureinpicture', handleLeavePiP);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPiP);
      video.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [videoRef]);

  // Demander le mode PiP
  const requestPiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isPiPSupported) {
      console.warn('Picture-in-Picture not supported');
      return;
    }

    try {
      await video.requestPictureInPicture();
    } catch (error) {
      console.error('Failed to enter Picture-in-Picture:', error);
    }
  }, [videoRef, isPiPSupported]);

  // Quitter le mode PiP
  const exitPiP = useCallback(async () => {
    if (!document.pictureInPictureElement) return;

    try {
      await document.exitPictureInPicture();
    } catch (error) {
      console.error('Failed to exit Picture-in-Picture:', error);
    }
  }, []);

  // Basculer le mode PiP
  const togglePiP = useCallback(async () => {
    if (isPiPActive) {
      await exitPiP();
    } else {
      await requestPiP();
    }
  }, [isPiPActive, exitPiP, requestPiP]);

  return {
    isPiPActive,
    requestPiP,
    exitPiP,
    togglePiP,
    isPiPSupported,
  };
}