'use client'

import { useState } from 'react'
import { RSVPField, FormFieldValue, FormChangeHandler } from '@/types'

interface PublicRSVPFormProps {
  eventTitle: string
  fields: RSVPField[]
  onSubmit: (responses: Record<string, FormFieldValue>) => Promise<void>
}

export function PublicRSVPForm({ eventTitle, fields, onSubmit }: PublicRSVPFormProps) {
  const [responses, setResponses] = useState<Record<string, FormFieldValue>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await onSubmit(responses)
      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting RSVP:', error)
      alert('There was an error submitting your RSVP. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange: FormChangeHandler = (name: string, value: FormFieldValue) => {
    setResponses(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">RSVP Submitted!</h2>
          <p className="text-gray-600">
            Thank you for your response to <strong>{eventTitle}</strong>. 
            We&apos;ll be in touch with more details.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">RSVP</h1>
        <h2 className="text-xl text-gray-700">{eventTitle}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                value={String(responses[field.name] || '')}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : field.type === 'select' ? (
              <select
                value={String(responses[field.name] || '')}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select {field.label}</option>
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={String(responses[field.name] || '')}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
          </button>
        </div>
      </form>
    </div>
  )
}