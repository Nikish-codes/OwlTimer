"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Eraser } from "lucide-react"
import { getJournalEntries, saveJournalEntries, clearAllJournalEntries, type JournalEntry } from "@/lib/storage"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"

export function ThoughtJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [newEntry, setNewEntry] = useState("")
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
  const [showClearAllDialog, setShowClearAllDialog] = useState(false)

  // Load entries from localStorage on mount
  useEffect(() => {
    const savedEntries = getJournalEntries()
    if (savedEntries.length > 0) {
      setEntries(savedEntries)
    }
  }, [])

  // Save entries to localStorage whenever they change
  useEffect(() => {
    saveJournalEntries(entries)
  }, [entries])

  // Add new journal entry
  const addEntry = () => {
    if (newEntry.trim()) {
      const entry: JournalEntry = {
        id: Date.now().toString(),
        text: newEntry,
        timestamp: new Date().toISOString(),
      }
      setEntries([entry, ...entries])
      setNewEntry("")
      
      toast({
        title: "Thought saved",
        description: "Your journal entry has been saved to local storage."
      })
    }
  }

  // Delete journal entry
  const deleteEntry = (id: string) => {
    const updatedEntries = entries.filter((entry) => entry.id !== id)
    setEntries(updatedEntries)
    saveJournalEntries(updatedEntries)
    setEntryToDelete(null)
    
    toast({
      title: "Entry deleted",
      description: "Your journal entry has been removed."
    })
  }
  
  // Clear all entries
  const clearAllEntries = () => {
    setEntries([])
    clearAllJournalEntries()
    setShowClearAllDialog(false)
    
    toast({
      title: "All entries cleared",
      description: "All your journal entries have been deleted from local storage.",
      variant: "destructive"
    })
  }

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Thought Journal</h2>
        
        {entries.length > 0 && (
          <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Eraser className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Journal Entries</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete all your journal entries? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAllEntries} className="bg-destructive text-destructive-foreground">
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Your thoughts are saved only to your local device and are not synced to the cloud.
      </p>

      <Textarea
        placeholder="Write down your thoughts..."
        value={newEntry}
        onChange={(e) => setNewEntry(e.target.value)}
        className="mb-2 min-h-[100px]"
      />

      <div className="flex justify-end mb-8">
        <Button onClick={addEntry} disabled={!newEntry.trim()}>Add</Button>
      </div>

      <div className="space-y-4">
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No journal entries yet. Start writing your thoughts!</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="p-4 rounded-lg bg-card relative group border">
              <p className="mb-2 pr-6">{entry.text}</p>
              <p className="text-xs text-muted-foreground">{formatTimestamp(entry.timestamp)}</p>
              
              <AlertDialog open={entryToDelete === entry.id} onOpenChange={(open) => !open && setEntryToDelete(null)}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEntryToDelete(entry.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this journal entry? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteEntry(entry.id)} className="bg-destructive text-destructive-foreground">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </div>
  )
}