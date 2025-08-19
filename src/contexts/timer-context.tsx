"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from "react";

interface Timer {
  id: string;
  duration: number; // in seconds
  remainingTime: number;
  isActive: boolean;
  startTime: number;
}

interface TimerContextType {
  timers: Timer[];
  activeTimer: Timer | null;
  startTimer: (duration: number) => string;
  stopTimer: (id: string) => void;
  clearTimer: (id: string) => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeTimer = timers.find(timer => timer.isActive) || null;

  useEffect(() => {
    if (activeTimer) {
      intervalRef.current = setInterval(() => {
        setTimers(prev => prev.map(timer => {
          if (timer.isActive && timer.id === activeTimer.id) {
            const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
            const remainingTime = Math.max(0, timer.duration - elapsed);
            
            if (remainingTime === 0) {
              // Timer finished - play notification sound
              playTimerSound();
              return { ...timer, remainingTime: 0, isActive: false };
            }
            
            return { ...timer, remainingTime };
          }
          return timer;
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [activeTimer?.id]);

  const playTimerSound = () => {
    try {
      // Create multiple beeps for timer completion
      const playBeep = (frequency: number, duration: number) => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      };

      // Play 3 beeps
      playBeep(800, 0.2);
      setTimeout(() => playBeep(800, 0.2), 300);
      setTimeout(() => playBeep(800, 0.2), 600);
    } catch (error) {
      console.warn('Could not play timer sound:', error);
    }
  };

  const startTimer = (duration: number): string => {
    const id = Date.now().toString();
    const newTimer: Timer = {
      id,
      duration,
      remainingTime: duration,
      isActive: true,
      startTime: Date.now(),
    };

    // Stop any existing active timer
    setTimers(prev => prev.map(timer => ({ ...timer, isActive: false })));
    
    // Add new timer
    setTimers(prev => [...prev, newTimer]);
    
    return id;
  };

  const stopTimer = (id: string) => {
    setTimers(prev => prev.map(timer => 
      timer.id === id ? { ...timer, isActive: false } : timer
    ));
  };

  const clearTimer = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id));
  };

  return (
    <TimerContext.Provider value={{
      timers,
      activeTimer,
      startTimer,
      stopTimer,
      clearTimer,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimerContext() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
}