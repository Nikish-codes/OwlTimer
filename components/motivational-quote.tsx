"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from "@/components/ui/card"

const quotes = [
  "The only way to do great work is to love what you do. - Steve Jobs",
  "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
  "Believe you can and you're halfway there. - Theodore Roosevelt",
  "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
  "Strive not to be a success, but rather to be of value. - Albert Einstein"
]

export function MotivationalQuote() {
  const [quote, setQuote] = useState('')

  useEffect(() => {
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)]
    setQuote(randomQuote)
  }, [])

  return (
    <Card>
      <CardContent className="p-6">
        <blockquote className="text-lg italic">
          "{quote}"
        </blockquote>
      </CardContent>
    </Card>
  )
}

