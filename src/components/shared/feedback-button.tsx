'use client'

import { useState } from 'react'
import { MessageSquare, X, Bug, Lightbulb, HelpCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type FeedbackType = 'bug' | 'suggestion' | 'other'

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const { user } = useAuth()
  const pathname = usePathname()
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!description.trim() || !user) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        user_email: user.email,
        feedback_type: feedbackType,
        description: description.trim(),
        current_page: pathname,
      })

      if (error) throw error

      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setIsOpen(false)
        setDescription('')
        setFeedbackType('bug')
      }, 1500)
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setDescription('')
    setFeedbackType('bug')
    setShowSuccess(false)
  }

  const typeOptions: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
    { value: 'bug', label: 'Bug', icon: <Bug className="w-4 h-4" /> },
    { value: 'suggestion', label: 'Suggestion', icon: <Lightbulb className="w-4 h-4" /> },
    { value: 'other', label: 'Other', icon: <HelpCircle className="w-4 h-4" /> },
  ]

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center transition-colors"
        title="Send feedback"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={handleClose} />

          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Send Feedback</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {showSuccess ? (
              <div className="p-8 text-center">
                <div className="text-green-600 text-lg font-medium">Thanks for your feedback!</div>
                <p className="text-sm text-gray-500 mt-1">We&apos;ll review it shortly.</p>
              </div>
            ) : (
              <>
                {/* Body */}
                <div className="p-6 space-y-4">
                  {/* Type selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <div className="flex gap-2">
                      {typeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFeedbackType(opt.value)}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                            feedbackType === opt.value
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {opt.icon}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe the bug or share your suggestion..."
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !description.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
