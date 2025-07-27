'use client'

import { useState } from 'react'

interface ColorPaletteProps {
  onColorSelect: (color: string | null) => void
  selectedColor: string | null
}

const PRESET_COLORS = [
  { color: '#EF4444', name: 'Red' },
  { color: '#F97316', name: 'Orange' }, 
  { color: '#EAB308', name: 'Yellow' },
  { color: '#22C55E', name: 'Green' },
  { color: '#3B82F6', name: 'Blue' },
  { color: '#8B5CF6', name: 'Purple' },
  { color: '#EC4899', name: 'Pink' },
  { color: '#6B7280', name: 'Gray' },
  { color: '#FFFFFF', name: 'White' },
  { color: '#000000', name: 'Black' }
]

export function ColorPalette({ onColorSelect, selectedColor }: ColorPaletteProps) {
  const [customColor, setCustomColor] = useState('#FFFFFF')

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-4">
        {/* Color Selection Label */}
        <div className="text-sm font-medium text-gray-700">
          🎨 Highlight Color:
        </div>

        {/* Preset Colors */}
        <div className="flex space-x-2">
          {PRESET_COLORS.map((colorOption) => (
            <button
              key={colorOption.color}
              onClick={() => onColorSelect(colorOption.color)}
              className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                selectedColor === colorOption.color 
                  ? 'border-gray-800 shadow-lg' 
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ backgroundColor: colorOption.color }}
              title={colorOption.name}
            >
              {colorOption.color === '#FFFFFF' && (
                <div className="w-full h-full border border-gray-200 rounded"></div>
              )}
            </button>
          ))}
        </div>

        {/* Custom Color Picker */}
        <div className="flex items-center space-x-2">
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value)
              onColorSelect(e.target.value)
            }}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
            title="Custom Color"
          />
          <span className="text-xs text-gray-500">Custom</span>
        </div>

        {/* Clear Button */}
        <button
          onClick={() => onColorSelect(null)}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Clear
        </button>

        {/* Selected Color Indicator */}
        {selectedColor && (
          <div className="flex items-center space-x-2 ml-4">
            <span className="text-sm text-gray-600">Selected:</span>
            <div 
              className="w-6 h-6 rounded border border-gray-300"
              style={{ backgroundColor: selectedColor }}
            ></div>
            <span className="text-xs text-gray-500 font-mono">
              {selectedColor.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-2 text-xs text-gray-500">
        Select a color above, then click the 🎨 icon on any cell to apply the highlight. Click "Clear" to remove highlighting.
      </div>
    </div>
  )
}