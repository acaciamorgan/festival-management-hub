'use client'

import { useState } from 'react'

interface TitleMapping {
  csvTitle: string
  suggestedMatch?: string
  confidence?: number
}

interface TitleMappingConfirmationProps {
  mappings: TitleMapping[]
  onConfirm: (confirmedMappings: Record<string, string>) => void
  onCancel: () => void
}

export function TitleMappingConfirmation({ mappings, onConfirm, onCancel }: TitleMappingConfirmationProps) {
  const [confirmedMappings, setConfirmedMappings] = useState<Record<string, string>>({})

  const handleConfirmMapping = (csvTitle: string, dbTitle: string) => {
    setConfirmedMappings(prev => ({
      ...prev,
      [csvTitle]: dbTitle
    }))
  }

  const handleSubmit = () => {
    onConfirm(confirmedMappings)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold mb-2">Confirm Film Title Mappings</h2>
          <p className="text-sm text-gray-600">
            We found some film titles in your CSV that don't exactly match titles in the database.
            Please confirm the correct mappings:
          </p>
        </div>
        <div className="p-6 space-y-4">
          {mappings.map((mapping) => (
            <div key={mapping.csvTitle} className="border rounded-lg p-4 space-y-2">
              <div>
                <span className="font-medium">CSV Title: </span>
                <span className="inline-block bg-gray-100 px-2 py-1 rounded text-sm">{mapping.csvTitle}</span>
              </div>

              {mapping.suggestedMatch ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Suggested match: </span>
                    <span className="inline-block bg-blue-100 px-2 py-1 rounded text-sm">{mapping.suggestedMatch}</span>
                    {mapping.confidence && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({Math.round(mapping.confidence * 100)}% confidence)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        confirmedMappings[mapping.csvTitle] === mapping.suggestedMatch
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleConfirmMapping(mapping.csvTitle, mapping.suggestedMatch!)}
                    >
                      Accept
                    </button>
                    <button
                      className={`px-3 py-1 text-sm rounded ${
                        confirmedMappings[mapping.csvTitle] === mapping.csvTitle
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => handleConfirmMapping(mapping.csvTitle, mapping.csvTitle)}
                    >
                      Keep as-is
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">No close match found</div>
                  <button
                    className={`px-3 py-1 text-sm rounded ${
                      confirmedMappings[mapping.csvTitle] === mapping.csvTitle
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => handleConfirmMapping(mapping.csvTitle, mapping.csvTitle)}
                  >
                    Keep as-is
                  </button>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              onClick={handleSubmit}
              disabled={mappings.length > Object.keys(confirmedMappings).length}
            >
              Confirm All Mappings
            </button>
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}