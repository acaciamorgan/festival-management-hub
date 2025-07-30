'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'

interface DraggableModalProps {
  children: ReactNode
  defaultPosition?: { x: number; y: number }
}

export function DraggableModal({ children, defaultPosition = { x: 0, y: 0 } }: DraggableModalProps) {
  const [position, setPosition] = useState(defaultPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      
      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }))
      
      setDragStart({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragStart])

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if clicking on the header area
    if ((e.target as HTMLElement).closest('.modal-header')) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      e.preventDefault()
    }
  }

  return (
    <div 
      ref={modalRef}
      className="fixed bg-white rounded-lg border border-gray-300 shadow-lg"
      style={{
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  )
}