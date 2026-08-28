'use client'

import React, { useState, useRef, useEffect, ReactNode } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'

interface DraggableModalProps {
  children: ReactNode
  onClose?: () => void
  className?: string
}

export function DraggableModal({ children, onClose, className = '' }: DraggableModalProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y

      setPosition({
        x: position.x + deltaX,
        y: position.y + deltaY
      })

      setDragStart({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return
      const touch = e.touches[0]
      const deltaX = touch.clientX - dragStart.x
      const deltaY = touch.clientY - dragStart.y
      setPosition({ x: position.x + deltaX, y: position.y + deltaY })
      setDragStart({ x: touch.clientX, y: touch.clientY })
    }

    const handleTouchEnd = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: true })
      document.addEventListener('touchend', handleTouchEnd)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isDragging, dragStart, position])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return
    if ((e.target as HTMLElement).closest('.modal-header')) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
      <div
        ref={modalRef}
        className={`bg-white rounded-lg shadow-2xl pointer-events-auto max-h-[90vh] overflow-y-auto w-full max-w-[95vw] md:w-auto md:max-w-none ${className}`}
        style={isMobile ? undefined : {
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </div>
  )
}
