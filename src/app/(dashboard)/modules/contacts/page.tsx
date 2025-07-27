'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContactCard } from '@/types'
import { ContactFormModal } from '@/components/forms/contact-form-modal'
import { FilmCardPopup } from '@/components/cards/film-card-popup'
import { createAccentInsensitiveFilter } from '@/lib/search-utils'

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactCard[]>([])
  const [filteredContacts, setFilteredContacts] = useState<ContactCard[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContactType, setSelectedContactType] = useState('')
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'contact_name', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingContact, setEditingContact] = useState<ContactCard | null>(null)
  const [selectedFilm, setSelectedFilm] = useState<any>(null)
  const [showFilmCard, setShowFilmCard] = useState(false)
  const [showFilmsMode, setShowFilmsMode] = useState(false)
  const [existingFilms, setExistingFilms] = useState<Set<string>>(new Set())

  const supabase = createClient()

  // Load existing films and programs only when Show Films toggle is activated
  useEffect(() => {
    const loadExistingFilms = async () => {
      if (!showFilmsMode) {
        setExistingFilms(new Set())
        return
      }

      try {
        const [featureFilms, shortFilms, programs] = await Promise.all([
          supabase.from('feature_films').select('title'),
          supabase.from('short_films').select('title'),
          supabase.from('programs').select('title')
        ])

        const allTitles = new Set<string>()
        
        if (featureFilms.data) {
          featureFilms.data.forEach(film => allTitles.add(film.title))
        }
        if (shortFilms.data) {
          shortFilms.data.forEach(film => allTitles.add(film.title))
        }
        if (programs.data) {
          programs.data.forEach(program => allTitles.add(program.title))
        }

        setExistingFilms(allTitles)
      } catch (error) {
        console.error('Error loading film/program titles:', error)
      }
    }

    loadExistingFilms()
  }, [showFilmsMode, supabase])

  const loadContacts = useCallback(async () => {
    setLoading(true)
    try {
      // Load contacts with associated film count
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .order('contact_name')

      if (contactsError) {
        console.error('Error loading contacts:', contactsError)
        setContacts([])
        setFilteredContacts([])
        return
      }

      // Only load film associations if Show Films mode is active
      let contactsWithFilms
      if (showFilmsMode) {
        contactsWithFilms = await Promise.all(
        (contactsData || []).map(async (contact) => {
          // Get film contacts that match this contact's name
          const { data: filmContacts } = await supabase
            .from('film_contacts')
            .select('film_id, film_type, name')
            .eq('name', contact.contact_name)
          
          console.log(`Looking for film contacts for "${contact.contact_name}":`, filmContacts)

          if (!filmContacts || filmContacts.length === 0) {
            return {
              ...contact,
              associated_films: [],
              associated_films_data: []
            }
          }

          // Get actual film data from both tables
          const associatedFilms = []
          const associatedFilmsData = []
          
          for (const fc of filmContacts) {
            try {
              if (fc.film_type === 'feature') {
                const { data: featureFilm } = await supabase
                  .from('feature_films')
                  .select('id, title, director, countries, program_1, program_2, program_3, program_4, genre_1, genre_2, genre_3, genre_4')
                  .eq('id', fc.film_id)
                  .single()
                
                if (featureFilm) {
                  associatedFilms.push(featureFilm.title)
                  associatedFilmsData.push({
                    id: featureFilm.id,
                    title: featureFilm.title,
                    film_type: 'feature' as const,
                    director: featureFilm.director,
                    countries: featureFilm.countries,
                    programs: [featureFilm.program_1, featureFilm.program_2, featureFilm.program_3, featureFilm.program_4]
                      .filter(Boolean).join(', ')
                  })
                }
              } else if (fc.film_type === 'short') {
                const { data: shortFilm } = await supabase
                  .from('short_films')
                  .select('id, title, director, countries, program_1, program_2, program_3, genre_1, genre_2, genre_3')
                  .eq('id', fc.film_id)
                  .single()
                
                if (shortFilm) {
                  associatedFilms.push(shortFilm.title)
                  associatedFilmsData.push({
                    id: shortFilm.id,
                    title: shortFilm.title,
                    film_type: 'short' as const,
                    director: shortFilm.director,
                    countries: shortFilm.countries,
                    programs: [shortFilm.program_1, shortFilm.program_2, shortFilm.program_3]
                      .filter(Boolean).join(', ')
                  })
                }
              }
            } catch (error) {
              console.error('Error loading film title:', error)
            }
          }

          return {
            ...contact,
            associated_films: associatedFilms,
            associated_films_data: associatedFilmsData
          }
        })
        )
      } else {
        // When toggle is off, just load basic contact data with empty film arrays
        contactsWithFilms = (contactsData || []).map(contact => ({
          ...contact,
          associated_films: [],
          associated_films_data: []
        }))
      }

      setContacts(contactsWithFilms)
      setFilteredContacts(contactsWithFilms)
    } catch (error) {
      console.error('Error loading contacts:', error)
      setContacts([])
      setFilteredContacts([])
    } finally {
      setLoading(false)
    }
  }, [supabase, showFilmsMode])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  // Filter and search
  useEffect(() => {
    let filtered = contacts

    // Search filter with accent-insensitive search
    if (searchTerm) {
      const searchFilter = createAccentInsensitiveFilter<ContactCard>(
        searchTerm,
        (contact) => [
          contact.contact_name,
          contact.contact_company,
          contact.contact_email,
          contact.contact_type
        ]
      )
      filtered = filtered.filter(searchFilter)
    }

    // Contact type filter
    if (selectedContactType) {
      filtered = filtered.filter(contact => contact.contact_type === selectedContactType)
    }

    setFilteredContacts(filtered)
  }, [contacts, searchTerm, selectedContactType])

  // Sort contacts
  const sortedContacts = useMemo(() => {
    if (!sortConfig) return filteredContacts

    return [...filteredContacts].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof ContactCard]
      const bVal = b[sortConfig.key as keyof ContactCard]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const result = aVal.localeCompare(bVal)
        return sortConfig.direction === 'asc' ? result : -result
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredContacts, sortConfig])

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return '↕️'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const handleAddContact = () => {
    setEditingContact(null)
    setShowAddModal(true)
  }

  const handleEditContact = (contact: ContactCard) => {
    setEditingContact(contact)
    setShowAddModal(true)
  }

  const handleDeleteContact = async (contact: ContactCard) => {
    if (!confirm(`Are you sure you want to delete contact "${contact.contact_name}"?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contact.id)

      if (error) {
        console.error('Error deleting contact:', error)
        alert('Error deleting contact')
      } else {
        loadContacts()
      }
    } catch (error) {
      console.error('Error deleting contact:', error)
      alert('Error deleting contact')
    }
  }

  const contactTypes = Array.from(new Set(
    contacts.map(c => c.contact_type).filter(Boolean)
  )).sort()

  const handleFilmClick = (filmData: any) => {
    setSelectedFilm(filmData)
    setShowFilmCard(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading contacts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl mr-3">📇</span>
            <h1 className="text-2xl font-semibold text-gray-900">Contacts Management</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilmsMode(!showFilmsMode)}
              className={`px-4 py-2 rounded-md transition-colors font-medium ${
                showFilmsMode 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              🎬 {showFilmsMode ? 'Hide Films' : 'Show Films'}
            </button>
            <button
              onClick={handleAddContact}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Add Contact
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contact Type Filter */}
          <div>
            <select
              value={selectedContactType}
              onChange={(e) => setSelectedContactType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {contactTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('')
              setSelectedContactType('')
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { key: 'contact_name', label: 'Name', width: 200 },
                    { key: 'contact_company', label: 'Company', width: 200 },
                    { key: 'contact_email', label: 'Email', width: 250 },
                    { key: 'phone', label: 'Phone', width: 150 },
                    { key: 'contact_type', label: 'Type', width: 150 },
                    { key: 'associated_films', label: 'Associated Films', width: 300 },
                    { key: 'actions', label: 'Actions', width: 120 }
                  ].map((column) => (
                    <th
                      key={column.key}
                      className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      style={{ minWidth: `${columnWidths[column.key] || column.width}px` }}
                      onClick={() => column.key !== 'actions' && handleSort(column.key)}
                    >
                      <div className="flex items-center justify-between">
                        <span>{column.label}</span>
                        {column.key !== 'actions' && (
                          <span className="text-gray-400 ml-1">
                            {getSortIcon(column.key)}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_name'] || 200}px` }}>
                      <span className="font-medium">{contact.contact_name}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_company'] || 200}px` }}>
                      {contact.contact_company}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_email'] || 250}px` }}>
                      {contact.contact_email && (
                        <a href={`mailto:${contact.contact_email}`} className="text-blue-600 hover:text-blue-800">
                          {contact.contact_email}
                        </a>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['phone'] || 150}px` }}>
                      {contact.phone}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['contact_type'] || 150}px` }}>
                      {contact.contact_type && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {contact.contact_type}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 border-r border-gray-100" style={{ minWidth: `${columnWidths['associated_films'] || 300}px` }}>
                      {contact.associated_films_data && contact.associated_films_data.length > 0 ? (
                        <div className="max-w-xs">
                          {contact.associated_films_data.map((film, index) => (
                            <span key={film.id}>
                              {showFilmsMode ? (
                                <button
                                  onClick={() => handleFilmClick(film)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline text-xs"
                                >
                                  {film.title}
                                </button>
                              ) : (
                                <span className="text-gray-900 text-xs">{film.title}</span>
                              )}
                              {index < contact.associated_films_data!.length - 1 && (
                                <span className="text-gray-400">, </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No associated films</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900" style={{ minWidth: `${columnWidths['actions'] || 120}px` }}>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditContact(contact)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sortedContacts.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">📇</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedContactType ? 'Try adjusting your filters' : 'Get started by adding your first contact'}
            </p>
            <button
              onClick={handleAddContact}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Add Contact
            </button>
          </div>
        )}
      </div>

      {/* Contact Form Modal */}
      <ContactFormModal
        contact={editingContact}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingContact(null)
        }}
        onSave={() => {
          setShowAddModal(false)
          setEditingContact(null)
          loadContacts()
        }}
      />

      {/* Film Card Popup */}
      {showFilmCard && selectedFilm && (
        <FilmCardPopup
          film={selectedFilm}
          onClose={() => {
            setShowFilmCard(false)
            setSelectedFilm(null)
          }}
        />
      )}
    </div>
  )
}