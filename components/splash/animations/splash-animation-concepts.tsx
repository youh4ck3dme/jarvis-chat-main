'use client'

/**
 * CONCEPT 1: LIQUID BUBBLE EXPLOSION
 * 
 * Brutal Floating Particle System with 4D Parallax Depth
 * - Logo sits in center, surrounded by 3 layers of floating liquid bubbles
 * - Each bubble layer moves at different speed (parallax effect)
 * - Bubbles have glass morphism effect (matches design system)
 * - On load: bubbles explode outward in 3D space then settle
 * - Continuous subtle rotation and bobbing motion
 * - Mouse follow effect for interactive 4D depth perception
 * 
 * Technical Stack:
 * - Three.js for 3D sphere geometry
 * - Framer Motion for orchestrated animations
 * - React Three Fiber for easier Three.js integration
 * - GLSL shaders for liquid distortion effects
 */

export const LiquidBubbleExplosion = `
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import { motion } from 'framer-motion'

export function SplashBubbleAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative w-full h-screen bg-background overflow-hidden"
    >
      {/* Background particle system */}
      <Canvas className="absolute inset-0">
        <BubbleParticles />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
      </Canvas>

      {/* Logo overlay with glow */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          delay: 0.3,
          duration: 0.6,
          type: 'spring',
          stiffness: 100
        }}
      >
        <motion.div
          className="relative w-24 h-24"
          animate={{ 
            rotateZ: 360,
            filter: ['drop-shadow(0 0 20px rgba(16,185,129,0.3))', 
                     'drop-shadow(0 0 40px rgba(16,185,129,0.6))',
                     'drop-shadow(0 0 20px rgba(16,185,129,0.3))']
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <Logo />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

function BubbleParticles() {
  const ref = useRef()
  
  useFrame((state) => {
    if (ref.current) {
      // Parallax depth effect based on mouse position
      ref.current.rotation.x = state.mouse.y * 0.1
      ref.current.rotation.y = state.mouse.x * 0.1
    }
  })

  return (
    <group ref={ref}>
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.mesh
          key={i}
          position={getRandomSphere(i)}
          scale={0.3 + i * 0.05}
        >
          <Sphere args={[1, 32, 32]} />
          <meshStandardMaterial
            color={i % 2 === 0 ? '#10b981' : '#06b6d4'}
            transparent
            opacity={0.15}
            emissive={i % 2 === 0 ? '#10b981' : '#06b6d4'}
            emissiveIntensity={0.3}
          />
        </motion.mesh>
      ))}
    </group>
  )
}
`

/**
 * CONCEPT 2: MORPHING RINGS WITH 4D ROTATION
 * 
 * Brutal Geometric Transformation
 * - Logo surrounded by 3 concentric rings that morph and rotate
 * - Ring 1: Circles that morph into hexagons (SVG morphing)
 * - Ring 2: Rotating dots that expand/contract
 * - Ring 3: Glowing lines that rotate in 4D space (perspective rotation)
 * - Each ring rotates at different speeds (creates hypnotic effect)
 * - On interaction: rings explode outward, shrink back with stagger
 * 
 * Technical Stack:
 * - Framer Motion for SVG path morphing
 * - CSS perspective for 4D depth
 * - requestAnimationFrame for smooth rotation
 */

export const MorphingRingsAnimation = `
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

export function SplashMorphingRings() {
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

  const ringVariants = (delay, multiplier) => ({
    initial: { scale: 0, opacity: 0, rotate: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      rotate: rotations[multiplier] * 1
    },
    transition: { delay, duration: 0.8, type: 'spring' }
  })

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-background perspective">
      <style jsx>{$\`
        .perspective {
          perspective: 1000px;
        }
        .ring-container {
          transform-style: preserve-3d;
        }
      $\`}</style>

      {/* Outer Ring - Morphing Circles */}
      <motion.svg
        variants={ringVariants(0.1, 0)}
        initial="initial"
        animate="animate"
        className="absolute ring-container"
        width="320"
        height="320"
        viewBox="0 0 320 320"
        style={{ rotateZ: rotations[0] }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.circle
            key={i}
            cx={160 + 100 * Math.cos((i * Math.PI) / 3)}
            cy={160 + 100 * Math.sin((i * Math.PI) / 3)}
            r="12"
            fill="none"
            stroke="url(#glowGradient)"
            strokeWidth="2"
            opacity={0.6}
            animate={{ r: [12, 16, 12] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
        <defs>
          <radialGradient id="glowGradient">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
          </radialGradient>
        </defs>
      </motion.svg>

      {/* Middle Ring - Rotating Dots */}
      <motion.svg
        variants={ringVariants(0.2, 1)}
        initial="initial"
        animate="animate"
        className="absolute ring-container"
        width="240"
        height="240"
        viewBox="0 0 240 240"
        style={{ rotateZ: -rotations[1] }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.circle
            key={i}
            cx={120 + 70 * Math.cos((i * Math.PI) / 4)}
            cy={120 + 70 * Math.sin((i * Math.PI) / 4)}
            r="6"
            fill="url(#dotGradient)"
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
        <defs>
          <linearGradient id="dotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </motion.svg>

      {/* Inner Ring - Glowing Lines (4D Perspective) */}
      <motion.div
        variants={ringVariants(0.3, 2)}
        initial="initial"
        animate="animate"
        className="absolute ring-container"
        style={{ 
          width: 160,
          height: 160,
          rotateX: rotations[2] * 0.5,
          rotateY: rotations[2] * 0.7
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 160 160">
          {Array.from({ length: 4 }).map((_, i) => (
            <line
              key={i}
              x1="80"
              y1="80"
              x2={80 + 60 * Math.cos((i * Math.PI) / 2)}
              y2={80 + 60 * Math.sin((i * Math.PI) / 2)}
              stroke="url(#lineGradient)"
              strokeWidth="2"
              opacity="0.7"
            />
          ))}
          <defs>
            <linearGradient id="lineGradient">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>

      {/* Center Logo */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="relative z-10"
      >
        <Logo />
      </motion.div>
    </div>
  )
}
`

/**
 * CONCEPT 3: WAVE DISTORTION + PARALLAX LAYERS
 * 
 * Brutal Ripple & Depth Effect
 * - Full screen wave distortion shader that animates on load
 * - Multiple parallax layers with different distortion amplitudes
 * - Layer 1: Background particles (slow distortion)
 * - Layer 2: Glass morphism circles (medium distortion)
 * - Layer 3: Text & logo (fast distortion for impact)
 * - Mouse interaction: creates ripple effect from cursor
 * - Combines liquid glass design with dynamic shader effects
 * 
 * Technical Stack:
 * - GLSL shaders for wave distortion
 * - Canvas API or WebGL directly
 * - Framer Motion for orchestration
 */

export const WaveDistortionAnimation = `
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

export function SplashWaveDistortion() {
  return (
    <div className="w-screen h-screen bg-background overflow-hidden">
      <Canvas className="w-full h-full">
        <WaveShaderLayer />
      </Canvas>
    </div>
  )
}

const waveVertexShader = $\`
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    
    float wave = sin(position.x * 3.0 + position.y * 3.0 + time * 2.0) * 0.1;
    float wave2 = sin(position.x * 2.0 - position.y * 2.0 + time * 1.5) * 0.08;
    
    vec3 pos = position;
    pos.z += wave + wave2;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
\`

const waveFragmentShader = $\`
  varying vec2 vUv;
  uniform float time;
  
  void main() {
    vec3 color = vec3(
      sin(vUv.x * 3.0 + time) * 0.5 + 0.5,
      sin(vUv.y * 3.0 + time) * 0.5 + 0.5,
      sin((vUv.x + vUv.y) * 3.0 + time) * 0.5 + 0.5
    );
    
    gl_FragColor = vec4(color * 0.1, 0.3);
  }
\`

function WaveShaderLayer() {
  const meshRef = useRef()
  const shaderRef = useRef({
    time: { value: 0 }
  })

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: waveVertexShader,
      fragmentShader: waveFragmentShader,
      uniforms: shaderRef.current,
      transparent: true
    })
  }, [])

  useFrame(() => {
    shaderRef.current.time.value += 0.016
  })

  return (
    <mesh ref={meshRef} material={shaderMaterial}>
      <planeGeometry args={[20, 20, 100, 100]} />
    </mesh>
  )
}
`

/**
 * CONCEPT 4: HOLOGRAPHIC SCAN + REVEAL
 * 
 * Brutal Scanning Beam with 4D Layering
 * - Animated scanning laser beam that sweeps across screen (top to bottom)
 * - Reveals elements as it passes: particles glow, text appears, logo glows
 * - Trail effect: glow remains briefly then fades (phosphor effect)
 * - 3D perspective: beam appears to come from front (towards viewer)
 * - Multiple scan passes with staggered timing for different elements
 * - Combines with previous glass effects for premium feel
 * 
 * Technical Stack:
 * - Framer Motion for orchestration
 * - CSS clip-path for progressive reveal
 * - Multiple staggered layers
 */

export const HolographicScanAnimation = `
import { motion } from 'framer-motion'

export function SplashHolographicScan() {
  const scanVariants = {
    hidden: { x: -1000, opacity: 0 },
    visible: {
      x: 1000,
      opacity: [0, 1, 0.5, 0],
      transition: {
        duration: 2,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatDelay: 2
      }
    }
  }

  const elementRevealVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (custom) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: custom * 0.3,
        duration: 0.6,
        type: 'spring'
      }
    })
  }

  return (
    <div className="relative w-screen h-screen bg-background overflow-hidden">
      {/* Background scan layers */}
      <div className="absolute inset-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"
            variants={scanVariants}
            initial="hidden"
            animate="visible"
            style={{ 
              width: '200px',
              delay: i * 0.8 
            }}
          />
        ))}
      </div>

      {/* Glowing scan line */}
      <motion.div
        className="absolute inset-y-0 w-1 bg-gradient-to-b from-transparent via-emerald-400 to-transparent shadow-2xl shadow-emerald-500/50"
        variants={scanVariants}
        initial="hidden"
        animate="visible"
      />

      {/* Elements revealed by scan */}
      <div className="relative w-full h-full flex items-center justify-center">
        
        {/* Particle effects - reveal in scan */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial="hidden"
          animate="visible"
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full glass-panel"
              custom={i}
              variants={elementRevealVariants}
              style={{
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
                background: i % 2 === 0 
                  ? 'rgba(16, 185, 129, 0.3)' 
                  : 'rgba(6, 182, 212, 0.3)',
                boxShadow: i % 2 === 0 
                  ? '0 0 20px rgba(16, 185, 129, 0.6)' 
                  : '0 0 20px rgba(6, 182, 212, 0.6)'
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.1
              }}
            />
          ))}
        </motion.div>

        {/* Logo - revealed by scan */}
        <motion.div
          custom={10}
          variants={elementRevealVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10"
        >
          <motion.div
            animate={{
              filter: [
                'drop-shadow(0 0 10px rgba(16,185,129,0))',
                'drop-shadow(0 0 30px rgba(16,185,129,0.8))',
                'drop-shadow(0 0 10px rgba(16,185,129,0))'
              ]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: 1.5
            }}
          >
            <Logo />
          </motion.div>
        </motion.div>

        {/* Text - revealed by scan */}
        <motion.div
          custom={11}
          variants={elementRevealVariants}
          initial="hidden"
          animate="visible"
          className="absolute bottom-32 text-center text-2xl font-semibold text-foreground"
        >
          <motion.p
            animate={{
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: 2
            }}
          >
            Scanning... Jarvis initialized
          </motion.p>
        </motion.div>
      </div>

      {/* Bottom scan line */}
      <motion.div
        className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
        animate={{
          opacity: [0, 0.8, 0],
          y: [0, -20, 0]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          repeatDelay: 2
        }}
      />
    </div>
  )
}
`

export default {
  LiquidBubbleExplosion,
  MorphingRingsAnimation,
  WaveDistortionAnimation,
  HolographicScanAnimation
}
