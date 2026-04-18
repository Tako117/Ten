import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE } from '../config';

const AccessibilityContext = createContext();

export const useAccessibility = () => useContext(AccessibilityContext);

export const AccessibilityProvider = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [textSize, setTextSize] = useState('normal'); // normal, large, xlarge
  const [learningProfile, setLearningProfile] = useState('hearing'); // none, hearing, dyslexia, adhd

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    const root = document.documentElement;
    if (textSize === 'xlarge') {
      root.style.fontSize = '24px';
    } else if (textSize === 'large') {
      root.style.fontSize = '20px';
    } else {
      root.style.fontSize = '16px';
    }
  }, [textSize]);

  const toggleHighContrast = () => setHighContrast(!highContrast);
  
  const cycleTextSize = () => {
    if (textSize === 'normal') setTextSize('large');
    else if (textSize === 'large') setTextSize('xlarge');
    else setTextSize('normal');
  };

  const processLessonContent = async (rawText) => {
    if (!rawText) return null;

    if (learningProfile === 'dyslexia' || learningProfile === 'adhd') {
      try {
        const response = await fetch(`${API_BASE}/api/adapt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rawText, profile: learningProfile })
        });
        
        if (!response.ok) throw new Error('Adaptation failed');
        const data = await response.json();
        
        return {
          originalText: rawText,
          adaptedText: data.adaptedText,
          chunks: data.chunks || [],
          profileUsed: learningProfile
        };
      } catch (e) {
        console.error("Adaptation error:", e);
        // Fallback to raw text
        return { originalText: rawText, adaptedText: rawText, chunks: [rawText], profileUsed: 'none' };
      }
    }

    // Default fast-path for Hearing / None
    return {
      originalText: rawText,
      adaptedText: rawText,
      chunks: [rawText],
      profileUsed: learningProfile
    };
  };

  return (
    <AccessibilityContext.Provider value={{ 
      highContrast, 
      toggleHighContrast, 
      textSize, 
      cycleTextSize,
      learningProfile,
      setLearningProfile,
      processLessonContent
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

