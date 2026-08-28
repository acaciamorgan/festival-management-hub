'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/auth-provider'
import { useFestivalYear } from '@/components/providers/festival-year-provider'
import { getFestivalYear } from '@/lib/smart-date-parser'
import { useModalDrag } from '@/hooks/use-modal-drag'

interface FilmProgram {
  id: string
  name: string
  festival_year: number
}

interface Contact {
  id: string
  contact_company: string | null
  contact_name: string
  contact_email: string | null
  phone: string | null
  notes: string | null
  contact_type: string | null
}

interface ContactPair {
  company: string
  contact_name: string
  email: string
  phone: string
  role: string
  notes: string
  isExisting: boolean
  existingContactId?: string
}

interface ProgrammingFilm {
  id: string
  film: string // matches CSV "Film"
  original_title: string | null // matches CSV "Original Title"
  director: string | null // matches CSV "Director"
  country: string | null // matches CSV "Country"
  category: string | null // matches CSV "Category"
  runtime: number | null // new field for minutes
  
  // Programming workflow fields (matches CSV)
  travel: string | null // matches CSV "Travel"
  synopsis: string | null // matches CSV "Synopsis" (writer name)
  written: boolean // matches CSV "Written" (X = true)
  approved: string | null // matches CSV "Approved" (Logline, X, etc.)
  content_consideration: string | null // matches CSV "Content Consideration"
  
  // Program assignments via junction table
  program_assignments: Array<{ film_program: FilmProgram; position: number }>
  
  // Materials and submission tracking
  contacted_for_materials: boolean // matches CSV "Contacted for materials"
  form_submitted: boolean // matches CSV "Form Submitted"
  uploaded_materials: boolean // matches CSV "Uploaded Materials"
  materials_received: boolean // matches CSV "Materials Received"
  accessibility_screening: boolean // matches CSV "Accessibility Screening?"
  premiere_status: string | null // matches CSV "Premiere Status"
  cards_made: boolean // matches CSV "Cards made"
  
  // Visual and metadata
  color_highlight: string | null
  cell_highlights: Record<string, string> | null // Individual cell highlighting
  travel_notes: string | null
  synopsis_notes: string | null
  materials_notes: string | null
  programming_notes: string | null
  status: string // only draft status - no publishing
  contacts: Array<{
    contact: Contact
    role: string | null
  }>
  festival_year: number
  created_at: string
  updated_at: string
  created_by: string
}

interface ProgrammingFilmFormModalProps {
  film: ProgrammingFilm | null
  isOpen: boolean
  onClose: () => void
  onSave: (film: ProgrammingFilm) => void
}

export function ProgrammingFilmFormModal({ film, isOpen, onClose, onSave }: ProgrammingFilmFormModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const { handleMouseDown, modalStyle, isMobile, isDragging } = useModalDrag()
  const [existingContacts, setExistingContacts] = useState<Contact[]>([])
  const [existingPrograms, setExistingPrograms] = useState<FilmProgram[]>([])
  const [programSearches, setProgramSearches] = useState<string[]>(['', '', '', '', ''])
  const [activeProgramDropdown, setActiveProgramDropdown] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    film: '',
    original_title: '',
    director: '',
    country: '',
    category: 'feature',
    runtime: null as number | null,
    travel: '',
    synopsis: '',
    written: false,
    approved: false,
    content_consideration: '',
    programs: [] as string[],
    contacted_for_materials: false,
    form_submitted: false,
    uploaded_materials: false,
    materials_received: false,
    accessibility_screening: false,
    premiere_status: '',
    cards_made: false,
    color_highlight: '',
    travel_notes: '',
    synopsis_notes: '',
    materials_notes: '',
    programming_notes: '',
    contacts: [
      {
        company: '',
        contact_name: '',
        email: '',
        phone: '',
        role: '',
        notes: '',
        isExisting: false,
        existingContactId: undefined
      }
    ] as ContactPair[]
  })

  const supabase = createClient()
  const { currentYear } = useFestivalYear()

  // Load existing contacts and film programs for autocomplete
  useEffect(() => {
    const loadData = async () => {
      try {
        const [contactsResult, programsResult] = await Promise.all([
          supabase
            .from('contacts')
            .select('*')
            .eq('festival_year', currentYear)
            .order('contact_name'),
          supabase
            .from('film_programs')
            .select('*')
            .eq('festival_year', currentYear)
            .order('name')
        ])

        if (contactsResult.error) throw contactsResult.error
        if (programsResult.error) throw programsResult.error

        setExistingContacts(contactsResult.data || [])
        setExistingPrograms(programsResult.data || [])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen, supabase, currentYear])

  // Set form data when film prop changes
  useEffect(() => {
    if (film) {
      setFormData({
        film: film.film || '',
        original_title: film.original_title || '',
        director: film.director || '',
        country: film.country || '',
        category: film.category || 'feature',
        runtime: film.runtime,
        travel: film.travel || '',
        synopsis: film.synopsis || '',
        written: film.written || false,
        approved: !!film.approved,
        content_consideration: film.content_consideration || '',
        programs: (film.program_assignments || [])
          .sort((a, b) => a.position - b.position)
          .map(a => a.film_program.name),
        contacted_for_materials: film.contacted_for_materials || false,
        form_submitted: film.form_submitted || false,
        uploaded_materials: film.uploaded_materials || false,
        materials_received: film.materials_received || false,
        accessibility_screening: film.accessibility_screening || false,
        premiere_status: film.premiere_status || '',
        cards_made: film.cards_made || false,
        color_highlight: film.color_highlight || '',
        travel_notes: film.travel_notes || '',
        synopsis_notes: film.synopsis_notes || '',
        materials_notes: film.materials_notes || '',
        programming_notes: film.programming_notes || '',
        contacts: film.contacts.length > 0 
          ? film.contacts.map(c => ({
              company: c.contact.contact_company || '',
              contact_name: c.contact.contact_name || '',
              email: c.contact.contact_email || '',
              phone: c.contact.phone || '',
              role: c.role || '',
              notes: '',
              isExisting: true,
              existingContactId: c.contact.id
            }))
          : [{
              company: '',
              contact_name: '',
              email: '',
              phone: '',
              role: '',
              notes: '',
              isExisting: false,
              existingContactId: undefined
            }]
      })
    } else {
      setFormData({
        film: '',
        original_title: '',
        director: '',
        country: '',
        category: 'feature',
        runtime: null,
        travel: '',
        synopsis: '',
        written: false,
        approved: false,
        content_consideration: '',
        programs: [],
        contacted_for_materials: false,
        form_submitted: false,
        uploaded_materials: false,
        materials_received: false,
        accessibility_screening: false,
        premiere_status: '',
        cards_made: false,
        color_highlight: '',
        travel_notes: '',
        synopsis_notes: '',
        materials_notes: '',
        programming_notes: '',
        contacts: [{
          company: '',
          contact_name: '',
          email: '',
          phone: '',
          role: '',
          notes: '',
          isExisting: false,
          existingContactId: undefined
        }]
      })
    }
  }, [film])

  const addContactPair = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, {
        company: '',
        contact_name: '',
        email: '',
        phone: '',
        role: '',
        notes: '',
        isExisting: false,
        existingContactId: undefined
      }]
    }))
  }

  const removeContactPair = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index)
    }))
  }

  const updateContactPair = (index: number, field: keyof ContactPair, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }))
  }

  // Handle contact autocomplete selection
  const handleContactSelect = (index: number, selectedContact: Contact) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? {
          ...contact,
          company: selectedContact.contact_company || '',
          contact_name: selectedContact.contact_name,
          email: selectedContact.contact_email || '',
          phone: selectedContact.phone || '',
          isExisting: true,
          existingContactId: selectedContact.id
        } : contact
      )
    }))
  }

  const getFilteredContacts = (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) return []
    
    const search = searchTerm.toLowerCase()
    return existingContacts.filter(contact => 
      contact.contact_name.toLowerCase().includes(search) ||
      (contact.contact_company && contact.contact_company.toLowerCase().includes(search)) ||
      (contact.contact_email && contact.contact_email.toLowerCase().includes(search))
    ).slice(0, 5)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.film.trim()) {
      alert('Film title is required')
      return
    }

    setLoading(true)

    try {
      const festivalYear = await getFestivalYear()
      let filmId: string

      const filmPayload = {
        film: formData.film.trim(),
        original_title: formData.original_title.trim() || null,
        director: formData.director.trim() || null,
        country: formData.country.trim() || null,
        category: formData.category,
        runtime: formData.runtime,
        travel: formData.travel.trim() || null,
        synopsis: formData.synopsis.trim() || null,
        written: formData.written,
        approved: formData.approved ? 'X' : null,
        content_consideration: formData.content_consideration.trim() || null,
        contacted_for_materials: formData.contacted_for_materials,
        form_submitted: formData.form_submitted,
        uploaded_materials: formData.uploaded_materials,
        materials_received: formData.materials_received,
        accessibility_screening: formData.accessibility_screening,
        premiere_status: formData.premiere_status.trim() || null,
        cards_made: formData.cards_made,
        color_highlight: formData.color_highlight.trim() || null,
        travel_notes: formData.travel_notes.trim() || null,
        synopsis_notes: formData.synopsis_notes.trim() || null,
        materials_notes: formData.materials_notes.trim() || null,
        programming_notes: formData.programming_notes.trim() || null
      }

      if (film) {
        const { error: filmError } = await supabase
          .from('programming_films')
          .update(filmPayload)
          .eq('id', film.id)

        if (filmError) throw filmError
        filmId = film.id
      } else {
        const { data: newFilm, error: filmError } = await supabase
          .from('programming_films')
          .insert({
            ...filmPayload,
            festival_year: parseInt(festivalYear, 10),
            created_by: user?.id
          })
          .select()
          .single()

        if (filmError) throw filmError
        filmId = newFilm.id
      }

      // Handle program assignments
      // Delete existing assignments first
      await supabase
        .from('film_program_assignments')
        .delete()
        .eq('programming_film_id', filmId)

      const programNames = formData.programs.filter(p => p.trim() !== '')
      const fyInt = parseInt(festivalYear, 10)

      for (let i = 0; i < programNames.length; i++) {
        const programName = programNames[i].trim()

        // Find existing program or create new one
        let programId: string
        const existing = existingPrograms.find(
          p => p.name.toLowerCase() === programName.toLowerCase()
        )

        if (existing) {
          programId = existing.id
        } else {
          const { data: newProgram, error: progError } = await supabase
            .from('film_programs')
            .insert({ name: programName, festival_year: fyInt })
            .select()
            .single()

          if (progError) throw progError
          programId = newProgram.id
          // Add to local list so subsequent slots can find it
          setExistingPrograms(prev => [...prev, newProgram])
        }

        await supabase
          .from('film_program_assignments')
          .insert({
            programming_film_id: filmId,
            film_program_id: programId,
            position: i + 1,
            festival_year: fyInt
          })
      }

      // Handle contacts
      if (film) {
        await supabase
          .from('programming_film_contacts')
          .delete()
          .eq('programming_film_id', filmId)
      }

      // Process contacts
      for (const contactData of formData.contacts) {
        if (!contactData.contact_name.trim()) continue

        let contactId: string

        if (contactData.isExisting && contactData.existingContactId) {
          // Use existing contact
          contactId = contactData.existingContactId
        } else {
          // Create new contact
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              contact_company: contactData.company.trim() || null,
              contact_name: contactData.contact_name.trim(),
              contact_email: contactData.email.trim() || null,
              phone: contactData.phone.trim() || null,
              notes: contactData.notes.trim() || null,
              created_by: user?.id,
              festival_year: currentYear
            })
            .select()
            .single()

          if (contactError) throw contactError
          contactId = newContact.id
        }

        // Create film-contact relationship
        await supabase
          .from('programming_film_contacts')
          .insert({
            programming_film_id: filmId,
            contact_id: contactId,
            role: contactData.role.trim() || null,
            created_by: user?.id,
            festival_year: currentYear
          })
      }

      // Refresh page to show updated data
      window.location.reload()
      
      onClose()
    } catch (error) {
      console.error('Error saving programming film:', error)
      alert('Error saving film. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <>
      
      {/* Modal */}
      <div
        className="bg-white rounded-lg shadow-2xl border border-gray-300 z-50 overflow-y-auto"
        style={{
          ...modalStyle,
          width: isMobile ? '95vw' : '90vw',
          maxWidth: isMobile ? '95vw' : '56rem',
          maxHeight: isMobile ? '90vh' : 'calc(100vh - 2rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draggable Header */}
        <div 
          className={`flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'}`}
          onMouseDown={handleMouseDown}
        >
          <h1 className="text-lg font-semibold text-gray-900">
            {film ? 'Edit Programming Film' : 'Add Programming Film'}
          </h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Film Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="film" className="block text-sm font-medium text-gray-700 mb-1">
                  Film Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="film"
                  value={formData.film}
                  onChange={(e) => setFormData(prev => ({ ...prev, film: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="original_title" className="block text-sm font-medium text-gray-700 mb-1">
                  Original Title
                </label>
                <input
                  type="text"
                  id="original_title"
                  value={formData.original_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, original_title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="director" className="block text-sm font-medium text-gray-700 mb-1">
                  Director
                </label>
                <input
                  type="text"
                  id="director"
                  value={formData.director}
                  onChange={(e) => setFormData(prev => ({ ...prev, director: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="feature">Feature</option>
                  <option value="short">Short</option>
                </select>
              </div>

              <div>
                <label htmlFor="runtime" className="block text-sm font-medium text-gray-700 mb-1">
                  Runtime (minutes)
                </label>
                <input
                  type="number"
                  id="runtime"
                  value={formData.runtime || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, runtime: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="90"
                />
              </div>

            </div>

            {/* Programming Workflow Fields (CSV Structure) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="travel" className="block text-sm font-medium text-gray-700 mb-1">
                  Travel
                </label>
                <input
                  type="text"
                  id="travel"
                  value={formData.travel}
                  onChange={(e) => setFormData(prev => ({ ...prev, travel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Yes/No/Maybe/TBD"
                />
              </div>

              <div>
                <label htmlFor="content_consideration" className="block text-sm font-medium text-gray-700 mb-1">
                  Content Consideration
                </label>
                <input
                  type="text"
                  id="content_consideration"
                  value={formData.content_consideration}
                  onChange={(e) => setFormData(prev => ({ ...prev, content_consideration: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="synopsis" className="block text-sm font-medium text-gray-700 mb-1">
                  Synopsis Written By
                </label>
                <input
                  type="text"
                  id="synopsis"
                  value={formData.synopsis}
                  onChange={(e) => setFormData(prev => ({ ...prev, synopsis: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Writer name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.written}
                    onChange={(e) => setFormData(prev => ({ ...prev, written: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Written</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!formData.approved}
                    onChange={(e) => setFormData(prev => ({ ...prev, approved: e.target.checked ? 'X' : '' }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Synopsis Approved</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.contacted_for_materials}
                    onChange={(e) => setFormData(prev => ({ ...prev, contacted_for_materials: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Contacted for Materials</span>
                </label>
              </div>

            </div>

            {/* Program Assignments (Up to 5) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Program Assignments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[0, 1, 2, 3, 4].map(index => {
                  const searchTerm = programSearches[index] ?? ''
                  const currentValue = formData.programs[index] || ''
                  const filtered = searchTerm.length > 0
                    ? existingPrograms.filter(p =>
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                        !formData.programs.includes(p.name)
                      ).slice(0, 8)
                    : []
                  const exactMatch = existingPrograms.some(
                    p => p.name.toLowerCase() === searchTerm.toLowerCase()
                  )

                  return (
                    <div key={index} className="relative">
                      <label htmlFor={`program_${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                        Program {index + 1}
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          id={`program_${index}`}
                          value={activeProgramDropdown === index ? searchTerm : currentValue}
                          onChange={(e) => {
                            const val = e.target.value
                            setProgramSearches(prev => {
                              const next = [...prev]
                              next[index] = val
                              return next
                            })
                            setActiveProgramDropdown(index)
                          }}
                          onFocus={() => {
                            setProgramSearches(prev => {
                              const next = [...prev]
                              next[index] = currentValue
                              return next
                            })
                            setActiveProgramDropdown(index)
                          }}
                          onBlur={() => {
                            // Delay to allow dropdown click to register
                            setTimeout(() => {
                              if (activeProgramDropdown === index) {
                                // If user typed something, commit it
                                const typed = programSearches[index]?.trim()
                                if (typed) {
                                  const newPrograms = [...formData.programs]
                                  newPrograms[index] = typed
                                  setFormData(prev => ({ ...prev, programs: newPrograms }))
                                }
                                setActiveProgramDropdown(null)
                              }
                            }, 200)
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Type to search or create..."
                        />
                        {currentValue && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPrograms = [...formData.programs]
                              newPrograms[index] = ''
                              setFormData(prev => ({ ...prev, programs: newPrograms.filter((p, i) => p || i >= index) }))
                              setProgramSearches(prev => {
                                const next = [...prev]
                                next[index] = ''
                                return next
                              })
                            }}
                            className="px-2 text-gray-400 hover:text-red-500"
                            title="Clear"
                          >
                            ×
                          </button>
                        )}
                      </div>

                      {activeProgramDropdown === index && searchTerm.length > 0 && (
                        <div className="absolute z-20 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                          {filtered.map(program => (
                            <button
                              key={program.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const newPrograms = [...formData.programs]
                                newPrograms[index] = program.name
                                setFormData(prev => ({ ...prev, programs: newPrograms }))
                                setActiveProgramDropdown(null)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-b-0"
                            >
                              {program.name}
                            </button>
                          ))}
                          {searchTerm.trim() && !exactMatch && (
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const newPrograms = [...formData.programs]
                                newPrograms[index] = searchTerm.trim()
                                setFormData(prev => ({ ...prev, programs: newPrograms }))
                                setActiveProgramDropdown(null)
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm text-green-700 font-medium"
                            >
                              + Create "{searchTerm.trim()}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>


            {/* Additional Tracking Fields */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Submission & Materials Tracking</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="premiere_status" className="block text-sm font-medium text-gray-700 mb-1">
                    Premiere Status
                  </label>
                  <input
                    type="text"
                    id="premiere_status"
                    value={formData.premiere_status}
                    onChange={(e) => setFormData(prev => ({ ...prev, premiere_status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="World, North American, US, etc."
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.form_submitted}
                      onChange={(e) => setFormData(prev => ({ ...prev, form_submitted: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Form Submitted</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.uploaded_materials}
                      onChange={(e) => setFormData(prev => ({ ...prev, uploaded_materials: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Uploaded Materials</span>
                  </label>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.accessibility_screening}
                      onChange={(e) => setFormData(prev => ({ ...prev, accessibility_screening: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Accessibility Screening</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.cards_made}
                      onChange={(e) => setFormData(prev => ({ ...prev, cards_made: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Cards Made</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Contacts Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
                <button
                  type="button"
                  onClick={addContactPair}
                  className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  + Add Contact
                </button>
              </div>

              {formData.contacts.map((contact, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-700">Contact {index + 1}</h4>
                    {formData.contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContactPair(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={contact.contact_name}
                        onChange={(e) => updateContactPair(index, 'contact_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Start typing to search existing contacts..."
                      />
                      
                      {/* Autocomplete dropdown */}
                      {contact.contact_name && contact.contact_name.length >= 2 && (
                        <div className="relative">
                          {getFilteredContacts(contact.contact_name).length > 0 && (
                            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                              {getFilteredContacts(contact.contact_name).map((existingContact) => (
                                <button
                                  key={existingContact.id}
                                  type="button"
                                  onClick={() => handleContactSelect(index, existingContact)}
                                  className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium">{existingContact.contact_name}</div>
                                  {existingContact.contact_company && (
                                    <div className="text-sm text-gray-500">{existingContact.contact_company}</div>
                                  )}
                                  {existingContact.contact_email && (
                                    <div className="text-sm text-gray-500">{existingContact.contact_email}</div>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company
                      </label>
                      <input
                        type="text"
                        value={contact.company}
                        onChange={(e) => updateContactPair(index, 'company', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) => updateContactPair(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={contact.phone}
                        onChange={(e) => updateContactPair(index, 'phone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        value={contact.role}
                        onChange={(e) => updateContactPair(index, 'role', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Sales Agent, Producer, Distributor"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="travel_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Travel Notes
                </label>
                <textarea
                  id="travel_notes"
                  value={formData.travel_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, travel_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="synopsis_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Synopsis Notes
                </label>
                <textarea
                  id="synopsis_notes"
                  value={formData.synopsis_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, synopsis_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="materials_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Materials Notes
                </label>
                <textarea
                  id="materials_notes"
                  value={formData.materials_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, materials_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="programming_notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Programming Notes
                </label>
                <textarea
                  id="programming_notes"
                  value={formData.programming_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, programming_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              {film && (
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this film? This action cannot be undone.')) {
                      try {
                        await supabase
                          .from('programming_films')
                          .delete()
                          .eq('id', film.id)
                        
                        window.location.reload()
                        onClose()
                      } catch (error) {
                        console.error('Error deleting film:', error)
                        alert('Error deleting film. Please try again.')
                      }
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Film
                </button>
              )}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : film ? 'Update Film' : 'Save Film'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}