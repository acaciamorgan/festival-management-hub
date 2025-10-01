'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FilmContact, FilmContactType } from '@/types'

interface FeatureFilm {
  id: string
  title: string
  source: string
  original_language_title: string
  director: string
  countries: string
  run_time: number
  language: string
  subtitles: string
  captions: string
  original_release_year: number
  screenwriter: string
  cinematographer: string
  art_director: string
  editor: string
  principal_cast: string
  sound_designer: string
  music_score: string
  producer: string
  executive_producer: string
  production_companies: string
  film_website: string
  trailer_url: string
  premiere_status: string
  content_warnings: string
  program_1?: string
  program_2?: string
  program_3?: string
  program_4?: string
  genre_1?: string
  genre_2?: string
  genre_3?: string
  genre_4?: string
}

interface ShortFilm {
  id: string
  title: string
  source: string
  original_language_title: string
  director: string
  countries: string
  run_time: number
  language: string
  subtitles: string
  captions: string
  original_release_year: number
  screenwriter: string
  cinematographer: string
  art_director: string
  editor: string
  principal_cast: string
  sound_designer: string
  music_score: string
  producer: string
  executive_producer: string
  production_companies: string
  film_website: string
  trailer_url: string
  content_warnings: string
  shorts_program_id: string
  program_order: number
  program_1?: string
  program_2?: string
  program_3?: string
  genre_1?: string
  genre_2?: string
  genre_3?: string
}

interface Contact {
  id: string
  contact_name: string
  contact_company: string | null
  contact_email: string | null
}

interface FilmEditModalProps {
  film: FeatureFilm | ShortFilm | null
  filmType: 'feature' | 'short'
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  onDelete: () => void
}

export function FilmEditModal({ film, filmType, isOpen, onClose, onSave, onDelete }: FilmEditModalProps) {
  const [formData, setFormData] = useState<FeatureFilm | ShortFilm>({} as FeatureFilm | ShortFilm)
  const [filmContacts, setFilmContacts] = useState<FilmContact[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [modalSize, setModalSize] = useState({ width: 1000, height: 600 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([])
  const [contactSuggestions, setContactSuggestions] = useState<{ [key: number]: Contact[] }>({})
  const [showSuggestions, setShowSuggestions] = useState<{ [key: number]: boolean }>({})
  const [availableShortsPrograms, setAvailableShortsPrograms] = useState<any[]>([])
  const [selectedShortsPrograms, setSelectedShortsPrograms] = useState<{ [key: string]: { selected: boolean, order: number } }>({})
  
  const supabase = createClient()

  useEffect(() => {
    if (film && isOpen) {
      setFormData({ ...film })
      loadFilmContacts()
      loadAvailableContacts()
      if (filmType === 'short') {
        loadShortsPrograms()
        loadFilmProgramAssignments()
      }
    }
  }, [film, isOpen])

  const loadFilmContacts = async () => {
    if (!film) return
    
    try {
      const { data, error } = await supabase
        .from('film_contacts')
        .select('*')
        .eq('film_id', film.id)
        .eq('film_type', filmType)
        .order('created_at')
      
      if (error) {
        console.error('Error loading film contacts:', error)
      } else {
        setFilmContacts(data || [])
      }
    } catch (error) {
      console.error('Error loading film contacts:', error)
    }
  }

  const loadShortsPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('shorts_programs')
        .select('id, program_name, program_number')
        .order('program_number')
      
      if (!error && data) {
        setAvailableShortsPrograms(data)
      }
    } catch (error) {
      console.error('Error loading shorts programs:', error)
    }
  }

  const loadFilmProgramAssignments = async () => {
    if (!film) return
    
    try {
      const { data, error } = await supabase
        .from('short_film_programs')
        .select('shorts_program_id, program_order')
        .eq('short_film_id', film.id)
      
      if (!error && data) {
        const assignments: { [key: string]: { selected: boolean, order: number } } = {}
        data.forEach(item => {
          assignments[item.shorts_program_id] = {
            selected: true,
            order: item.program_order || 0
          }
        })
        setSelectedShortsPrograms(assignments)
      }
    } catch (error) {
      console.error('Error loading film program assignments:', error)
    }
  }

  const loadAvailableContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, contact_name, contact_company, contact_email')
        .order('contact_name')
      
      if (error) {
        console.error('Error loading available contacts:', error)
      } else {
        setAvailableContacts(data || [])
        console.log('Loaded contacts:', data?.length || 0, 'contacts')
      }
    } catch (error) {
      console.error('Error loading available contacts:', error)
    }
  }

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!film) return
    
    setIsSubmitting(true)
    try {
      const tableName = filmType === 'feature' ? 'feature_films' : 'short_films'
      
      // Create base update data with common fields
      const updateData: any = {
        title: formData.title,
        source: formData.source,
        original_language_title: formData.original_language_title,
        director: formData.director,
        countries: formData.countries,
        run_time: formData.run_time,
        language: formData.language,
        subtitles: formData.subtitles,
        captions: formData.captions,
        original_release_year: formData.original_release_year,
        screenwriter: formData.screenwriter,
        cinematographer: formData.cinematographer,
        art_director: formData.art_director,
        editor: formData.editor,
        principal_cast: formData.principal_cast,
        sound_designer: formData.sound_designer,
        music_score: formData.music_score,
        producer: formData.producer,
        executive_producer: formData.executive_producer,
        production_companies: formData.production_companies,
        film_website: formData.film_website,
        trailer_url: formData.trailer_url,
        content_warnings: formData.content_warnings,
        program_1: formData.program_1,
        program_2: formData.program_2,
        program_3: formData.program_3,
        genre_1: formData.genre_1,
        genre_2: formData.genre_2,
        genre_3: formData.genre_3
      }
      
      // Add type-specific fields
      if (filmType === 'feature') {
        updateData.premiere_status = (formData as FeatureFilm).premiere_status
        updateData.program_4 = (formData as FeatureFilm).program_4
        updateData.genre_4 = (formData as FeatureFilm).genre_4
      }
      
      // Note: We're keeping shorts_program_id for backward compatibility temporarily
      // The new junction table will be the source of truth
      
      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', film.id)
      
      if (error) {
        console.error('Error updating film:', error)
        console.error('Update data:', updateData)
        alert(`Error updating film: ${error.message}`)
      } else {
        // If this is a short film, update the program assignments in junction table
        if (filmType === 'short') {
          // Delete existing assignments
          await supabase
            .from('short_film_programs')
            .delete()
            .eq('short_film_id', film.id)
          
          // Insert new assignments
          const newAssignments = Object.entries(selectedShortsPrograms)
            .filter(([_, value]) => value.selected)
            .map(([programId, value]) => ({
              short_film_id: film.id,
              shorts_program_id: programId,
              program_order: value.order || 0
            }))
          
          if (newAssignments.length > 0) {
            const { error: assignError } = await supabase
              .from('short_film_programs')
              .insert(newAssignments)
            
            if (assignError) {
              console.error('Error updating program assignments:', assignError)
            }
          }
        }
        
        console.log('Film updated successfully')

        // CASCADE UPDATES TO ALL SCREENING TABLES
        // This is a band-aid fix because the system duplicates film data everywhere
        // instead of referencing the source of truth

        // Update press_screenings
        if (filmType === 'feature') {
          const { error: pressError } = await supabase
            .from('press_screenings')
            .update({
              runtime: formData.run_time,
              title: formData.title
            })
            .eq('film_id', film.id)
            .eq('film_type', 'feature')

          if (pressError) {
            console.error('Failed to update press_screenings:', pressError)
          }
        } else {
          const { error: pressError } = await supabase
            .from('press_screenings')
            .update({
              runtime: formData.run_time,
              title: formData.title
            })
            .eq('film_id', film.id)
            .eq('film_type', 'short')

          if (pressError) {
            console.error('Failed to update press_screenings:', pressError)
          }
        }

        // Update ticketing_screenings (matches by title, not film_id)
        const { error: ticketingError } = await supabase
          .from('ticketing_screenings')
          .update({
            run_time: formData.run_time,
            film_title: formData.title
          })
          .eq('film_title', film.title) // Use OLD title to find records

        if (ticketingError) {
          console.error('Failed to update ticketing_screenings:', ticketingError)
        }

        // Update published_screenings
        const { error: publishedError } = await supabase
          .from('published_screenings')
          .update({
            run_time: formData.run_time,
            film_title: formData.title
          })
          .eq('film_title', film.title)

        if (publishedError) {
          console.error('Failed to update published_screenings:', publishedError)
        }

        // Update pi_jury_screenings
        const { error: piJuryError } = await supabase
          .from('pi_jury_screenings')
          .update({
            run_time: formData.run_time,
            film_title: formData.title
          })
          .eq('film_title', film.title)

        if (piJuryError) {
          console.error('Failed to update pi_jury_screenings:', piJuryError)
        }

        // Update tech_check_screenings
        const { error: techCheckError } = await supabase
          .from('tech_check_screenings')
          .update({
            run_time: formData.run_time,
            film_title: formData.title
          })
          .eq('film_title', film.title)

        if (techCheckError) {
          console.error('Failed to update tech_check_screenings:', techCheckError)
        }

        console.log('Cascaded updates to all screening tables')
        onSave()
      }
    } catch (error) {
      console.error('Error updating film:', error)
      alert('Error updating film')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!film) return
    
    setIsSubmitting(true)
    try {
      // Delete film contacts first
      await supabase
        .from('film_contacts')
        .delete()
        .eq('film_id', film.id)
        .eq('film_type', filmType)
      
      // Delete the film
      const tableName = filmType === 'feature' ? 'feature_films' : 'short_films'
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', film.id)
      
      if (error) {
        console.error('Error deleting film:', error)
        alert('Error deleting film')
      } else {
        onDelete()
        setShowDeleteConfirm(false)
      }
    } catch (error) {
      console.error('Error deleting film:', error)
      alert('Error deleting film')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addContact = () => {
    const newContact: FilmContact = {
      id: '',
      film_id: film?.id || '',
      film_type: filmType,
      name: '',
      company: '',
      email: '',
      contact_type: 'Other',
      created_at: '',
      updated_at: '',
      created_by: ''
    }
    setFilmContacts([...filmContacts, newContact])
  }

  const updateContact = (index: number, field: keyof FilmContact, value: string) => {
    const updated = [...filmContacts]
    updated[index] = { ...updated[index], [field]: value }
    
    // Handle name field with suggestions
    if (field === 'name') {
      // Filter suggestions based on input
      const filtered = availableContacts.filter(contact => 
        contact.contact_name.toLowerCase().includes(value.toLowerCase())
      )
      setContactSuggestions({ ...contactSuggestions, [index]: filtered })
      setShowSuggestions({ ...showSuggestions, [index]: value.length > 0 && filtered.length > 0 })
      
      // Auto-fill company and email if exact match
      const exactMatch = availableContacts.find(c => c.contact_name === value)
      if (exactMatch) {
        updated[index].company = exactMatch.contact_company || ''
        updated[index].email = exactMatch.contact_email || ''
        setShowSuggestions({ ...showSuggestions, [index]: false })
      }
    }
    
    setFilmContacts(updated)
  }

  const selectSuggestion = (index: number, contact: Contact) => {
    const updated = [...filmContacts]
    updated[index] = {
      ...updated[index],
      name: contact.contact_name,
      company: contact.contact_company || '',
      email: contact.contact_email || ''
    }
    setFilmContacts(updated)
    setShowSuggestions({ ...showSuggestions, [index]: false })
  }

  const removeContact = (index: number) => {
    setFilmContacts(filmContacts.filter((_, i) => i !== index))
  }

  const saveContacts = async () => {
    if (!film) return
    
    try {
      // Process each contact and auto-create if doesn't exist
      const processedContacts = []
      
      for (const contact of filmContacts.filter(c => c.name.trim())) {
        // Check if contact exists in main contacts table by email
        let existingContact = null
        if (contact.email && contact.email.trim()) {
          const { data: existing } = await supabase
            .from('contacts')
            .select('*')
            .eq('contact_email', contact.email.trim())
            .single()
          
          existingContact = existing
        }
        
        // If no contact found by email, check by name
        if (!existingContact) {
          const { data: existing } = await supabase
            .from('contacts')
            .select('*')
            .eq('contact_name', contact.name.trim())
            .single()
          
          existingContact = existing
        }
        
        // If contact doesn't exist, create it
        if (!existingContact && contact.name.trim()) {
          const newContactData = {
            contact_name: contact.name.trim(),
            contact_company: contact.company?.trim() || null,
            contact_email: contact.email?.trim() || null,
            contact_type: contact.contact_type || null
          }
          
          const { data: createdContact, error: createError } = await supabase
            .from('contacts')
            .insert([newContactData])
            .select()
            .single()
          
          if (!createError && createdContact) {
            console.log('Auto-created new contact:', createdContact.contact_name)
          } else {
            console.error('Error auto-creating contact:', createError)
          }
        }
        
        // Add to film contacts list
        processedContacts.push({
          film_id: film.id,
          film_type: filmType,
          name: contact.name.trim(),
          company: contact.company?.trim() || null,
          email: contact.email?.trim() || null,
          contact_type: contact.contact_type
        })
      }
      
      // Delete existing film contacts
      await supabase
        .from('film_contacts')
        .delete()
        .eq('film_id', film.id)
        .eq('film_type', filmType)
      
      // Insert new film contacts
      if (processedContacts.length > 0) {
        const { error } = await supabase
          .from('film_contacts')
          .insert(processedContacts)
        
        if (error) {
          console.error('Error saving film contacts:', error)
        } else {
          console.log('Saved film contacts, auto-created missing contacts')
        }
      }
    } catch (error) {
      console.error('Error saving contacts:', error)
    }
  }

  const handleSaveWithContacts = async () => {
    await handleSave()
    await saveContacts()
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: modalSize.width,
      height: modalSize.height
    })
  }

  const handleResize = (e: MouseEvent) => {
    if (!isResizing) return
    const deltaX = e.clientX - resizeStart.x
    const deltaY = e.clientY - resizeStart.y
    
    setModalSize({
      width: Math.max(600, resizeStart.width + deltaX),
      height: Math.max(400, resizeStart.height + deltaY)
    })
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    if (isResizing) {
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', handleMouseUp)
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing])

  if (!isOpen || !film) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div 
        className="bg-white rounded-lg shadow-xl pointer-events-auto relative"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          width: `${modalSize.width}px`,
          height: `${modalSize.height}px`,
          cursor: isDragging ? 'grabbing' : isResizing ? 'nw-resize' : 'default'
        }}
      >
        <div 
          className="bg-gray-50 px-6 py-4 border-b border-gray-200 rounded-t-lg cursor-grab active:cursor-grabbing flex justify-between items-center"
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-xl font-semibold text-gray-900">
            Edit {filmType === 'feature' ? 'Feature Film' : 'Short Film'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto" style={{ height: `${modalSize.height - 140}px` }}>
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <input
                type="text"
                value={formData.source || ''}
                onChange={(e) => handleFieldChange('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Language Title</label>
              <input
                type="text"
                value={formData.original_language_title || ''}
                onChange={(e) => handleFieldChange('original_language_title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Director</label>
              <input
                type="text"
                value={formData.director || ''}
                onChange={(e) => handleFieldChange('director', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Countries</label>
              <input
                type="text"
                value={formData.countries || ''}
                onChange={(e) => handleFieldChange('countries', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Runtime (minutes)</label>
              <input
                type="number"
                value={formData.run_time || ''}
                onChange={(e) => handleFieldChange('run_time', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <input
                type="text"
                value={formData.language || ''}
                onChange={(e) => handleFieldChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtitles</label>
              <input
                type="text"
                value={formData.subtitles || ''}
                onChange={(e) => handleFieldChange('subtitles', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Captions</label>
              <input
                type="text"
                value={formData.captions || ''}
                onChange={(e) => handleFieldChange('captions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Release Year</label>
              <input
                type="number"
                value={formData.original_release_year || ''}
                onChange={(e) => handleFieldChange('original_release_year', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Programs and Genres */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Programs & Genres</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program 1</label>
                <input
                  type="text"
                  value={formData.program_1 || ''}
                  onChange={(e) => handleFieldChange('program_1', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre 1</label>
                <input
                  type="text"
                  value={formData.genre_1 || ''}
                  onChange={(e) => handleFieldChange('genre_1', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program 2</label>
                <input
                  type="text"
                  value={formData.program_2 || ''}
                  onChange={(e) => handleFieldChange('program_2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre 2</label>
                <input
                  type="text"
                  value={formData.genre_2 || ''}
                  onChange={(e) => handleFieldChange('genre_2', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program 3</label>
                <input
                  type="text"
                  value={formData.program_3 || ''}
                  onChange={(e) => handleFieldChange('program_3', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre 3</label>
                <input
                  type="text"
                  value={formData.genre_3 || ''}
                  onChange={(e) => handleFieldChange('genre_3', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {filmType === 'feature' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Program 4</label>
                    <input
                      type="text"
                      value={(formData as FeatureFilm).program_4 || ''}
                      onChange={(e) => handleFieldChange('program_4', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Genre 4</label>
                    <input
                      type="text"
                      value={(formData as FeatureFilm).genre_4 || ''}
                      onChange={(e) => handleFieldChange('genre_4', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Shorts Programs - Only for short films */}
          {filmType === 'short' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Shorts Programs</h3>
              <p className="text-sm text-gray-600">Select which Shorts Programs this film belongs to</p>
              <div className="space-y-3 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                {availableShortsPrograms.length === 0 ? (
                  <p className="text-sm text-gray-500">No shorts programs available. Create one first.</p>
                ) : (
                  availableShortsPrograms.map(program => (
                    <div key={program.id} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id={`program-${program.id}`}
                        checked={selectedShortsPrograms[program.id]?.selected || false}
                        onChange={(e) => {
                          setSelectedShortsPrograms(prev => ({
                            ...prev,
                            [program.id]: {
                              selected: e.target.checked,
                              order: prev[program.id]?.order || 0
                            }
                          }))
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor={`program-${program.id}`} className="flex-1 text-sm text-gray-700">
                        {program.program_name}
                      </label>
                      {selectedShortsPrograms[program.id]?.selected && (
                        <input
                          type="number"
                          placeholder="Order"
                          value={selectedShortsPrograms[program.id]?.order || 0}
                          onChange={(e) => {
                            const order = parseInt(e.target.value) || 0
                            setSelectedShortsPrograms(prev => ({
                              ...prev,
                              [program.id]: {
                                ...prev[program.id],
                                order
                              }
                            }))
                          }}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Crew Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Crew Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Screenwriter</label>
                <input
                  type="text"
                  value={formData.screenwriter || ''}
                  onChange={(e) => handleFieldChange('screenwriter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cinematographer</label>
                <input
                  type="text"
                  value={formData.cinematographer || ''}
                  onChange={(e) => handleFieldChange('cinematographer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Art Director</label>
                <input
                  type="text"
                  value={formData.art_director || ''}
                  onChange={(e) => handleFieldChange('art_director', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Editor</label>
                <input
                  type="text"
                  value={formData.editor || ''}
                  onChange={(e) => handleFieldChange('editor', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Principal Cast</label>
                <input
                  type="text"
                  value={formData.principal_cast || ''}
                  onChange={(e) => handleFieldChange('principal_cast', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sound Designer</label>
                <input
                  type="text"
                  value={formData.sound_designer || ''}
                  onChange={(e) => handleFieldChange('sound_designer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Music/Score</label>
                <input
                  type="text"
                  value={formData.music_score || ''}
                  onChange={(e) => handleFieldChange('music_score', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producer</label>
                <input
                  type="text"
                  value={formData.producer || ''}
                  onChange={(e) => handleFieldChange('producer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Executive Producer</label>
                <input
                  type="text"
                  value={formData.executive_producer || ''}
                  onChange={(e) => handleFieldChange('executive_producer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Production Companies</label>
                <input
                  type="text"
                  value={formData.production_companies || ''}
                  onChange={(e) => handleFieldChange('production_companies', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Links and Additional Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Links & Additional Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Film Website</label>
                <input
                  type="url"
                  value={formData.film_website || ''}
                  onChange={(e) => handleFieldChange('film_website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trailer URL</label>
                <input
                  type="url"
                  value={formData.trailer_url || ''}
                  onChange={(e) => handleFieldChange('trailer_url', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {filmType === 'feature' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Premiere Status</label>
                  <input
                    type="text"
                    value={(formData as FeatureFilm).premiere_status || ''}
                    onChange={(e) => handleFieldChange('premiere_status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className={filmType === 'feature' ? '' : 'col-span-2'}>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Warnings</label>
                <textarea
                  value={formData.content_warnings || ''}
                  onChange={(e) => handleFieldChange('content_warnings', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
            <div className="space-y-3">
              {filmContacts.map((contact, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-md">
                  <div className="col-span-3 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => updateContact(index, 'name', e.target.value)}
                      onFocus={() => {
                        if (contact.name) {
                          const filtered = availableContacts.filter(c => 
                            c.contact_name.toLowerCase().includes(contact.name.toLowerCase())
                          )
                          setContactSuggestions({ ...contactSuggestions, [index]: filtered })
                          setShowSuggestions({ ...showSuggestions, [index]: filtered.length > 0 })
                        } else if (availableContacts.length > 0) {
                          setContactSuggestions({ ...contactSuggestions, [index]: availableContacts.slice(0, 10) })
                          setShowSuggestions({ ...showSuggestions, [index]: true })
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow clicking
                        setTimeout(() => {
                          setShowSuggestions({ ...showSuggestions, [index]: false })
                        }, 200)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Start typing to see suggestions..."
                    />
                    {showSuggestions[index] && contactSuggestions[index] && contactSuggestions[index].length > 0 && (
                      <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                        {contactSuggestions[index].map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => selectSuggestion(index, suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium">{suggestion.contact_name}</div>
                            {suggestion.contact_company && (
                              <div className="text-gray-600 text-xs">{suggestion.contact_company}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      value={contact.company || ''}
                      onChange={(e) => updateContact(index, 'company', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={contact.email || ''}
                      onChange={(e) => updateContact(index, 'email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={contact.contact_type}
                      onChange={(e) => updateContact(index, 'contact_type', e.target.value as FilmContactType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="Distributor/Studio">Distributor/Studio</option>
                      <option value="Production Team">Production Team</option>
                      <option value="Publicity">Publicity</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() => removeContact(index)}
                      className="w-full px-2 py-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={addContact}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add Contact
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
          >
            Delete Title
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveWithContacts}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize bg-gray-300 hover:bg-gray-400"
          style={{
            background: 'linear-gradient(-45deg, transparent 30%, #9ca3af 30%, #9ca3af 70%, transparent 70%)'
          }}
          onMouseDown={handleResizeStart}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-60 pointer-events-none">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 pointer-events-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Film</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "{film?.title}"? This action cannot be undone and will also delete all associated contact information.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}