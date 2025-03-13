"use client"

import { useState, useEffect } from 'react'
import { Quote } from 'lucide-react'

interface QuoteData {
  quote: string
  author: string
}

const fallbackQuotes = [
  {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  },
  {
    quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  },
  {
    quote: "Believe you can and you're halfway there.",
    author: "Theodore Roosevelt"
  },
  {
    quote: "The future belongs to those who believe in the beauty of their dreams.",
    author: "Eleanor Roosevelt"
  }
]

export function RotatingQuote() {
  const [quote, setQuote] = useState<QuoteData>(fallbackQuotes[0])
  const [loading, setLoading] = useState(true)

  const fetchQuote = async () => {
    try {
      setLoading(true)
      const response = await fetch('https://quotes-api-self.vercel.app/quote')
      if (!response.ok) throw new Error('Failed to fetch quote')
      
      const data = await response.json()
      if (data && data.quote) {
        setQuote({
          quote: data.quote,
          author: data.author
        })
      } else {
        // Use a random fallback quote if API response is malformed
        setQuote(fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)])
      }
    } catch (error) {
      console.error('Error fetching quote:', error)
      // Use a random fallback quote if API fails
      setQuote(fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuote()
    const interval = setInterval(fetchQuote, 30000) // Fetch new quote every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="animate-pulse h-20 bg-muted rounded-lg"></div>
  }

  return (
    <div className="flex items-start gap-2 p-4 rounded-lg bg-muted/50">
      <Quote className="h-4 w-4 text-primary shrink-0 mt-1" />
      <div>
        <p className="text-sm italic">{quote.quote}</p>
        <p className="text-xs text-muted-foreground mt-2">
          - {quote.author}
        </p>
      </div>
    </div>
  )
} 
