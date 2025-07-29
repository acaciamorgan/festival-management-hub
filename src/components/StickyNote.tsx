'use client'

import { useState, useRef, useEffect } from 'react'
import { StickyNote as StickyNoteType } from '@/types'

interface StickyNoteProps {
  note: StickyNoteType
  onUpdate: (note: StickyNoteType) => void
  onDelete: (noteId: string) => void
  isDragging: boolean
  onDragStart: (noteId: string) => void
  onDragEnd: () => void
}

export function StickyNote({ note, onUpdate, onDelete, isDragging, onDragStart, onDragEnd }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(note.content)
  const [position, setPosition] = useState({ x: note.x_position, y: note.y_position })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const noteRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const colorClasses = {
    yellow: 'bg-yellow-200 border-yellow-300 shadow-yellow-100',
    blue: 'bg-blue-200 border-blue-300 shadow-blue-100',
    green: 'bg-green-200 border-green-300 shadow-green-100',
    pink: 'bg-pink-200 border-pink-300 shadow-pink-100',
    purple: 'bg-purple-200 border-purple-300 shadow-purple-100',
    orange: 'bg-orange-200 border-orange-300 shadow-orange-100'
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return
    
    const rect = noteRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
    onDragStart(note.id)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const container = noteRef.current?.parentElement
    if (!container) return
    
    const containerRect = container.getBoundingClientRect()
    const newX = e.clientX - containerRect.left - dragOffset.x
    const newY = e.clientY - containerRect.top - dragOffset.y
    
    // Constrain to container bounds
    const maxX = containerRect.width - note.width
    const maxY = containerRect.height - note.height
    
    const constrainedX = Math.max(0, Math.min(newX, maxX))
    const constrainedY = Math.max(0, Math.min(newY, maxY))
    
    setPosition({ x: constrainedX, y: constrainedY })
  }

  const handleMouseUp = () => {
    if (isDragging) {
      onUpdate({
        ...note,
        x_position: position.x,
        y_position: position.y
      })
      onDragEnd()
    }
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset, position])

  const handleDoubleClick = () => {
    setIsEditing(true)
    setTimeout(() => {
      textareaRef.current?.focus()
    }, 0)
  }

  const handleContentSave = () => {
    onUpdate({
      ...note,
      content: content.trim()
    })
    setIsEditing(false)
  }

  const handleContentCancel = () => {
    setContent(note.content)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleContentCancel()
    }
    // Don't save on Enter since this is a textarea - let users add line breaks
  }

  const handleDelete = () => {
    if (confirm('Delete this sticky note?')) {
      onDelete(note.id)
    }
  }

  return (
    <div
      ref={noteRef}
      className={`absolute border-2 shadow-lg cursor-move select-none ${
        colorClasses[note.color as keyof typeof colorClasses] || colorClasses.yellow
      } ${isDragging ? 'z-50 scale-105' : 'z-10'}`}
      style={{
        left: position.x,
        top: position.y,
        width: note.width,
        height: note.height,
        transition: isDragging ? 'none' : 'transform 0.1s ease'
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Delete button */}
      <button
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600 flex items-center justify-center"
        onClick={handleDelete}
        title="Delete note"
      >
        ×
      </button>

      {/* Content */}
      <div className="p-2 h-full overflow-hidden">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleContentSave}
            onKeyDown={handleKeyDown}
            className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
            placeholder="Write your note..."
          />
        ) : (
          <div 
            className="w-full h-full text-sm whitespace-pre-wrap overflow-y-auto"
          >
            {note.content || 'Double-click to edit'}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div 
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-50 hover:opacity-100"
        style={{
          background: 'linear-gradient(-45deg, transparent 30%, currentColor 30%, currentColor 60%, transparent 60%)'
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          // TODO: Implement resize functionality if needed
        }}
      />
    </div>
  )
}