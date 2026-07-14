import { useState, useEffect } from 'react'

export interface UserProfile {
  displayName: string
  avatarId: string
  email: string
}

const STORAGE_KEY = 'jarvis_profile'

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load profile from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          setProfile(JSON.parse(saved))
        }
      } catch {
        console.error('[v0] Failed to load profile from storage')
      }
    }
    setIsLoading(false)
  }, [])

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return

    const updated = { ...profile, ...updates }
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    }

    setProfile(updated)
    return updated
  }

  const setProfileEmail = (email: string) => {
    setProfile((prev) => (prev ? { ...prev, email } : { email, displayName: 'User', avatarId: 'phoenix' }))
  }

  return {
    profile,
    isLoading,
    updateProfile,
    setProfileEmail,
  }
}
