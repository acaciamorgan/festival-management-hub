CREATE TABLE outlets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  outlet_type VARCHAR(20) CHECK (outlet_type IN ('Print Daily', 'Magazine', 'Print Weekly', 'Online', 'Radio', 'TV', 'Podcast', 'College', 'Trade')),
  uvm_reach TEXT,
  geography VARCHAR(20) CHECK (geography IN ('Chicago', 'Regional', 'National', 'International')),
  website TEXT,
  festival_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE press_coverage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  headline TEXT NOT NULL,
  break_type VARCHAR(20) CHECK (break_type IN ('Festival Feature', 'Film Article', 'Review', 'Capsule', 'Listing', 'Mention')),
  coverage_date DATE,
  outlet_id UUID REFERENCES outlets(id),
  byline TEXT,
  url TEXT,
  notes TEXT,
  pdf_clip_link TEXT,
  festival_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE press_coverage_films (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coverage_id UUID NOT NULL REFERENCES press_coverage(id) ON DELETE CASCADE,
  film_id UUID NOT NULL,
  film_type VARCHAR(20) NOT NULL CHECK (film_type IN ('feature', 'short', 'shorts_program', 'program')),
  festival_year INTEGER NOT NULL
);

CREATE INDEX idx_outlets_festival_year ON outlets(festival_year);
CREATE INDEX idx_outlets_name ON outlets(name);
CREATE INDEX idx_press_coverage_festival_year ON press_coverage(festival_year);
CREATE INDEX idx_press_coverage_outlet_id ON press_coverage(outlet_id);
CREATE INDEX idx_press_coverage_films_coverage_id ON press_coverage_films(coverage_id);
CREATE INDEX idx_press_coverage_films_film_id ON press_coverage_films(film_id);

