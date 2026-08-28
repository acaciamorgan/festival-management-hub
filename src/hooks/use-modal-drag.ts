'use client'

import { useState, useEffect, useCallback } from 'react'
import { useIsMobile } from './use-mobile'

interface ModalDragOptions {
  initialPosition?: { x: number; y: number }
}

export function useModalDrag(options: ModalDragOptions = {}) {
  const { initialPosition = { x: 100, y: 100 } } = options
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const isMobile = useIsMobile()

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }, [isMobile, position.x, position.y])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart.x, dragStart.y])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // On mobile: center the modal with CSS, ignore position
  const modalStyle = isMobile
    ? {
        position: 'fixed' as const,
        inset: 0,
        margin: 'auto',
        width: '95vw',
        maxWidth: '95vw',
        maxHeight: '90vh',
        cursor: 'default',
      }
    : {
        position: 'fixed' as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default',
      }

  return {
    position,
    isDragging,
    isMobile,
    handleMouseDown,
    modalStyle,
  }
}
