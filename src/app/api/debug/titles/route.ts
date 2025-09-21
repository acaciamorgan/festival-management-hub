import { createClient } from '../../../../lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  const supabase = await createClient()

  try {
    // Get all titles from feature films and short films
    const [featureFilms, shortFilms, programs] = await Promise.all([
      supabase.from('feature_films').select('id, title').order('title'),
      supabase.from('short_films').select('id, title').order('title'),
      supabase.from('programs').select('id, title').order('title')
    ])

    const allTitles = [
      ...(featureFilms.data || []).map(f => ({ ...f, type: 'feature' })),
      ...(shortFilms.data || []).map(f => ({ ...f, type: 'short' })),
      ...(programs.data || []).map(f => ({ ...f, type: 'program' }))
    ]

    // Filter if search term provided
    const filteredTitles = search ?
      allTitles.filter(t => t.title.toLowerCase().includes(search.toLowerCase())) :
      allTitles

    return NextResponse.json({
      success: true,
      count: filteredTitles.length,
      titles: filteredTitles,
      search: search || 'all'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}