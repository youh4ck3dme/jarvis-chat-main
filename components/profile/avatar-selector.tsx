'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const BRUTAL_AVATARS = [
  { id: 'phoenix', name: 'Phoenix', emoji: '🔥', color: '#ef4444', description: 'Legendary Fire Bird' },
  { id: 'dragon', name: 'Dragon', emoji: '🐉', color: '#7c3aed', description: 'Ancient Power' },
  { id: 'lightning', name: 'Lightning', emoji: '⚡', color: '#fbbf24', description: 'Pure Energy' },
  { id: 'skull', name: 'Skull', emoji: '💀', color: '#9ca3af', description: 'Dark Force' },
  { id: 'volcano', name: 'Volcano', emoji: '🌋', color: '#dc2626', description: 'Raw Power' },
  { id: 'nuclear', name: 'Nuclear', emoji: '☢️', color: '#84cc16', description: 'Extreme Energy' },
  { id: 'meteor', name: 'Meteor', emoji: '☄️', color: '#f97316', description: 'Cosmic Impact' },
  { id: 'virus', name: 'Virus', emoji: '🦠', color: '#10b981', description: 'Unstoppable Force' },
  { id: 'demon', name: 'Demon', emoji: '👹', color: '#ef4444', description: 'Dark Entity' },
  { id: 'robot', name: 'Robot', emoji: '🤖', color: '#06b6d4', description: 'Machine Precision' },
  { id: 'ninja', name: 'Ninja', emoji: '🥷', color: '#1e293b', description: 'Silent Killer' },
  { id: 'sword', name: 'Sword', emoji: '⚔️', color: '#64748b', description: 'Warrior Spirit' },
]

interface AvatarSelectorProps {
  selectedAvatarId?: string
  onSelect: (avatarId: string) => void
  className?: string
}

export function AvatarSelector({
  selectedAvatarId = 'phoenix',
  onSelect,
  className,
}: AvatarSelectorProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="text-sm font-medium text-foreground">Choose Your Brutal Avatar</div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {BRUTAL_AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            onClick={() => onSelect(avatar.id)}
            className={cn(
              'group relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl transition-all',
              'border-2 backdrop-blur-sm',
              selectedAvatarId === avatar.id
                ? 'border-white/40 bg-white/15 shadow-lg'
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
            )}
            title={avatar.name}
          >
            <span className="text-4xl sm:text-5xl group-hover:scale-110 transition-transform">
              {avatar.emoji}
            </span>
            {selectedAvatarId === avatar.id && (
              <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/20">
                <Check className="h-4 w-4 text-emerald-300" />
              </div>
            )}
            <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform opacity-0 transition-opacity group-hover:opacity-100">
              <div className="whitespace-nowrap rounded-lg bg-black/80 px-2 py-1 text-xs text-white backdrop-blur">
                {avatar.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
