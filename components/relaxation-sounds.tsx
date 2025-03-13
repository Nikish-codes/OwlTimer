"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import { Play, Pause, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAudioState } from "@/components/audio-state-provider"

type Sound = {
  name: string
  src: string
}

export function RelaxationSounds() {
  const { playing, volume, toggleSound, handleVolumeChange } = useAudioState()
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const sounds: Sound[] = [
    {
      name: "Rain",
      src: "https://dn720006.ca.archive.org/0/items/relaxingsounds/Rain%204%20%28Med.-Light%29%2010h%20LowGentleThunder-Overcast%20Day.mp3",
    },
    {
      name: "Ocean",
      src: "https://ia800309.us.archive.org/28/items/ocean-sea-sounds/Gentle%20Ocean.mp3",
    },
    {
      name: "Forest",
      src: "https://ia800309.us.archive.org/28/items/ocean-sea-sounds/Gentle%20Ocean.mp3",
    },
    {
      name: "Cafe",
      src: "https://tracks.coffitivity.com/morningMurmur.mp3",
    },
  ]

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
    <div>
      <h2 className="text-2xl font-bold mb-8">Relaxation Sounds</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {sounds.map((sound) => (
          <Button
            key={sound.name}
            variant="outline"
            className={`flex items-center justify-center py-6 ${playing === sound.name ? "bg-secondary border-primary" : ""}`}
            onClick={() => toggleSound(sound)}
          >
            {playing === sound.name ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {sound.name}
          </Button>
        ))}
      </div>
      <div className="flex items-center">
        <Volume2 className="h-5 w-5 mr-3" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="volume-slider flex-1"
        />
      </div>
    </div>
  )
}
