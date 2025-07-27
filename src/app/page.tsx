'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the programming pipeline scheduler
    router.push('/modules/programming-pipeline/scheduler')
  }, [router])

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-green-600">🎬 Festival Management</h1>
      <p className="mt-4">Redirecting to Programming Pipeline...</p>
    </div>
  )
}
