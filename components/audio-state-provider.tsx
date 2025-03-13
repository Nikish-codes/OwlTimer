"use client"

import React, { createContext, useContext, useState, useRef, useEffect } from 'react'

type Sound = {
  name: string
  src: string
}

interface AudioStateContextType {
  playing: string | null
  volume: number
  toggleSound: (sound: Sound) => void
  handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const AudioStateContext = createContext<AudioStateContextType | undefined>(undefined)

export function AudioStateProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.5)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Play or pause sound
  const toggleSound = (sound: Sound) => {
    if (playing === sound.name) {
      audioRef.current?.pause()
      setPlaying(null)
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const audio = new Audio(sound.src)
      audio.volume = volume
      audio.loop = true
      // Try to play the audio
      audio.play().catch((error) => {
        console.error("Error playing audio:", error)
      })
      audioRef.current = audio
      setPlaying(sound.name)
    }
  }

  // Update volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number.parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  return (
    <AudioStateContext.Provider
      value={{
        playing,
        volume,
        toggleSound,
        handleVolumeChange
      }}
    >
      {children}
    </AudioStateContext.Provider>
  )
}

export const useAudioState = () => {
  const context = useContext(AudioStateContext)
  if (context === undefined) {
    throw new Error('useAudioState must be used within an AudioStateProvider')
  }
  return context
}
