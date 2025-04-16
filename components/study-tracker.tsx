"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { useFirebase } from "@/components/firebase-provider"
import { collection, query, where, getDocs, addDoc, Timestamp, updateDoc, doc, getDoc } from 'firebase/firestore'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useOfflineStorage } from "@/hooks/use-offline-storage"
import { toast } from "@/components/ui/use-toast"
import { useTimer } from "@/components/study-timer-provider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings2, X, Maximize2, RotateCcw } from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Import or define the TimerMode type
type TimerMode = 'normal' | 'pomodoro';

// Helper function to get date in Kolkata time (IST - UTC+5:30)
const getKolkataDate = () => {
  // Create a date object for the current time in UTC
  const now = new Date();
  console.log('Current local time:', now.toString());

  // Create a date object for the current time in IST (UTC+5:30)
  // First convert to UTC by adding the local timezone offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);

  // Then add the IST offset (5 hours and 30 minutes)
  const istOffset = (5 * 60 + 30) * 60 * 1000;
  const istTime = new Date(utcTime + istOffset);

  console.log('Calculated Kolkata time:', istTime.toString());
  return istTime;
};

// Helper function to get today's date string in Kolkata time (YYYY-MM-DD)
const getKolkataDateString = () => {
  const istDate = getKolkataDate();
  const dateString = istDate.toISOString().split('T')[0];
  console.log('Kolkata date string:', dateString);

  // IMPORTANT: For testing/debugging purposes, always use the actual current date
  // This ensures that the date comparison works correctly
  const currentDate = new Date();
  const currentDateString = currentDate.toISOString().split('T')[0];
  console.log('Using current date for testing:', currentDateString);

  return currentDateString; // Use current date instead of Kolkata date for now
};

// Helper function to check if a date is today in Kolkata time
const isKolkataToday = (dateString: string) => {
  return dateString === getKolkataDateString();
};

// Define PCM and PCB subject groups
const pcmSubjects = ['Physics', 'Chemistry', 'Mathematics'] as const;
const pcbSubjects = ['Physics', 'Chemistry', 'Biology'] as const;

// Create a union type for all possible subjects
type PCMSubject = typeof pcmSubjects[number];
type PCBSubject = typeof pcbSubjects[number];
type Subject = PCMSubject | PCBSubject;

// Define study times type
type StudyTimesType = Record<Subject, number>;

interface StudyTrackerProps {
  expanded?: boolean
}

export function StudyTracker({ expanded = false }: StudyTrackerProps) {
  const { db, user } = useFirebase()
  const { offlineData, updateStudyTime } = useOfflineStorage()
  const [selectedSubject, setSelectedSubject] = useState<Subject>('Physics')
  const [isStudying, setIsStudying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [studyStartTime, setStudyStartTime] = useState<Date | null>(null)

  // Initialize study times from localStorage if available
  const initialStudyTimes = (() => {
    if (typeof window !== 'undefined') {
      const storedProgress = localStorage.getItem('todayStudyTimes');
      if (storedProgress) {
        try {
          const parsedData = JSON.parse(storedProgress);
          const todayString = getKolkataDateString();

          // Check if the stored date matches today
          if (parsedData && parsedData.times && parsedData.date === todayString) {
            console.log('Initializing study times from localStorage:', parsedData.times);
            return parsedData.times;
          }
        } catch (e) {
          console.error('Error parsing stored progress during initialization:', e);
        }
      }
    }

    // Default initial state if localStorage is not available
    return {
      Physics: 0,
      Chemistry: 0,
      Mathematics: 0,
      Biology: 0
    };
  })();

  const [studyTimes, setStudyTimes] = useState<StudyTimesType>(initialStudyTimes)
  const [fullScreenMode, setFullScreenMode] = useState(false)
  const [studyMode, setStudyMode] = useState<'PCM' | 'PCB'>('PCM')
  const [showModeSwitch, setShowModeSwitch] = useState(false)

  // Get current subjects based on selected mode
  const subjects = useMemo(() =>
    studyMode === 'PCM' ? pcmSubjects : pcbSubjects
  , [studyMode]);

  const [sessionStartTime, setSessionStartTime] = useState<StudyTimesType>({
    Physics: 0,
    Chemistry: 0,
    Mathematics: 0,
    Biology: 0
  })

  const [targetTimes, setTargetTimes] = useState<StudyTimesType>({
    Physics: 120 * 60, // 2 hours in seconds
    Chemistry: 120 * 60,
    Mathematics: 120 * 60,
    Biology: 120 * 60
  })

  // Get timer context
  const {
    mode,
    isRunning,
    startTimer,
    stopTimer,
    pauseTimer,
    resetTimer,
    currentTime,
    pomodoroSettings,
    setPomodoroSettings,
    currentPhase,
    totalElapsedTime,
    skipBreak,
    completedSessions,
    setMode
  } = useTimer();

  // Track if mode changes are from explicit user action or just component mounting
  const isFirstRender = useRef(true);
  const prevMode = useRef(mode);

  // Calculate subject progress in hours for display
  const subjectProgress = useMemo(() => {
    // This will be recalculated whenever studyTimes changes
    return {
    Physics: studyTimes.Physics / 60, // Convert minutes to hours
    Chemistry: studyTimes.Chemistry / 60,
      Mathematics: studyTimes.Mathematics / 60,
      Biology: studyTimes.Biology / 60
    };
  }, [studyTimes]);

  // Sync local isStudying state with timer context
  useEffect(() => {
    // Update local isStudying state based on timer context
    setIsStudying(isRunning);

    // When component mounts or remounts, check if timer is running
    // and restore the session state from localStorage
    if (isRunning) {
      // If timer is already running when component mounts,
      // we need to restore the session state
      const storedSubject = localStorage.getItem('selectedSubject');
      if (storedSubject) {
        // Check if the stored subject is valid in either PCM or PCB mode
        const isValidSubject =
          (storedSubject === 'Physics' ||
           storedSubject === 'Chemistry' ||
           storedSubject === 'Mathematics' ||
           storedSubject === 'Biology');

        if (isValidSubject) {
        setSelectedSubject(storedSubject as Subject);
        }
      }

      // Restore session start time from localStorage if available
      const storedSessionStartTime = localStorage.getItem('sessionStartTimes');
      if (storedSessionStartTime) {
        try {
          const parsedTimes = JSON.parse(storedSessionStartTime);
          setSessionStartTime(parsedTimes);
        } catch (e) {
          console.error('Failed to parse stored session start times', e);
        }
      }
    }

    // Important: Do NOT call resetTimer() here as it would reset the timer
    // every time this component mounts or when isRunning changes
  }, [isRunning]);

  // Store selected subject and session start times in localStorage
  // when they change, so they can be restored when navigating back
  useEffect(() => {
    if (isStudying) {
      localStorage.setItem('selectedSubject', selectedSubject);
      localStorage.setItem('sessionStartTimes', JSON.stringify(sessionStartTime));
    } else {
      localStorage.removeItem('selectedSubject');
      localStorage.removeItem('sessionStartTimes');
    }
  }, [isStudying, selectedSubject, sessionStartTime]);

  // Effect to handle mode switching
  useEffect(() => {
    // Skip the first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevMode.current = mode;
      return;
    }

    // Check if this is an actual mode change, not just component mounting
    const isModeChanged = prevMode.current !== mode;
    prevMode.current = mode;

    // Only handle explicit mode changes while studying
    if (isModeChanged && isStudying) {
      // If we're already studying and mode changes, stop and save current session
      stopStudying();
    }

    // Don't reset the timer here - that would reset it on every mount
  }, [mode, isStudying]);

  // Load study times from database or local storage
  useEffect(() => {
    // First check if we need to reset progress for a new day
    const checkAndResetForNewDay = () => {
      const todayString = getKolkataDateString();
      const lastUsedDate = localStorage.getItem('lastUsedDate');

      console.log('Today:', todayString, 'Last used date:', lastUsedDate);

      // If this is the first time using the app, just set the last used date
      if (!lastUsedDate) {
        console.log('First time using the app, setting lastUsedDate');
        localStorage.setItem('lastUsedDate', todayString);
        return false; // No reset needed
      }

      // Only reset if the date is definitely different and not just a refresh
      // Also check if we have existing progress that should be preserved
      const storedProgress = localStorage.getItem('todayStudyTimes');
      if (lastUsedDate !== todayString) {
        console.log('Date difference detected');

        // Before resetting, check if we have stored progress that might be valid
        if (storedProgress) {
          try {
            const parsedData = JSON.parse(storedProgress);

            // If the stored date matches today, don't reset
            if (parsedData.date === todayString) {
              console.log('Stored progress is for today, not resetting');
              localStorage.setItem('lastUsedDate', todayString);
              return false; // No reset needed
            }

            // If the stored progress has non-zero values, confirm before resetting
            const hasProgress = Object.values(parsedData.times).some(value => (value as number) > 0);
            if (hasProgress) {
              console.log('Stored progress has non-zero values, preserving it');

              // Update the date but keep the progress
              localStorage.setItem('todayStudyTimes', JSON.stringify({
                date: todayString,
                times: parsedData.times
              }));

              localStorage.setItem('lastUsedDate', todayString);
              return false; // No reset needed
            }
          } catch (e) {
            console.error('Error parsing stored progress during date check:', e);
          }
        }

        // If we get here, it's a new day and we don't have valid progress to preserve
        console.log('New day detected! Resetting today\'s progress');
        // It's a new day, reset the progress
        setStudyTimes({
          Physics: 0,
          Chemistry: 0,
          Mathematics: 0,
          Biology: 0
        });

        // Store the reset progress in localStorage
        localStorage.setItem('todayStudyTimes', JSON.stringify({
          date: todayString,
          times: {
            Physics: 0,
            Chemistry: 0,
            Mathematics: 0,
            Biology: 0
          }
        }));

        // Update the last used date
        localStorage.setItem('lastUsedDate', todayString);
        return true; // Progress was reset
      }

      // Update the last used date
      localStorage.setItem('lastUsedDate', todayString);
      return false; // No reset needed
    };

    // CRITICAL FIX: Load from localStorage immediately on component mount
    // This ensures we always have the latest data from localStorage
    const loadFromLocalStorage = () => {
      const todayString = getKolkataDateString();
      const storedProgress = localStorage.getItem('todayStudyTimes');

      console.log('Attempting to load from localStorage, today is:', todayString);

      if (storedProgress) {
        try {
          const parsedData = JSON.parse(storedProgress);
          console.log('Parsed localStorage data:', parsedData);

          // Check if we have valid data structure
          if (parsedData && parsedData.times) {
            // Even if the date doesn't match exactly, we should use the stored data
            // to prevent progress loss on refresh
            console.log('Using localStorage data for progress');
            setStudyTimes(parsedData.times);

            // Update the date to today to ensure future comparisons work
            localStorage.setItem('todayStudyTimes', JSON.stringify({
              date: todayString,
              times: parsedData.times
            }));

            return true; // Successfully loaded from localStorage
          }
        } catch (e) {
          console.error('Error parsing stored progress:', e);
        }
      }
      return false; // Failed to load from localStorage
    };

    // First check if we need to reset for a new day
    const wasReset = checkAndResetForNewDay();
    if (wasReset) return;

    // Then try to load from localStorage
    const loadedFromLocalStorage = loadFromLocalStorage();

    // If we couldn't load from localStorage, try to load from Firestore
    // but only if we have a user and database connection
    if (!loadedFromLocalStorage && user && db) {
      loadTodayDataFromFirestore();
    } else if (!loadedFromLocalStorage) {
      // If we couldn't load from localStorage or Firestore, fall back to offline data
      setStudyTimes(offlineData.studyTime as StudyTimesType);
    }

    // Set up an interval to check for localStorage changes (in case of multiple tabs)
    const checkLocalStorageInterval = setInterval(() => {
      loadFromLocalStorage();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(checkLocalStorageInterval);
  }, []); // Remove dependencies to ensure this only runs once on mount

  // Separate effect to load from Firebase when user or db changes
  useEffect(() => {
    if (user && db) {
      // Try to sync any offline sessions first
      syncOfflineSessions();

      // Then load today's data from Firestore, but don't overwrite localStorage data
      // if it exists for today
      const storedProgress = localStorage.getItem('todayStudyTimes');
      if (storedProgress) {
        try {
          const { date, times } = JSON.parse(storedProgress);
          const todayString = getKolkataDateString();

          if (date === todayString) {
            // IMPORTANT: Don't check for non-zero values, always prioritize localStorage data
            console.log('Using localStorage data instead of loading from Firestore');
            setStudyTimes(times);
            return; // Don't load from Firestore if we have localStorage data for today
          } else {
            // If localStorage data is not for today, load from Firestore
            loadTodayDataFromFirestore();
          }
        } catch (e) {
          console.error('Error parsing stored progress:', e);
          loadTodayDataFromFirestore();
        }
      } else {
        // If no localStorage data, load from Firestore
        loadTodayDataFromFirestore();
      }
    }
  }, [user, db]);

  // Function to load today's data from Firestore
  const loadTodayDataFromFirestore = async () => {
    try {
      if (!user || !db) {
        console.error('User or database not available');
        return;
      }

      // First check if we have localStorage data for today
      const todayString = getKolkataDateString();
      const storedProgress = localStorage.getItem('todayStudyTimes');

      if (storedProgress) {
        try {
          const { date, times } = JSON.parse(storedProgress);
          if (date === todayString) {
            console.log('Using existing localStorage data instead of loading from Firestore');
            setStudyTimes(times);
            return; // Exit early - localStorage data takes precedence
          }
        } catch (e) {
          console.error('Error parsing stored progress:', e);
        }
      }

      console.log('Loading today\'s progress from Firestore for date:', todayString);

      // Query sessions for today in Kolkata time
      const sessionsQuery = query(
        collection(db, 'users', user.uid, 'sessions'),
        where('date', '==', todayString)
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);

      // Calculate today's progress for each subject
      const todayStudyTimes = {
        Physics: 0,
        Chemistry: 0,
        Mathematics: 0,
        Biology: 0
      };

      if (sessionsSnapshot.empty) {
        console.log('No sessions found in Firestore for today');
      } else {
        console.log(`Found ${sessionsSnapshot.docs.length} sessions for today`);

        sessionsSnapshot.docs.forEach(doc => {
          const session = doc.data();
          if (session.subject && session.duration) {
            const subject = session.subject as Subject;
            if (subject in todayStudyTimes) {
              todayStudyTimes[subject] += session.duration;
            }
          }
        });
      }

      console.log('Today\'s progress loaded from Firestore:', todayStudyTimes);

      // Update study times with Firestore data
      setStudyTimes(todayStudyTimes);

      // Store today's progress in localStorage
      localStorage.setItem('todayStudyTimes', JSON.stringify({
        date: todayString,
        times: todayStudyTimes
      }));
    } catch (error) {
      console.error('Error loading today\'s progress from Firestore:', error);

      // Fall back to localStorage if available
      const storedProgress = localStorage.getItem('todayStudyTimes');
      if (storedProgress) {
        try {
          const { date, times } = JSON.parse(storedProgress);
          if (date === getKolkataDateString()) {
            console.log('Falling back to localStorage due to Firestore error');
            setStudyTimes(times);
          }
        } catch (e) {
          console.error('Error parsing stored progress:', e);
        }
      }
    }
  };

  // Function to sync offline sessions to Firebase
  const syncOfflineSessions = async () => {
    if (!user || !db) return;

    const offlineSessions = localStorage.getItem('offlineSessions');
    if (!offlineSessions) return;

    try {
      const sessions = JSON.parse(offlineSessions);
      if (!Array.isArray(sessions) || sessions.length === 0) return;

      console.log(`Attempting to sync ${sessions.length} offline sessions to Firebase`);

      // Process sessions in batches to avoid overwhelming Firebase
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < sessions.length; i += batchSize) {
        batches.push(sessions.slice(i, i + batchSize));
      }

      let successCount = 0;

      for (const batch of batches) {
        const promises = batch.map(async (session) => {
          try {
            // Add the session to Firestore
            await addDoc(collection(db, 'users', user.uid, 'sessions'), session);
            successCount++;
            return true;
          } catch (error) {
            console.error('Error syncing offline session:', error);
            return false;
          }
        });

        await Promise.all(promises);
      }

      if (successCount > 0) {
        console.log(`Successfully synced ${successCount} offline sessions to Firebase`);

        // Clear the synced sessions from localStorage
        localStorage.setItem('offlineSessions', JSON.stringify([]));

        // Show a toast notification
        toast({
          title: "Offline sessions synced",
          description: `${successCount} study sessions have been synced to the cloud`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error syncing offline sessions:', error);
    }
  };

  // Debug function to log localStorage data
  const debugLocalStorage = () => {
    const todayString = getKolkataDateString();
    const storedProgress = localStorage.getItem('todayStudyTimes');
    const lastUsedDate = localStorage.getItem('lastUsedDate');

    console.log('DEBUG - Today\'s date (Kolkata):', todayString);
    console.log('DEBUG - Last used date from localStorage:', lastUsedDate);

    if (storedProgress) {
      try {
        const parsed = JSON.parse(storedProgress);
        console.log('DEBUG - Stored progress from localStorage:', parsed);
        console.log('DEBUG - Is stored date === today?', parsed.date === todayString);
      } catch (e) {
        console.error('DEBUG - Error parsing stored progress:', e);
      }
    } else {
      console.log('DEBUG - No stored progress in localStorage');
    }

    console.log('DEBUG - Current studyTimes state:', studyTimes);
  };

  // Debug effect to log localStorage data on component mount and ensure localStorage is properly updated
  useEffect(() => {
    console.log('Study Tracker component mounted');
    debugLocalStorage();

    // Force update localStorage with current state to ensure it's always in sync
    const forceUpdateLocalStorage = () => {
      const todayString = getKolkataDateString();

      // Get current localStorage data
      const storedProgress = localStorage.getItem('todayStudyTimes');
      if (storedProgress) {
        try {
          const parsedData = JSON.parse(storedProgress);

          // Check if we have valid data with non-zero values
          if (parsedData && parsedData.times) {
            // Check if any subject has non-zero values
            const hasProgress = Object.values(parsedData.times).some(value => (value as number) > 0);

            if (hasProgress) {
              console.log('Found existing progress in localStorage, using it:', parsedData.times);

              // CRITICAL FIX: Update the state with the localStorage data
              setStudyTimes(parsedData.times);

              // Update the date to today
              localStorage.setItem('todayStudyTimes', JSON.stringify({
                date: todayString,
                times: parsedData.times
              }));

              // Log the updated state
              console.log('Updated studyTimes state with localStorage data:', parsedData.times);
            }
          }
        } catch (e) {
          console.error('Error parsing stored progress during force update:', e);
        }
      }

      // Ensure lastUsedDate is set to today
      localStorage.setItem('lastUsedDate', todayString);
    };

    // Run the force update
    forceUpdateLocalStorage();

    // MANUAL FIX: Check if we need to manually set the study times from localStorage
    // This is a fallback in case the automatic loading didn't work
    setTimeout(() => {
      const storedProgress = localStorage.getItem('todayStudyTimes');
      if (storedProgress) {
        try {
          const parsedData = JSON.parse(storedProgress);
          if (parsedData && parsedData.times) {
            // Check if any subject has non-zero values in localStorage
            const hasProgressInStorage = Object.values(parsedData.times).some(value => (value as number) > 0);

            // Check if current state has all zeros
            const hasProgressInState = Object.values(studyTimes).some(value => value > 0);

            if (hasProgressInStorage && !hasProgressInState) {
              console.log('MANUAL FIX: Current state has zeros but localStorage has progress, fixing...');
              setStudyTimes(parsedData.times);
              console.log('MANUAL FIX: Updated studyTimes state with localStorage data:', parsedData.times);
            }
          }
        } catch (e) {
          console.error('Error in manual fix:', e);
        }
      }
    }, 1000); // Wait 1 second to ensure all other loading has completed

    // Also log when the component unmounts
    return () => {
      console.log('Study Tracker component unmounted');
      console.log('Final studyTimes state:', studyTimes);

      // Save the final state to localStorage before unmounting
      forceSaveToLocalStorage();
      console.log('Saved final state to localStorage before unmount');
    };
  }, []);

  const loadStudyTimes = async () => {
    try {
      if (!user) return Promise.resolve()
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()
      if (userData?.studyTimes) {
        setStudyTimes(userData.studyTimes)
      }
      return Promise.resolve()
    } catch (error) {
      toast({
        title: "Error loading study times",
        description: "Please try again later",
        variant: "destructive"
      })
      return Promise.reject(error)
    }
  }

  const [showSettings, setShowSettings] = useState(false)

  // Effect to handle real-time study time updates - simplified for reliability
  useEffect(() => {
    if (isStudying && isRunning) {
      // Update function that runs every second
      const updateProgress = () => {
        // Only update progress during work phases in pomodoro mode
        if (mode === 'pomodoro' && currentPhase === 'break') {
          // During break phases, don't update the progress
          return;
        }

        // For both normal mode and pomodoro work phases
        const elapsedMinutes = Math.floor(totalElapsedTime / 60);
        const updatedTime = (sessionStartTime[selectedSubject] || 0) + elapsedMinutes;

        // Update the UI with the new study time
        setStudyTimes(prev => {
          const newTimes = {
            ...prev,
            [selectedSubject]: updatedTime
          };

          // Save to localStorage immediately to prevent data loss
          const todayString = getKolkataDateString();
          localStorage.setItem('todayStudyTimes', JSON.stringify({
            date: todayString,
            times: newTimes
          }));

          // Log the updated times to console for debugging
          console.log(`Real-time update: ${selectedSubject} time updated to ${updatedTime} minutes`);
          console.log('Current study times:', newTimes);

          return newTimes;
        });
      };

      // Run immediately
      updateProgress();

      // Then set interval to update every second
      const intervalId = setInterval(updateProgress, 1000);
      return () => clearInterval(intervalId);
    }
  }, [isStudying, isRunning, mode, currentPhase, selectedSubject, sessionStartTime, totalElapsedTime]);

  const startStudying = () => {
    // If we're already studying, we need to save the current session before starting a new one
    if (isStudying) {
      stopStudying().then(() => {
        // After stopping the previous session, start a new one
        startNewStudySession();
      });
    } else {
      // If we're not already studying, just start a new session
      startNewStudySession();
    }
  };

  // Helper function to start a new study session
  const startNewStudySession = () => {
    // Check if we're resuming from a paused state
    const pausedSubject = localStorage.getItem('pausedSubject');
    const pausedTotalElapsedTime = localStorage.getItem('pausedTotalElapsedTime');
    const pausedTime = localStorage.getItem('pausedTime');

    if (pausedSubject === selectedSubject && pausedTotalElapsedTime && pausedTime) {
      // We're resuming the same subject, don't reset the timer
      startTimer(true);
      setIsStudying(true);

      // Set the session start time for the selected subject
      setSessionStartTime({
        ...sessionStartTime,
        [selectedSubject]: studyTimes[selectedSubject]
      });

      toast({
        title: "Study session resumed",
        description: `Continuing ${selectedSubject} study session`
      });
    } else {
      // This is a new session, reset the timer
      resetTimer();

      // Start the timer
      startTimer();

      // Set studying state
      setIsStudying(true);

      // Set the session start time for the selected subject
      setSessionStartTime({
        ...sessionStartTime,
        [selectedSubject]: studyTimes[selectedSubject]
      });

      toast({
        title: "Study session started",
        description: `Subject: ${selectedSubject} - ${currentPhase === 'work' ? 'Work Time' : 'Break Time'}`
      });

      // Clear any paused state
      localStorage.removeItem('pausedSubject');
      localStorage.removeItem('pausedElapsedTime');
      localStorage.removeItem('pausedTime');
      localStorage.removeItem('pausedTotalElapsedTime');
      localStorage.removeItem('pausedSessionStartTime');
      localStorage.removeItem('pausedPhase');
    }
  };

  const stopStudying = async () => {
    // Stop the timer first
    stopTimer();
    // Set studying state to false
    setIsStudying(false);

    // Always reset the timer immediately when Stop Studying is clicked
    resetTimer();

    // For pomodoro mode, we don't need to save the session here
    // because we save each completed work phase separately
    if (mode === 'pomodoro') {
      return;
    }

    // For normal mode, save the entire session
    const minutes = Math.floor(totalElapsedTime / 60);

    if (minutes === 0) {
      toast({
        title: "Session too short",
        description: "Study for at least a minute to record the session",
        variant: "destructive"
      });
      return;
    }

    const saveStudySession = async (minutes: number, type: 'focus' | 'pomodoro') => {
      if (minutes === 0) return;

      // Use Kolkata time for the date
      const now = new Date();
      const kolkataDate = getKolkataDate();
      const todayString = kolkataDate.toISOString().split('T')[0]; // Use Kolkata date

      console.log('Saving session with date:', todayString, 'minutes:', minutes, 'subject:', selectedSubject);

      const session = {
        userId: user?.uid,
        subject: selectedSubject,
        duration: minutes,
        date: todayString,
        timestamp: Timestamp.now(),
        createdAt: now.toISOString(),
        type
      };

      // IMPORTANT FIX: Don't update local state with the time again since it's already been updated in real-time
      // Just save the session to localStorage for offline sync later
      const offlineSessions = JSON.parse(localStorage.getItem('offlineSessions') || '[]');
      offlineSessions.push(session);
      localStorage.setItem('offlineSessions', JSON.stringify(offlineSessions));

      console.log('Added session to offline sessions for later sync');

      // Only try to update Firebase if user is logged in
      if (user) {
        try {
          // Save only to the user's subcollection
          const userSessionRef = await addDoc(collection(db, 'users', user.uid, 'sessions'), session);

          // Update the user's total study time for leaderboard
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          const userData = userDoc.data();

          // Update both totalStudyTime and the subject-specific study time
          await updateDoc(userDocRef, {
            totalStudyTime: (userData?.totalStudyTime || 0) + minutes,
            lastUpdated: Timestamp.now(),
            [`studyTimes.${selectedSubject}`]: studyTimes[selectedSubject] // Use current value, not adding minutes again
          });

          // Refresh analytics data
          if (typeof window !== 'undefined') {
            // Dispatch a custom event that analytics components can listen for
            window.dispatchEvent(new CustomEvent('study-session-saved'));
          }

          console.log('Successfully saved session to Firebase');
        } catch (error) {
          console.error("Error saving session to Firebase:", error);
          toast({
            title: "Error saving to cloud",
            description: "Your session has been saved locally and will sync later",
            variant: "destructive"
          });
        }
      }

      toast({
        title: "Study session saved",
        description: `${minutes} minutes of ${selectedSubject} recorded`
      });
    };

    // Call saveStudySession to actually save the session
    await saveStudySession(minutes, mode === 'normal' ? 'focus' : 'pomodoro');

    setLoading(false);
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Format time helper for hours and minutes only
  const formatTimeHM = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Listen for pomodoro work phase completions
  useEffect(() => {
    if (isStudying && mode === 'pomodoro') {
      // Define the event type
      type PomodoroWorkCompletedEvent = CustomEvent<{
        duration: number;
        timestamp: string;
      }>;

      // Define the event handler with proper typing
      const handlePomodoroWorkCompleted = (event: Event) => {
        // Cast the event to our custom event type
        const customEvent = event as PomodoroWorkCompletedEvent;
        const { duration } = customEvent.detail;

        console.log(`Pomodoro work phase completed: ${duration} minutes`);
        console.log('Current study times before update:', studyTimes);

        // Update the study time for the current subject
        const updatedTime = studyTimes[selectedSubject] + duration;
        const newStudyTimes = { ...studyTimes, [selectedSubject]: updatedTime };

        // Always update local storage first
        const todayString = getKolkataDateString();
        localStorage.setItem('todayStudyTimes', JSON.stringify({
          date: todayString,
          times: newStudyTimes
        }));

        // Update local state
        setStudyTimes(newStudyTimes);

        console.log('Updated study times:', newStudyTimes);

        // Create the session object
        const now = new Date();
        const kolkataDate = getKolkataDate();
        const session = {
          userId: user?.uid,
          subject: selectedSubject,
          duration: duration,
          date: kolkataDate.toISOString().split('T')[0], // Use Kolkata date
          timestamp: Timestamp.now(),
          createdAt: now.toISOString(),
          type: 'pomodoro'
        };

        // Save the session to localStorage for offline sync later
        const offlineSessions = JSON.parse(localStorage.getItem('offlineSessions') || '[]');
        offlineSessions.push(session);
        localStorage.setItem('offlineSessions', JSON.stringify(offlineSessions));

        // Only try to update Firebase if user is logged in
        if (user) {
          try {
            // Update Firebase in the background
            updateDoc(doc(db, 'users', user.uid), {
              studyTimes: newStudyTimes
            }).then(() => {
              // Also update total study time for leaderboard
              getDoc(doc(db, 'users', user.uid)).then(userDoc => {
                const userData = userDoc.data();

                updateDoc(doc(db, 'users', user.uid), {
                  totalStudyTime: (userData?.totalStudyTime || 0) + duration,
                  lastUpdated: Timestamp.now()
                });

                // Save the completed pomodoro session
                addDoc(collection(db, 'users', user.uid, 'sessions'), session);

                console.log('Successfully saved pomodoro session to Firebase');
              });
            }).catch(error => {
              console.error("Error updating pomodoro study time in Firebase:", error);
              // Already saved to local storage, so no additional fallback needed
            });
          } catch (error) {
            console.error("Error updating pomodoro study time:", error);
            // Already saved to local storage, so no additional fallback needed
          }
        } else {
          // Offline mode - already saved to local storage
          updateStudyTime(selectedSubject, updatedTime);
        }

        toast({
          title: "Pomodoro Completed",
          description: `Added ${duration} minutes to ${selectedSubject}`,
        });
      };

      // Add the event listener
      window.addEventListener('pomodoro-work-completed', handlePomodoroWorkCompleted);

      return () => {
        window.removeEventListener('pomodoro-work-completed', handlePomodoroWorkCompleted);
      };
    }
  }, [isStudying, mode, selectedSubject, studyTimes, user, db]);

  // Listen for minute changes from the timer
  useEffect(() => {
    if (isStudying) {
      const handleMinuteChanged = (event: Event) => {
        const customEvent = event as CustomEvent<{minutes: number}>;
        console.log(`Minute changed: ${customEvent.detail.minutes} minutes elapsed`);

        // Force an update of the study time display
        const updateStudyTimeDisplay = async () => {
          if (mode === 'normal') {
            // For normal mode, update the actual study time
            const currentElapsedMinutes = Math.floor(totalElapsedTime / 60);
            const updatedTime = sessionStartTime[selectedSubject] + currentElapsedMinutes;

            const newStudyTimes = { ...studyTimes, [selectedSubject]: updatedTime };

            // Update local state immediately
            setStudyTimes(newStudyTimes);

            // Save to localStorage immediately (not to Firebase)
            const todayString = getKolkataDateString();
            localStorage.setItem('todayStudyTimes', JSON.stringify({
              date: todayString,
              times: newStudyTimes
            }));

            console.log(`Minute update: ${selectedSubject} time updated to ${updatedTime} minutes`);
            console.log('Current study times:', newStudyTimes);
          } else {
            // For pomodoro mode, update the display time
            const currentElapsedMinutes = Math.floor(totalElapsedTime / 60);
            const pomodoroRatio = pomodoroSettings.workDuration / (pomodoroSettings.workDuration + pomodoroSettings.breakDuration);
            const estimatedWorkMinutes = Math.floor(currentElapsedMinutes * pomodoroRatio);
            const baseStudyTime = sessionStartTime[selectedSubject] || 0;
            const displayTime = baseStudyTime + estimatedWorkMinutes;

            // Update UI state only
            setStudyTimes(prev => {
              const newTimes = {
                ...prev,
                [selectedSubject]: displayTime
              };

              // Save to localStorage immediately
              const todayString = getKolkataDateString();
              localStorage.setItem('todayStudyTimes', JSON.stringify({
                date: todayString,
                times: newTimes
              }));

              console.log(`Pomodoro minute update: ${selectedSubject} time updated to ${displayTime} minutes`);
              console.log('Current study times:', newTimes);

              return newTimes;
            });
          }
        };

        updateStudyTimeDisplay();
      };

      window.addEventListener('timer-minute-changed', handleMinuteChanged);

      return () => {
        window.removeEventListener('timer-minute-changed', handleMinuteChanged);
      };
    }
  }, [isStudying, mode, selectedSubject, sessionStartTime, studyTimes, pomodoroSettings]);

  // Remove the periodic Firebase update effect and replace with a check for date changes
  useEffect(() => {
    if (isStudying && isRunning) {
      // Function to check if the date has changed
      const checkDateChange = () => {
        const currentDateString = getKolkataDateString();
        const lastDateString = localStorage.getItem('lastUsedDate');

        if (lastDateString && lastDateString !== currentDateString) {
          console.log('Date changed during study session, updating...');
          localStorage.setItem('lastUsedDate', currentDateString);

          // Reset today's progress for the new day
          const resetTimes = {
            Physics: 0,
            Chemistry: 0,
            Mathematics: 0,
            Biology: 0
          };

          // Save the reset progress to localStorage
          localStorage.setItem('todayStudyTimes', JSON.stringify({
            date: currentDateString,
            times: resetTimes
          }));

          // Update the state
          setStudyTimes(resetTimes);

          // Stop the current session as we've moved to a new day
          stopStudying();

          toast({
            title: "New day detected",
            description: "Your study session has been saved and a new day has begun",
            variant: "default"
          });
        }
      };

      // Check every minute for date changes
      const dateCheckInterval = setInterval(checkDateChange, 60000);
      return () => clearInterval(dateCheckInterval);
    }
  }, [isStudying, isRunning]);

  // Calculate progress percentage for circular timer
  const calculateProgress = () => {
    if (mode === 'pomodoro') {
      const totalDuration = currentPhase === 'work'
        ? pomodoroSettings.workDuration
        : pomodoroSettings.breakDuration;

      return ((totalDuration - currentTime) / totalDuration) * 100;
    }
    return 0;
  }

  // Toggle full screen mode
  const toggleFullScreen = () => {
    setFullScreenMode(!fullScreenMode);
  }

  // Handle study mode switch
  const handleStudyModeSwitch = () => {
    if (isStudying) {
      toast({
        title: "Cannot Switch Mode While Studying",
        description: "Please stop your current study session before switching modes.",
        variant: "destructive"
      });
      return;
    }

    // Switch mode
    const newMode = studyMode === 'PCM' ? 'PCB' : 'PCM';
    setStudyMode(newMode);

    // If current subject is Mathematics and switching to PCB, change to Biology
    if (selectedSubject === 'Mathematics' && newMode === 'PCB') {
      setSelectedSubject('Biology');
    }
    // If current subject is Biology and switching to PCM, change to Mathematics
    else if (selectedSubject === 'Biology' && newMode === 'PCM') {
      setSelectedSubject('Mathematics');
    }

    toast({
      title: `Switched to ${newMode} Mode`,
      description: newMode === 'PCM' ? "Physics, Chemistry, Mathematics" : "Physics, Chemistry, Biology"
    });
  };

  // Handle target time changes
  const handleTargetTimeChange = (subject: Subject, timeInSeconds: number) => {
    setTargetTimes(prev => ({
      ...prev,
      [subject]: timeInSeconds
    }))
  }

  // Add a function to force save the current state to localStorage
  const forceSaveToLocalStorage = () => {
    const todayString = getKolkataDateString();
    localStorage.setItem('todayStudyTimes', JSON.stringify({
      date: todayString,
      times: studyTimes
    }));
    console.log('Forced save to localStorage:', studyTimes);
    localStorage.setItem('lastUsedDate', todayString);
  };

  // Update localStorage cache whenever studyTimes changes
  useEffect(() => {
    // Store today's progress in localStorage as a fallback
    const todayString = getKolkataDateString();
    localStorage.setItem('todayStudyTimes', JSON.stringify({
      date: todayString,
      times: studyTimes
    }));
    console.log('Saved studyTimes to localStorage:', studyTimes);

    // Also update the lastUsedDate to ensure it's always current
    localStorage.setItem('lastUsedDate', todayString);
  }, [studyTimes]);

  // Add a window event listener to save state before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      forceSaveToLocalStorage();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [studyTimes]);

  // Add periodic Firebase sync every 30 minutes
  useEffect(() => {
    // Only set up sync if user is logged in
    if (!user || !db) return;

    console.log('Setting up periodic Firebase sync every 30 minutes');

    const syncToFirebase = async () => {
      try {
        console.log('Performing periodic Firebase sync...');

        // Get the current study times
        const todayString = getKolkataDateString();

        // Update Firebase with current study times
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
          studyTimes: studyTimes,
          lastUpdated: Timestamp.now()
        });

        // Also sync any offline sessions
        await syncOfflineSessions();

        console.log('Periodic Firebase sync completed successfully');
      } catch (error) {
        console.error('Error during periodic Firebase sync:', error);
      }
    };

    // Run sync every 30 minutes (1800000 ms)
    const syncInterval = setInterval(syncToFirebase, 1800000);

    // Also sync when component mounts
    syncToFirebase();

    return () => clearInterval(syncInterval);
  }, [user, db, studyTimes]);

  return (
    <div className={cn("study-tracker", expanded && "expanded")}>
      {fullScreenMode && mode === 'pomodoro' ? (
        // Full screen pomodoro timer with circular progress
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 overflow-hidden">
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullScreen}
              className="text-white hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="text-xl text-white/80 mb-8">
            {currentPhase === 'work' ? 'Work Time' : 'Break Time'}
          </div>

          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96">
            {/* Background circle */}
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>

            {/* Progress circle - using SVG for better browser compatibility */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="transparent"
                stroke="var(--primary)"
                strokeWidth="8"
                strokeDasharray={`${calculateProgress() * 2.89} 1000`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>

            {/* Timer text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold text-white">
                {formatTime(currentTime)}
              </div>
            </div>
          </div>

          <div className="mt-10 flex gap-4 justify-center w-full">
            <Button
              variant={isRunning ? "outline" : "default"}
              onClick={() => {
                if (isRunning) {
                  pauseTimer();
                } else {
                  startTimer(true);
                }
              }}
              className="w-32"
            >
              {isRunning ? "Pause" : "Resume"}
            </Button>

            {currentPhase !== 'work' && (
              <Button
                variant="secondary"
                onClick={skipBreak}
                className="w-32"
              >
                Skip Break
              </Button>
            )}
          </div>
        </div>
      ) : (
        // Regular view
        <Card className={cn("w-full", expanded && "max-w-6xl mx-auto")}>
      <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle>Study Tracker</CardTitle>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
                  onClick={() => {
                    // Always confirm before switching modes
                    if (isStudying || currentTime > 0) {
                      if (window.confirm("Switching timer modes will reset your timer completely. Continue?")) {
                        // Switch modes - the timer will be reset by the effect in the provider
                        setMode(mode === 'normal' ? 'pomodoro' : 'normal');
                      }
                    } else {
                      // If not studying and timer is at 0, just switch modes
                      setMode(mode === 'normal' ? 'pomodoro' : 'normal');
                    }
                  }}
                  className="flex-1 sm:flex-none"
            >
              {mode === 'normal' ? 'Switch to Pomodoro' : 'Switch to Normal'}
            </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStudyModeSwitch}
                  className="flex-1 sm:flex-none"
                >
                  {studyMode === 'PCM' ? 'Switch to PCB' : 'Switch to PCM'}
                </Button>

            {mode === 'pomodoro' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                    className="flex-1 sm:flex-none"
              >
                Settings
              </Button>
            )}
                {mode === 'pomodoro' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleFullScreen}
                    className="flex-1 sm:flex-none"
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Full Screen
                  </Button>
                )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showSettings && mode === 'pomodoro' && (
          <div className="mb-6 p-4 border rounded-lg">
            <h3 className="font-semibold mb-4">Pomodoro Settings</h3>
            <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={pomodoroSettings.workDuration / 60}
                    onChange={(e) => setPomodoroSettings({
                      ...pomodoroSettings,
                      workDuration: parseInt(e.target.value) * 60
                    })}
                    min={1}
                    max={120}
                  />
                </div>
                <div className="space-y-2">
                      <Label>Short Break Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={pomodoroSettings.breakDuration / 60}
                    onChange={(e) => setPomodoroSettings({
                      ...pomodoroSettings,
                      breakDuration: parseInt(e.target.value) * 60
                    })}
                    min={1}
                    max={30}
                  />
                </div>
                    <div className="space-y-2">
                      <Label>Long Break Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={pomodoroSettings.longBreakDuration / 60}
                        onChange={(e) => setPomodoroSettings({
                          ...pomodoroSettings,
                          longBreakDuration: parseInt(e.target.value) * 60
                        })}
                        min={5}
                        max={60}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sessions Before Long Break</Label>
                      <Input
                        type="number"
                        value={pomodoroSettings.sessionsBeforeLongBreak}
                        onChange={(e) => setPomodoroSettings({
                          ...pomodoroSettings,
                          sessionsBeforeLongBreak: parseInt(e.target.value)
                        })}
                        min={1}
                        max={10}
                      />
                    </div>
              </div>
            </div>
          </div>
        )}
        <div className={cn(
          "space-y-6",
          expanded && "md:grid md:grid-cols-2 md:gap-6 md:space-y-0"
        )}>
          {/* Timer Section */}
          <div className="space-y-6">
                <div className="flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <Button
                  key={subject}
                  variant={selectedSubject === subject ? "default" : "outline"}
                  onClick={() => {
                    // If we're studying, we need to handle subject switching
                    if (isStudying) {
                      // Save the current session
                      stopStudying().then(() => {
                        // Change the subject
                        setSelectedSubject(subject);
                        // Start a new session with the new subject
                        startNewStudySession();
                      });
                    } else {
                      // If not studying, just change the subject
                      setSelectedSubject(subject);
                    }
                  }}
                  disabled={isStudying && isRunning} // Only disable if actively running
                      className="flex-1 subject-button"
                >
                  {subject}
                </Button>
              ))}
            </div>

                <div className="text-center py-16 sm:py-28 px-8 sm:px-16 rounded-lg bg-black w-full max-w-6xl mx-auto mb-10 min-h-[80vh] flex flex-col justify-center">
              {mode === 'pomodoro' && (
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-sm text-muted-foreground">
                  {currentPhase === 'work' ? 'Work Time' : 'Break Time'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Session {completedSessions + (currentPhase === 'work' ? 1 : 0)} of {pomodoroSettings.sessionsBeforeLongBreak}
                      </div>
                </div>
              )}
                  {/* TIMER DISPLAY */}
                  <div className="w-full flex justify-center items-center my-auto py-16 sm:py-24">
                    <div className="bg-primary/5 rounded-lg p-8 md:p-12 shadow-md">
                      <div className="text-[60px] xs:text-[70px] sm:text-[90px] md:text-[110px] lg:text-[130px] font-bold font-mono leading-none text-center text-primary">
                {formatTime(currentTime)}
              </div>
                    </div>
                  </div>

                  {/* Show different buttons based on mode and phase */}
                  {mode === 'pomodoro' && currentPhase === 'break' ? (
                    // Break phase buttons
                    <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                  <Button
                    variant={isRunning ? "outline" : "default"}
                        size="default"
                        className="w-full sm:w-36 h-10 text-sm"
                        onClick={() => {
                          if (isRunning) {
                            pauseTimer();
                          } else {
                            startTimer(true);
                          }
                        }}
                      >
                        {isRunning ? "Pause Break" : "Resume Break"}
                      </Button>

                      <Button
                        variant="secondary"
                        size="default"
                        className="w-full sm:w-36 h-10 text-sm"
                        onClick={skipBreak}
                      >
                        Skip Break
                      </Button>
                    </div>
                  ) : (
                    // Normal study buttons
                    isStudying ? (
                      <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                        <Button
                          variant={isRunning ? "outline" : "default"}
                          size="default"
                    disabled={loading}
                          className="w-full sm:w-36 h-10 text-sm"
                    onClick={() => {
                      if (isRunning) {
                        pauseTimer();
                        localStorage.setItem('pausedSubject', selectedSubject);
                        toast({
                          title: "Timer Paused",
                          description: "Click Resume to continue studying"
                        });
                      } else {
                        // Check if we're resuming with a different subject
                        const pausedSubject = localStorage.getItem('pausedSubject');

                        if (pausedSubject && pausedSubject !== selectedSubject) {
                          // If switching subjects while paused, save the current session and start a new one
                          stopStudying().then(() => {
                            startNewStudySession();
                          });
                        } else {
                          // Resume the timer with the same subject
                          startTimer(true);
                          toast({
                            title: "Timer Resumed",
                            description: "Keep up the good work!"
                          });
                        }
                      }
                    }}
                  >
                    {isRunning ? "Pause" : "Resume"}
                  </Button>

                        <Button
                          variant="destructive"
                          size="default"
                          disabled={loading}
                          className="w-full sm:w-36 h-10 text-sm"
                          onClick={stopStudying}
                        >
                        Stop Studying
                      </Button>
                </div>
              ) : (
                      <div className="flex justify-center w-full">
                <Button
                          variant="default"
                          size="default"
                  disabled={loading}
                          className="w-full sm:w-36 h-10 text-sm"
                          onClick={startStudying}
                >
                          Start Studying
                </Button>
                      </div>
                    )
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
              <h3 className="text-lg font-medium">Today's Progress</h3>
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Settings2 className="h-4 w-4 mr-2" />
                      Study Goals
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[95vw] sm:max-w-[425px]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Daily Study Goals</AlertDialogTitle>
                      <AlertDialogDescription>
                        Set your target study hours for each subject.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-6 py-4">
                      {subjects.map((subject) => (
                        <div key={subject} className="grid gap-2">
                          <Label htmlFor={subject} className="font-medium">
                            {subject}
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={subject}
                              type="number"
                              value={targetTimes[subject] / 60 / 60}
                              onChange={(e) => handleTargetTimeChange(subject, Math.max(0, parseFloat(e.target.value) || 0) * 60 * 60)}
                              className="w-20"
                              min="0"
                              step="0.5"
                            />
                            <span className="text-muted-foreground">hours</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Close</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset Progress
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Today's Progress</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to reset today's study progress? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          // Reset progress for all subjects
                          const resetTimes = {
                            Physics: 0,
                            Chemistry: 0,
                            Mathematics: 0,
                            Biology: 0
                          };

                          // Update study times state
                          setStudyTimes(resetTimes);

                          // Update localStorage
                          const todayString = getKolkataDateString();
                          localStorage.setItem('todayStudyTimes', JSON.stringify({
                            date: todayString,
                            times: resetTimes
                          }));

                          toast({
                            title: "Progress Reset",
                            description: "Today's study progress has been reset",
                            variant: "default"
                          });
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Reset Progress
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="progress-text">Physics <span className="text-muted-foreground">Goal: {formatTimeHM(targetTimes.Physics)}</span></div>
                    <div className="progress-value">{formatTimeHM(subjectProgress.Physics * 60 * 60)} {Math.round((subjectProgress.Physics / (targetTimes.Physics / 60 / 60)) * 100)}%</div>
              </div>
              <Progress value={(subjectProgress.Physics / (targetTimes.Physics / 60 / 60)) * 100} />

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="progress-text">Chemistry <span className="text-muted-foreground">Goal: {formatTimeHM(targetTimes.Chemistry)}</span></div>
                    <div className="progress-value">{formatTimeHM(subjectProgress.Chemistry * 60 * 60)} {Math.round((subjectProgress.Chemistry / (targetTimes.Chemistry / 60 / 60)) * 100)}%</div>
              </div>
              <Progress value={(subjectProgress.Chemistry / (targetTimes.Chemistry / 60 / 60)) * 100} />

                  {studyMode === 'PCM' ? (
                    <div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="progress-text">Mathematics <span className="text-muted-foreground">Goal: {formatTimeHM(targetTimes.Mathematics)}</span></div>
                        <div className="progress-value">{formatTimeHM(subjectProgress.Mathematics * 60 * 60)} {Math.round((subjectProgress.Mathematics / (targetTimes.Mathematics / 60 / 60)) * 100)}%</div>
              </div>
              <Progress value={(subjectProgress.Mathematics / (targetTimes.Mathematics / 60 / 60)) * 100} />
            </div>
                  ) : (
                    <div>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                        <div className="progress-text">Biology <span className="text-muted-foreground">Goal: {formatTimeHM(targetTimes.Biology)}</span></div>
                        <div className="progress-value">{formatTimeHM(subjectProgress.Biology * 60 * 60)} {Math.round((subjectProgress.Biology / (targetTimes.Biology / 60 / 60)) * 100)}%</div>
                      </div>
                      <Progress value={(subjectProgress.Biology / (targetTimes.Biology / 60 / 60)) * 100} />
                    </div>
                  )}
                </div>
          </div>
        </div>
      </CardContent>
    </Card>
      )}
    </div>
  )
}

