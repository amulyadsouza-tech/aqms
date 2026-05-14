import React, { useEffect, useRef, useState } from 'react';

// Use Vite's import.meta.glob to dynamically get all frame URLs
const dayFramesGlob = import.meta.glob('../day/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' });
const darkFramesGlob = import.meta.glob('../dark/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' });

// Sort to ensure correct sequence
const dayFrameUrls = Object.entries(dayFramesGlob)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  .map(([, url]) => url);

const darkFrameUrls = Object.entries(darkFramesGlob)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
  .map(([, url]) => url);

const ScrollSequenceCanvas = ({ theme }) => {
  const canvasRef = useRef(null);
  const [images, setImages] = useState({ day: [], dark: [] });
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const currentFrameRef = useRef(0);
  const animationRef = useRef(null);
  const lastFrameTimeRef = useRef(0);
  const fps = 24;
  const frameInterval = 1000 / fps;

  useEffect(() => {
    const preloadImages = async () => {
      setIsLoaded(false);
      try {
        const loadArray = (urls) => {
          return Promise.all(
            urls.map((url) => {
              return new Promise((resolve) => {
                const img = new Image();
                img.src = url;
                img.onload = () => resolve(img);
                img.onerror = () => {
                  console.warn(`Failed to load image: ${url}`);
                  resolve(null);
                };
              });
            })
          );
        };

        const [loadedDay, loadedDark] = await Promise.all([
          loadArray(dayFrameUrls),
          loadArray(darkFrameUrls)
        ]);

        setImages({ 
          day: loadedDay.filter(img => img !== null), 
          dark: loadedDark.filter(img => img !== null) 
        });
        setIsLoaded(true);
      } catch (err) {
        console.error("Error preloading images:", err);
        setLoadError(err.message);
      }
    };

    preloadImages();
  }, []);

  const drawFrame = (frameIndex) => {
    const canvas = canvasRef.current;
    if (!canvas || !isLoaded) return;
    
    const ctx = canvas.getContext('2d');
    const currentArray = theme === 'day' ? images.day : images.dark;
    
    if (currentArray.length === 0) return;
    const safeIndex = frameIndex % currentArray.length;
    const img = currentArray[safeIndex];

    if (img) {
      const canvasRatio = canvas.width / canvas.height;
      const imgRatio = img.width / img.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;

      if (canvasRatio > imgRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      } else {
        drawWidth = canvas.height * imgRatio;
        drawHeight = canvas.height;
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;

    const animate = (timestamp) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = timestamp;
      
      const elapsed = timestamp - lastFrameTimeRef.current;

      if (elapsed > frameInterval) {
        lastFrameTimeRef.current = timestamp - (elapsed % frameInterval);
        
        const currentArray = theme === 'day' ? images.day : images.dark;
        if (currentArray.length > 0) {
          currentFrameRef.current = (currentFrameRef.current + 1) % currentArray.length;
          drawFrame(currentFrameRef.current);
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        drawFrame(currentFrameRef.current);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isLoaded, theme, images]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1,
      backgroundColor: 'var(--bg-primary)',
      pointerEvents: 'none',
      transition: 'background 0.5s ease'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          filter: 'var(--bg-canvas-filter)',
          transition: 'filter 0.5s ease'
        }}
      />
      
      {/* Cinematic Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: theme === 'day' 
          ? 'radial-gradient(circle at center, transparent 0%, rgba(255,255,255,0.15) 100%)' 
          : 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
        zIndex: 1,
        transition: 'background 0.5s ease'
      }} />

      {(!isLoaded || loadError) && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          background: 'var(--glass-bg)',
          padding: '2.5rem',
          borderRadius: '24px',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--card-shadow)',
          zIndex: 10
        }}>
          {loadError ? (
            <p style={{ color: '#ef4444' }}>{loadError}</p>
          ) : (
            <>
              <div className="loader" style={{ marginBottom: '1rem', fontWeight: 800, letterSpacing: '2px' }}>INITIALIZING ENGINE</div>
              <p style={{ fontSize: '14px', opacity: 0.6 }}>Synchronizing {dayFrameUrls.length + darkFrameUrls.length} cinematic frames...</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ScrollSequenceCanvas;



