'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function EditProfileButton({ profileId }: { profileId: string }) {
  const [isOwner, setIsOwner] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user.id === profileId) setIsOwner(true)
    })
  }, [profileId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOwner) return null

  return (
    <Link href="/settings" className="profile-edit-btn">
      Edit Profile
    </Link>
  )
}
