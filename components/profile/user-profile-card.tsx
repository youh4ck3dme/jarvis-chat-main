'use client'

import { useState } from 'react'
import { Mail, Edit2, Save, X, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BRUTAL_AVATARS } from './avatar-selector'

interface UserProfileCardProps {
  email: string
  displayName?: string
  avatarId?: string
  onUpdate?: (data: { displayName: string; avatarId: string }) => Promise<void>
  className?: string
}

export function UserProfileCard({
  email,
  displayName = 'Jarvis Master',
  avatarId = 'phoenix',
  onUpdate,
  className,
}: UserProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(displayName)
  const [editAvatarId, setEditAvatarId] = useState(avatarId)
  const [isSaving, setIsSaving] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const selectedAvatar = BRUTAL_AVATARS.find((a) => a.id === editAvatarId)

  const handleSave = async () => {
    if (!onUpdate) return
    setIsSaving(true)
    try {
      await onUpdate({ displayName: editName, avatarId: editAvatarId })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditName(displayName)
    setEditAvatarId(avatarId)
    setIsEditing(false)
  }

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  return (
    <div
      className={cn(
        'rounded-2xl border-6 border-white/15 bg-white/8 p-6 backdrop-blur-lg transition-all',
        'hover:border-white/25 hover:bg-white/10',
        className
      )}
    >
      {/* Header with Avatar */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-end gap-4">
          <div className="relative">
            {/* Avatar Glow Effect */}
            <div
              className="absolute -inset-1 rounded-2xl blur-lg opacity-50 group-hover:opacity-70 transition-opacity"
              style={{
                background: `radial-gradient(circle, ${selectedAvatar?.color || '#ef4444'}20, transparent)`,
              }}
            />
            {/* Avatar */}
            <div
              className={cn(
                'relative flex h-20 w-20 items-center justify-center rounded-2xl border-3 border-white/20',
                'bg-gradient-to-br from-white/10 to-white/5 shadow-xl'
              )}
              style={{ borderColor: `${selectedAvatar?.color || '#ef4444'}40` }}
            >
              <span className="text-6xl">{selectedAvatar?.emoji || '🔥'}</span>
            </div>
          </div>

          <div className="flex-1 pb-2">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
                className={cn(
                  'text-2xl font-bold text-foreground bg-white/10 border border-white/20 rounded-lg px-3 py-1',
                  'focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all'
                )}
              />
            ) : (
              <h2 className="text-2xl font-bold text-foreground">{displayName}</h2>
            )}
            <p className="mt-1 text-sm text-muted-foreground">{selectedAvatar?.name || 'Avatar'}</p>
          </div>
        </div>

        {onUpdate && (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              'flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm',
              'bg-white/5 transition-all hover:bg-white/10 hover:border-white/30',
              isEditing && 'bg-emerald-500/20 border-emerald-400/50'
            )}
          >
            {isEditing ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4" />
                Edit
              </>
            )}
          </button>
        )}
      </div>

      {/* Avatar Selection in Edit Mode */}
      {isEditing && (
        <div className="mt-4 space-y-3">
          <div className="text-sm font-medium text-foreground">Choose Avatar</div>
          <div className="grid grid-cols-6 gap-2">
            {BRUTAL_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setEditAvatarId(avatar.id)}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-lg border-2 transition-all',
                  editAvatarId === avatar.id
                    ? 'border-emerald-400/50 bg-emerald-500/20'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
                )}
              >
                <span className="text-2xl">{avatar.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Email Section */}
      <div className="mt-6 space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Account Info
        </div>
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3',
            'transition-all hover:bg-white/8 hover:border-white/20'
          )}
        >
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="flex-1 truncate text-sm text-foreground">{email}</span>
          <button
            onClick={handleCopyEmail}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copiedEmail ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Button */}
      {isEditing && onUpdate && (
        <div className="mt-6 flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || editName.trim() === ''}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium transition-all',
              'bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={handleCancel}
            className={cn(
              'flex-1 rounded-lg border border-white/20 bg-white/5 px-4 py-3 font-medium transition-all',
              'hover:bg-white/10 hover:border-white/30'
            )}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Profile Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3 pt-6 border-t border-white/10">
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-400">⚡</div>
          <div className="text-xs text-muted-foreground">Power Level</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-orange-400">🔥</div>
          <div className="text-xs text-muted-foreground">Activity</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-purple-400">👑</div>
          <div className="text-xs text-muted-foreground">Status</div>
        </div>
      </div>
    </div>
  )
}
