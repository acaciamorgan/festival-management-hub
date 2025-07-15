# 🚨 CLAUDE IS ABSOLUTELY FORBIDDEN FROM CREATING MOCK DATA 🚨

## STRICT PROHIBITION - NO EXCEPTIONS
**CLAUDE MUST NEVER CREATE, MODIFY, OR ADD ANY MOCK DATA**
**CLAUDE MUST NEVER TOUCH MOCK DATA ARRAYS**
**CLAUDE MUST NEVER ADD NEW PEOPLE, FILMS, VENUES, OR IDs**
**ONLY THE HUMAN USER CAN CREATE MOCK DATA**

## IF MOCK DATA IS NEEDED:
1. CLAUDE MUST STOP AND ASK THE HUMAN TO CREATE IT
2. CLAUDE CANNOT PROCEED WITHOUT HUMAN-CREATED DATA
3. CLAUDE CAN ONLY USE EXISTING DATA THAT HUMAN ALREADY CREATED

## DATA INTEGRITY RULES - NEVER VIOLATE THESE

## Mock Data Requirements
- **FILMS**: Only reference films that exist in DataContext films array
- **PEOPLE/GUESTS/TALENT**: Only reference people who exist in DataContext people array (Travel module is source of truth)
- **JOURNALISTS/PRESS**: Only reference journalists who exist in DataContext people array (Press Management module is source of truth)
- **VENUES**: Only reference venues that exist in DataContext venues array
- **STAFF**: Only reference staff who exist in DataContext staff array

## Mock Data Process
1. FIRST check existing data in DataContext
2. ONLY create mock events/bookings/etc using existing IDs
3. NEVER invent new people, films, venues, or press in mock data
4. If more data is needed, ASK HUMAN TO ADD it to DataContext first, then reference it

## System Architecture
- **Title Management** → Controls all films
- **Travel Module** → Controls all people/guests/talent (ONLY source of truth)
- **Press Management** → Controls all journalists/press (ONLY source of truth)
- **Venue Management** → Controls all venues
- **All other modules** → Reference these systems by ID only

## Manual Entry Exception
- **HUMAN USERS** may create one-off entries (journalists, venues, staff) that don't have cards
- Examples: Manual RSVP for journalist only interested in one screening
- **CLAUDE IS NEVER ALLOWED** to invent these entries - ONLY HUMAN USERS can create manual entries
- Claude must only reference existing card data or provide UI for humans to create manual entries

## Violation Consequences
Breaking these rules destroys data integrity and renders the entire system useless.

## Safeguards Implemented
1. **Data Validation Utility** (`src/utils/dataValidation.ts`):
   - `validatePersonName()` - Checks if person exists in DataContext
   - `validateFilmTitle()` - Checks if film exists in DataContext
   - `validateVenueName()` - Checks if venue exists in DataContext
   - `validatePeopleList()` - Validates comma-separated people names
   - `validateMockData()` - Development-only validation that throws errors for violations

2. **Mock Data Validation**: All modules with mock data MUST call `validateMockData()` in development

3. **Before Adding Any Mock Data**:
   - Use `getValidPersonNames()` to see available people
   - Use `getValidFilmTitles()` to see available films
   - Use `getValidVenueNames()` to see available venues
   - NEVER guess or invent names - always verify first

## Emergency Protocol
If you catch yourself about to add mock data:
1. STOP immediately
2. Check DataContext for existing entities
3. Use validation utilities
4. Only proceed with verified existing entities