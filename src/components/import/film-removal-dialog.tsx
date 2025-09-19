'use client'

import { useState } from 'react'

interface FilmRemoval {
  guestName: string
  removedFilms: string[]
}

interface FilmRemovalDialogProps {
  removals: FilmRemoval[]
  onConfirm: (confirmedRemovals: FilmRemoval[]) => void
  onCancel: () => void
}

export function FilmRemovalDialog({ removals, onConfirm, onCancel }: FilmRemovalDialogProps) {
  const [selectedRemovals, setSelectedRemovals] = useState<Set<string>>(new Set())

  const handleToggleRemoval = (key: string) => {
    const newSelected = new Set(selectedRemovals)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedRemovals(newSelected)
  }

  const handleConfirm = () => {
    const confirmedRemovals = removals.filter(removal => {
      return removal.removedFilms.some(film =>
        selectedRemovals.has(`${removal.guestName}-${film}`)
      )
    }).map(removal => ({
      ...removal,
      removedFilms: removal.removedFilms.filter(film =>
        selectedRemovals.has(`${removal.guestName}-${film}`)
      )
    }))

    onConfirm(confirmedRemovals)
  }

  const selectAll = () => {
    const allKeys = new Set<string>()
    removals.forEach(removal => {
      removal.removedFilms.forEach(film => {
        allKeys.add(`${removal.guestName}-${film}`)
      })
    })
    setSelectedRemovals(allKeys)
  }

  const selectNone = () => {
    setSelectedRemovals(new Set())
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <h2 className="text-xl font-bold mb-4">Film Removal Confirmation</h2>
        <p className="text-sm text-gray-600 mb-4">
          The following films will be removed from guests. Check the ones you want to remove:
        </p>

        <div className="flex gap-2 mb-4">
          <button
            onClick={selectAll}
            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Select All
          </button>
          <button
            onClick={selectNone}
            className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Select None
          </button>
        </div>

        <div className="flex-1 overflow-y-auto border border-gray-200 rounded p-3 mb-4">
          {removals.map(removal => (
            <div key={removal.guestName} className="mb-4">
              <h3 className="font-semibold text-sm mb-2">{removal.guestName}</h3>
              {removal.removedFilms.map(film => {
                const key = `${removal.guestName}-${film}`
                return (
                  <label key={key} className="flex items-center py-1 hover:bg-gray-50 px-2 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedRemovals.has(key)}
                      onChange={() => handleToggleRemoval(key)}
                      className="mr-2"
                    />
                    <span className="text-sm">Remove "{film}"</span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Skip Removals
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Remove Selected Films
          </button>
        </div>
      </div>
    </div>
  )
}