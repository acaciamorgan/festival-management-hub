# Data Migration Punch List

## Fixed Issues (Deployed)

### Press Screenings Module
- [x] Title column doesn't sort - FIXED
- [x] Date sort should automatically sub-sort by time - FIXED

### Press Requests Module
- [x] View updated to use press_requests_with_films
- [ ] ⚠️ OLD DATA LOST - film associations for existing requests are gone (migration issue)
- [ ] New requests will work correctly going forward

### Interview Management Module
- [x] EVERYTHING IS GONE - FIXED (now using interviews_with_films view)

## Remaining Issues

### Screener Access Module
- [ ] Sort functions disappeared (only Title sorts now)
- [ ] Access Type column should be sortable

### Ticketing Module
- [ ] Sorting doesn't work for any column
- [ ] Film titles should be clickable and open the film card

### To Test - All Modules
- [ ] Press Screenings - verify titles and runtimes display
- [ ] Ticketing (Published Screenings) - verify titles and runtimes display
- [ ] Ticketing (P&I/Jury) - verify titles and runtimes display
- [ ] Ticketing (Tech Checks) - verify titles and runtimes display
- [ ] In Attendance - verify guests only show at correct screenings (deploying fix)
- [ ] Interviews - verify titles display correctly
- [ ] Photo Shoots - verify film/program references work
- [ ] Red Carpets - verify film/program references work
- [ ] Guest Cards - verify film associations display
- [ ] Press Requests - verify film titles display

## Core Functionality to Test
- [ ] Update a film title in Film Cards → verify it updates everywhere
- [ ] Update a film runtime in Film Cards → verify it updates everywhere
- [ ] Add new screening with film selection → verify dropdown works
- [ ] Add new interview with film selection → verify dropdown works

## Items Fixed
- [x] Database migration completed (removed duplicated data)
- [x] Standardized database views created
- [x] Press Screenings updated to use film_title and run_time
- [x] Ticketing updated to use views
- [x] In Attendance updated to use views (deployed, awaiting verification)

---

**Instructions:**
Please test each module above and report:
1. What's broken
2. What specific fields aren't showing
3. Any error messages you see

Then I'll fix everything systematically in one go.
