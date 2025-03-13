"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from "./ui/card"

// Fallback quotes in case the API fails
const fallbackQuotes = [
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { quote: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" }
]

export function MotivationalQuote() {
  const [quote, setQuote] = useState({ quote: '', author: '' })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('https://quotes-api-self.vercel.app/quote')
        
        if (!response.ok) {
          throw new Error('Failed to fetch quote')
        }
        
        const data = await response.json()
        setQuote(data)
      } catch (error) {
        console.error('Error fetching quote:', error)
        // Use a fallback quote if API fails
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)]
        setQuote(randomQuote)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuote()
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading inspirational quote...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <blockquote className="text-lg italic">
          "{quote.quote}"
        </blockquote>
        {quote.author && (
          <div className="mt-2 text-right text-sm text-muted-foreground">
            — {quote.author}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

