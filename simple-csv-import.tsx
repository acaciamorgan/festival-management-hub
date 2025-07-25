// Simple, direct CSV import function - replace the existing processShortsCSV function

const processShortsCSV = async (rows: string[][], headers: string[]) => {
  setUploadStatus('Processing shorts CSV with new simple approach...')
  
  // Find column indices directly
  const indices = {
    title: headers.indexOf('Film Title'),
    source: headers.indexOf('Source'),
    original_language_title: headers.indexOf('Original Language Title'),
    language: headers.indexOf('Language'),
    subtitles: headers.indexOf('Subtitles? (Yes or No)'),
    run_time: headers.indexOf('Run time'),
    director: headers.indexOf('Director'),
    countries: headers.findIndex(h => h.includes('Country')),
    program_1: headers.indexOf('Program 1'),
    program_2: headers.indexOf('Program 2'),
    genre_1: headers.indexOf('Genre 1'),
    genre_2: headers.indexOf('Genre 2'),
    genre_3: headers.indexOf('Genre 3'),
    captions: headers.findIndex(h => h.includes('Captions')),
    screenwriter: headers.indexOf('Screenwriter'),
    cinematographer: headers.indexOf('Cinematographer'),
    art_director: headers.indexOf('Art Director'),
    editor: headers.indexOf('Editor'),
    principal_cast: headers.indexOf('Principal Cast'),
    music_score: headers.indexOf('Music/Score'),
    producer: headers.indexOf('Producer'),
    executive_producer: headers.indexOf('Executive Producer'),
    production_companies: headers.indexOf('Production Companies'),
    film_website: headers.indexOf('Film website'),
    trailer_url: headers.findIndex(h => h.includes('Trailer')),
    premiere_status: headers.indexOf('Premiere Status'),
    content_warnings: headers.indexOf('Content Warnings')
  }

  console.log('Column indices found:', indices)

  let created = 0
  let updated = 0

  // Process each row directly
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0 || !row[indices.title]?.trim()) continue

    const title = row[indices.title]?.trim()
    if (!title) continue

    // Build the short data object directly
    const shortData: any = {
      title,
      source: row[indices.source]?.trim() || null,
      original_language_title: row[indices.original_language_title]?.trim() || null,
      language: row[indices.language]?.trim() || null,
      subtitles: row[indices.subtitles]?.trim() || null,
      director: row[indices.director]?.trim() || null,
      countries: row[indices.countries]?.trim() || null,
      program_1: row[indices.program_1]?.trim() || null,
      program_2: row[indices.program_2]?.trim() || null,
      genre_1: row[indices.genre_1]?.trim() || null,
      genre_2: row[indices.genre_2]?.trim() || null,
      genre_3: row[indices.genre_3]?.trim() || null,
      captions: row[indices.captions]?.trim() || null,
      screenwriter: row[indices.screenwriter]?.trim() || null,
      cinematographer: row[indices.cinematographer]?.trim() || null,
      art_director: row[indices.art_director]?.trim() || null,
      editor: row[indices.editor]?.trim() || null,
      principal_cast: row[indices.principal_cast]?.trim() || null,
      music_score: row[indices.music_score]?.trim() || null,
      producer: row[indices.producer]?.trim() || null,
      executive_producer: row[indices.executive_producer]?.trim() || null,
      production_companies: row[indices.production_companies]?.trim() || null,
      film_website: row[indices.film_website]?.trim() || null,
      trailer_url: row[indices.trailer_url]?.trim() || null,
      premiere_status: row[indices.premiere_status]?.trim() || null,
      content_warnings: row[indices.content_warnings]?.trim() || null
    }

    // Handle numeric fields
    if (row[indices.run_time]) {
      const runtime = parseInt(row[indices.run_time])
      if (!isNaN(runtime)) shortData.run_time = runtime
    }

    console.log(`Processing: ${title}`, {
      screenwriter: shortData.screenwriter,
      cinematographer: shortData.cinematographer,
      principal_cast: shortData.principal_cast
    })

    // Check if record exists (preserve program assignments)
    const { data: existingRecord } = await supabase
      .from('short_films')
      .select('id, shorts_program_id, program_order')
      .eq('title', title)
      .single()

    if (existingRecord) {
      // Update existing - preserve program assignment
      const { error: updateError } = await supabase
        .from('short_films')
        .update(shortData)
        .eq('id', existingRecord.id)

      if (updateError) {
        console.error('Update error:', updateError)
        setUploadStatus(`Update error for ${title}: ${updateError.message}`)
        return
      } else {
        updated++
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from('short_films')
        .insert([shortData])

      if (insertError) {
        console.error('Insert error:', insertError)
        setUploadStatus(`Insert error for ${title}: ${insertError.message}`)
        return
      } else {
        created++
      }
    }
  }

  setUploadStatus(`Successfully processed! Created: ${created}, Updated: ${updated}`)
  await loadShorts()
}