'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface FestivalYear {
  id: string
  year: number
  edition_number: number
  festival_name: string
  is_archived: boolean
  start_date: string | null
  end_date: string | null
  important_links: { title: string; url: string }[]
  created_at: string
  updated_at: string
}

interface FestivalYearContextType {
  currentYear: number
  availableYears: FestivalYear[]
  loading: boolean
  setCurrentYear: (year: number) => void
  refreshYears: () => Promise<void>
}

const FestivalYearContext = createContext<FestivalYearContextType | undefined>(undefined)

const STORAGE_KEY = 'festival_selected_year'

export function FestivalYearProvider({ children }: { children: ReactNode }) {
  const [currentYear, setCurrentYearState] = useState<number>(2025)
  const [availableYears, setAvailableYears] = useState<FestivalYear[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Load available years from database
  const loadYears = async () => {
    try {
      const { data, error } = await supabase
        .from('festival_settings')
        .select('*')
        .order('year', { ascending: false })

      if (error) {
        console.error('Error loading festival years:', error)
        return
      }

      if (data && data.length > 0) {
        setAvailableYears(data)

        // Try to load saved year from localStorage
        if (typeof window !== 'undefined') {
          const savedYear = localStorage.getItem(STORAGE_KEY)
          if (savedYear) {
            const yearNum = parseInt(savedYear)
            // Only use saved year if it exists in available years
            if (data.some(y => y.year === yearNum)) {
              setCurrentYearState(yearNum)
              return
            }
          }
        }

        // Default to newest year (first in list since ordered DESC)
        setCurrentYearState(data[0].year)
      }
    } catch (error) {
      console.error('Error loading festival years:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadYears()
  }, [])

  // Save year to localStorage when changed
  const setCurrentYear = (year: number) => {
    setCurrentYearState(year)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, year.toString())
    }
  }

  const refreshYears = async () => {
    setLoading(true)
    await loadYears()
  }

  const value = {
    currentYear,
    availableYears,
    loading,
    setCurrentYear,
    refreshYears,
  }

  return (
    <FestivalYearContext.Provider value={value}>
      {children}
    </FestivalYearContext.Provider>
  )
}

export function useFestivalYear() {
  const context = useContext(FestivalYearContext)
  if (context === undefined) {
    throw new Error('useFestivalYear must be used within a FestivalYearProvider')
  }
  return context
}
