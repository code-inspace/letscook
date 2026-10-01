"use client";

import React, { useState, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface AudioPillProps {
  audioUrl?: string | null;
}

export function AudioPill({ audioUrl }: AudioPillProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!audioUrl) return null;

  // Waveform bars with predefined heights (8 to 24px)
  const barHeights = [10, 16, 22, 14, 24, 18, 12, 20, 14];

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error("Audio playback error:", err);
          setIsPlaying(false);
        });
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="flex justify-center mt-6">
      <div className="h-12 p-1 pl-1 pr-4 rounded-full bg-white/20 border border-white/30 backdrop-blur-md flex items-center gap-3">
        {/* Play/Pause round button 40px */}
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={isPlaying ? "Mettre en pause l'audio" : "Lire l'audio"}
          className="w-10 h-10 rounded-full bg-white/30 hover:bg-white/40 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
        >
          {isPlaying ? (
            <VolumeX className="w-5 h-5 text-white" strokeWidth={1.5} />
          ) : (
            <Volume2 className="w-5 h-5 text-white" strokeWidth={1.5} />
          )}
        </button>

        {/* 9-bar waveform */}
        <div className="flex items-center gap-[4px] h-6 px-1">
          {barHeights.map((height, index) => (
            <span
              key={index}
              className={`w-[2px] rounded-full bg-white transition-all ${
                isPlaying ? "waveform-bar-playing" : "opacity-80"
              }`}
              style={{
                height: `${height}px`,
                animationDelay: `${(index % 5) * 0.15}s`,
                animationDuration: `${0.8 + (index % 3) * 0.2}s`,
              }}
            />
          ))}
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleEnded}
          className="hidden"
          preload="none"
        />
      </div>
    </div>
  );
}
