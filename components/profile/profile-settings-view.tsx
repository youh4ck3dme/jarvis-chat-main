'use client'

import { useState, useEffect } from 'react'
import { LogOut, Star, Trophy } from 'lucide-react'
import { useJarvisAuth } from '@/hooks/use-jarvis-auth'
import { UserProfileCard } from './user-profile-card'
import { AvatarSelector, BRUTAL_AVATARS } from './avatar-selector'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProfileSettingsViewProps {
  onClose?: () => void
  className?: string
}

export function ProfileSettingsView({ onClose, className }: ProfileSettingsViewProps) {
  const { user, signOut } = useJarvisAuth()
  const [displayName, setDisplayName] = useState('Jarvis Master')
  const [avatarId, setAvatarId] = useState('phoenix')
  const [isSaving, setIsSaving] = useState(false)

  // Load saved profile from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jarvis_profile')
      if (saved) {
        try {
          const profile = JSON.parse(saved)
          setDisplayName(profile.displayName || 'Jarvis Master')
          setAvatarId(profile.avatarId || 'phoenix')
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [])

  const handleUpdateProfile = async (data: { displayName: string; avatarId: string }) => {
    setIsSaving(true)
    try {
      // Save to localStorage (replace with API call for persistence)
      localStorage.setItem('jarvis_profile', JSON.stringify(data))
      setDisplayName(data.displayName)
      setAvatarId(data.avatarId)
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return (
      <div className={cn('space-y-4 rounded-2xl border-6 border-white/15 bg-white/8 p-6', className)}>
        <h2 className="text-xl font-bold text-foreground">Not Signed In</h2>
        <p className="text-sm text-muted-foreground">
          Sign in to your account to customize your profile and avatar.
        </p>
      </div>
    )
  }

  const selectedAvatar = BRUTAL_AVATARS.find((a) => a.id === avatarId)

  return (
    <div className={cn('space-y-6', className)}>
      {/* User Profile Card */}
      <UserProfileCard
        email={user.email}
        displayName={displayName}
        avatarId={avatarId}
        onUpdate={handleUpdateProfile}
      />

      {/* Profile Stats Section */}
      <div className="rounded-2xl border-6 border-white/15 bg-white/8 p-6 backdrop-blur-lg">
        <h3 className="text-lg font-bold text-foreground mb-4">Your Power Stats</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="text-sm font-semibold text-muted-foreground">RANK</span>
            </div>
            <div className="text-3xl font-bold text-foreground">S+</div>
            <p className="text-xs text-muted-foreground mt-1">Master Level</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-orange-400" />
              <span className="text-sm font-semibold text-muted-foreground">AVATAR</span>
            </div>
            <div className="text-3xl font-bold text-foreground">{selectedAvatar?.emoji}</div>
            <p className="text-xs text-muted-foreground mt-1">{selectedAvatar?.name}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⚡</span>
              <span className="text-sm font-semibold text-muted-foreground">POWER</span>
            </div>
            <div className="text-3xl font-bold text-foreground">9999</div>
            <p className="text-xs text-muted-foreground mt-1">Ultimate Level</p>
          </div>
        </div>
      </div>

      {/* Avatar Selection */}
      <div className="rounded-2xl border-6 border-white/15 bg-white/8 p-6 backdrop-blur-lg">
        <AvatarSelector
          selectedAvatarId={avatarId}
          onSelect={(id) => handleUpdateProfile({ displayName, avatarId: id })}
        />
      </div>

      {/* Account Actions */}
      <div className="rounded-2xl border-6 border-white/15 bg-white/8 p-6 backdrop-blur-lg space-y-3">
        <h3 className="text-lg font-bold text-foreground">Account Settings</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Email: {user.email}</p>
          <p>Status: Connected & Synced</p>
          <p>Avatar: {selectedAvatar?.name || 'Not Set'}</p>
        </div>
        <Button
          onClick={() => signOut()}
          variant="destructive"
          className="w-full gap-2 mt-4"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {onClose && (
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full"
        >
          Close Profile
        </Button>
      )}
    </div>
  )
}
