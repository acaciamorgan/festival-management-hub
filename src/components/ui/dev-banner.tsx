'use client'

import { useEffect, useState } from 'react'

export function DevBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    setShowBanner(process.env.NEXT_PUBLIC_SHOW_DEV_BANNER === 'true')
  }, [])

  if (!showBanner) return null

  return (
    <div className="bg-yellow-500 text-black px-4 py-2 text-center font-semibold">
      🚧 DEVELOPMENT ENVIRONMENT 🚧
    </div>
  )
}