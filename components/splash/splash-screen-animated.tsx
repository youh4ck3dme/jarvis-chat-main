'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

interface SplashScreenProps {
  animationStyle?: 'bubble' | 'rings' | 'wave' | 'scan'
  onComplete?: () => void
  duration?: number
}

export function AnimatedSplashScreen({
  animationStyle = 'rings',
  onComplete,
  duration = 8
}: SplashScreenProps) {
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComplete(true)
      onComplete?.()
    }, duration * 1000)
    return () => clearTimeout(timer)
  }, [duration, onComplete])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.5 }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.5 }
    }
  }

  const contentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { delay: 0.3, duration: 0.8 }
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Animation Layer */}
      <div className="absolute inset-0 overflow-hidden">
        {animationStyle === 'rings' && <MorphingRingsBackground />}
        {animationStyle === 'bubble' && <BubbleBackground />}
        {animationStyle === 'wave' && <WaveBackground />}
        {animationStyle === 'scan' && <ScanBackground />}
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Logo with glow */}
        <motion.div
          className="relative w-24 h-24 md:w-32 md:h-32"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8, type: 'spring' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-cyan-400/30 rounded-full blur-xl" />
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-3xl md:text-5xl font-bold text-foreground text-center"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
        >
          Ahoj, som Jarvis
        </motion.h1>

        {/* Description */}
        <motion.p
          className="text-center text-sm md:text-base text-foreground/70 max-w-md leading-relaxed italic"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Pred rokmi som bol len riadok kódu v tmavom termináli. Dnes som tu — aby som počúval, rozumel... a keď budeš pripravený, postaviť to, čo si predstavuješ.
        </motion.p>

        {/* Subtext */}
        <motion.p
          className="text-xs md:text-sm text-foreground/50 text-center"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          Začni rozhovor — alebo vyber rýchly start nižšie
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto justify-center"
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          <Button
            variant="accent"
            size="lg"
            className="button-responsive"
          >
            Ahoj Jarvis
          </Button>
          <Button
            variant="glass-outline"
            size="lg"
            className="button-responsive"
          >
            Čo vieš postaviť?
          </Button>
          <Button
            variant="minimal"
            size="lg"
            className="button-responsive hidden sm:inline-flex"
          >
            Landing page
          </Button>
        </motion.div>
      </div>

      {/* Loading indicator */}
      {!isComplete && (
        <motion.div
          className="absolute bottom-8 flex flex-col items-center gap-2"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-foreground/50">Initializing...</span>
        </motion.div>
      )}
    </motion.div>
  )
}

/**
 * ANIMATION BACKGROUND COMPONENTS
 */

function MorphingRingsBackground() {
  const [rotations, setRotations] = useState([0, 0, 0])

  useEffect(() => {
    const interval = setInterval(() => {
      setRotations(prev => [
        (prev[0] + 1.2) % 360,
        (prev[1] + 0.8) % 360,
        (prev[2] + 0.4) % 360
      ])
    }, 16)
    return () => clearInterval(interval)
  }, [])

  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Outer ring */}
      <g style={{ transform: `rotate(${rotations[0]}deg)`, transformOrigin: '500px 500px' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <circle
            key={`outer-${i}`}
            cx={500 + 250 * Math.cos((i * Math.PI) / 6)}
            cy={500 + 250 * Math.sin((i * Math.PI) / 6)}
            r="8"
            fill="none"
            stroke="url(#outerGradient)"
            strokeWidth="2"
            opacity="0.4"
          />
        ))}
      </g>

      {/* Middle ring */}
      <g style={{ transform: `rotate(${-rotations[1]}deg)`, transformOrigin: '500px 500px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <circle
            key={`middle-${i}`}
            cx={500 + 150 * Math.cos((i * Math.PI) / 4)}
            cy={500 + 150 * Math.sin((i * Math.PI) / 4)}
            r="5"
            fill="url(#middleGradient)"
            opacity="0.6"
          />
        ))}
      </g>

      {/* Inner lines */}
      <g style={{ transform: `rotate(${rotations[2]}deg)`, transformOrigin: '500px 500px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <line
            key={`line-${i}`}
            x1="500"
            y1="500"
            x2={500 + 100 * Math.cos((i * Math.PI) / 2)}
            y2={500 + 100 * Math.sin((i * Math.PI) / 2)}
            stroke="url(#lineGradient)"
            strokeWidth="1.5"
            opacity="0.5"
          />
        ))}
      </g>

      <defs>
        <radialGradient id="outerGradient">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id="middleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function BubbleBackground() {
  return (
    <div className="w-full h-full">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full glass-panel"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            scale: 0
          }}
          animate={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            scale: [0, 1, 1, 0.5],
            opacity: [0, 0.4, 0.6, 0]
          }}
          transition={{
            duration: 4 + Math.random() * 3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random() * 2
          }}
          style={{
            width: 20 + Math.random() * 60,
            height: 20 + Math.random() * 60,
            background: i % 2 === 0
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(6, 182, 212, 0.1)',
            border: '1px solid ' + (i % 2 === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)')
          }}
        />
      ))}
    </div>
  )
}

function WaveBackground() {
  return (
    <svg className="w-full h-full" viewBox="0 0 1000 1000">
      <defs>
        <filter id="blur">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
        </filter>
      </defs>
      {Array.from({ length: 5 }).map((_, layer) => (
        <motion.path
          key={layer}
          d={generateWavePath(layer)}
          fill="none"
          stroke={layer % 2 === 0 ? '#10b981' : '#06b6d4'}
          strokeWidth="1"
          opacity={0.2 - layer * 0.03}
          filter="url(#blur)"
          animate={{
            d: [
              generateWavePath(layer),
              generateWavePath(layer, 1),
              generateWavePath(layer, 2),
              generateWavePath(layer)
            ]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      ))}
    </svg>
  )
}

function ScanBackground() {
  return (
    <div className="w-full h-full">
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"
        animate={{
          x: [-1000, 1000]
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          initial={{
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: Math.random() * 2
          }}
          style={{
            background: i % 2 === 0 ? '#10b981' : '#06b6d4',
            boxShadow: i % 2 === 0
              ? '0 0 10px rgba(16, 185, 129, 0.8)'
              : '0 0 10px rgba(6, 182, 212, 0.8)'
          }}
        />
      ))}
    </div>
  )
}

function generateWavePath(layer: number, offset: number = 0): string {
  let path = `M 0 ${500 + layer * 50}`
  for (let x = 0; x <= 1000; x += 50) {
    const y = 500 + layer * 50 + 30 * Math.sin((x + offset * 100) / 200)
    path += ` L ${x} ${y}`
  }
  path += ` L 1000 1000 L 0 1000 Z`
  return path
}
