// ADAPTIVE TRANSPARENCY - Adjusts card opacity based on background brightness
// This ensures readability across different backgrounds (photos, gradients, etc.)

(function() {
  'use strict';
  
  // Configuration
  const BRIGHTNESS_THRESHOLD = 0.5; // 0-1, where 0.5 = medium gray
  const DARK_ALPHA = 0.05; // Card background alpha for dark backgrounds
  const LIGHT_ALPHA = 0.12; // Card background alpha for light backgrounds
  const DARK_BORDER_ALPHA = 0.1;
  const LIGHT_BORDER_ALPHA = 0.25;
  
  let currentBrightness = 0;
  let observer = null;
  
  // Calculate luminance from RGB
  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  
  // Get average color from background (sample multiple points)
  function getAverageBackgroundColor() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Try to capture background (fallback if can't access)
    // For photos slide, sample from the photo image if available
    const photoSlide = document.getElementById('photosSlide');
    if (photoSlide && photoSlide.classList.contains('active')) {
      const photo = document.getElementById('photoFrame');
      if (photo && photo.complete && photo.naturalWidth > 0) {
        try {
          ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Sample points (avoid edges, sample center area)
          const sampleSize = 100;
          const startX = Math.floor((canvas.width - sampleSize) / 2);
          const startY = Math.floor((canvas.height - sampleSize) / 2);
          
          let r = 0, g = 0, b = 0, count = 0;
          
          for (let y = startY; y < startY + sampleSize; y += 10) {
            for (let x = startX; x < startX + sampleSize; x += 10) {
              const index = (y * canvas.width + x) * 4;
              r += data[index];
              g += data[index + 1];
              b += data[index + 2];
              count++;
            }
          }
          
          if (count > 0) {
            return {
              r: Math.floor(r / count),
              g: Math.floor(g / count),
              b: Math.floor(b / count)
            };
          }
        } catch (e) {
          console.log('Could not sample photo for adaptive transparency');
        }
      }
    }
    
    // Fallback: Use CSS background color
    const bgColor = getComputedStyle(document.body).backgroundColor;
    const rgbMatch = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1]),
        g: parseInt(rgbMatch[2]),
        b: parseInt(rgbMatch[3])
      };
    }
    
    // Default dark background
    return { r: 13, g: 17, b: 23 };
  }
  
  // Update transparency based on background brightness
  function updateTransparency() {
    const color = getAverageBackgroundColor();
    const luminance = getLuminance(color.r, color.g, color.b);
    currentBrightness = luminance;
    
    // Determine if background is light or dark
    const isLight = luminance > BRIGHTNESS_THRESHOLD;
    
    // Update CSS custom properties
    const root = document.documentElement;
    root.style.setProperty('--card-bg-alpha', isLight ? LIGHT_ALPHA.toString() : DARK_ALPHA.toString());
    root.style.setProperty('--card-bg-hover-alpha', isLight ? (LIGHT_ALPHA + 0.03).toString() : (DARK_ALPHA + 0.03).toString());
    root.style.setProperty('--card-border-alpha', isLight ? LIGHT_BORDER_ALPHA.toString() : DARK_BORDER_ALPHA.toString());
    root.style.setProperty('--card-border-hover-alpha', isLight ? (LIGHT_BORDER_ALPHA + 0.1).toString() : (DARK_BORDER_ALPHA + 0.05).toString());
  }
  
  // Initialize adaptive transparency
  function initAdaptiveTransparency() {
    // Initial update
    updateTransparency();
    
    // Update on slide changes
    const slides = document.querySelectorAll('.slide');
    slides.forEach(slide => {
      const observer = new MutationObserver(() => {
        if (slide.classList.contains('active')) {
          setTimeout(updateTransparency, 300); // Wait for transition
        }
      });
      observer.observe(slide, { attributes: true, attributeFilter: ['class'] });
    });
    
    // Update when photos change
    const photoFrame = document.getElementById('photoFrame');
    if (photoFrame) {
      photoFrame.addEventListener('load', () => {
        setTimeout(updateTransparency, 100);
      });
    }
    
    // Throttled update on window resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateTransparency, 250);
    });
    
    // Periodic check (useful if background changes)
    setInterval(updateTransparency, 5000);
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdaptiveTransparency);
  } else {
    initAdaptiveTransparency();
  }
})();
