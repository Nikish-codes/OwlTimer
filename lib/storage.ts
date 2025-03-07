// Storage utilities for the ThoughtJournal component
// All data is stored ONLY in localStorage and is not synced to any external services

export interface JournalEntry {
  id: string;
  text: string;
  timestamp: string;
}

// Local storage key
const JOURNAL_STORAGE_KEY = 'journal_entries_local_only';

// Get journal entries from localStorage
export function getJournalEntries(): JournalEntry[] {
  if (typeof window === 'undefined') return [];
  
  const entries = localStorage.getItem(JOURNAL_STORAGE_KEY);
  if (!entries) return [];
  
  try {
    return JSON.parse(entries);
  } catch (error) {
    console.error('Error parsing journal entries:', error);
    return [];
  }
}

// Save journal entries to localStorage only
export function saveJournalEntries(entries: JournalEntry[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving journal entries:', error);
  }
}

// Clear all journal entries (for privacy)
export function clearAllJournalEntries(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(JOURNAL_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing journal entries:', error);
  }
}