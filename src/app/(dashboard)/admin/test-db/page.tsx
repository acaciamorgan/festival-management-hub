'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestDB() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const testConnection = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      console.log('Testing Supabase connection...')
      
      // Test 1: Basic connection
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('Auth test:', { user, authError })
      
      // Test 2: Simple query
      const { data, error, status } = await supabase
        .from('user_permissions')
        .select('count(*)')
        .single()
      
      console.log('Query result:', { data, error, status })
      
      setResult({
        auth: { user: user?.email || 'Not logged in', error: authError },
        query: { data, error: error?.message, status }
      })
    } catch (err: any) {
      console.error('Test error:', err)
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>
      
      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}