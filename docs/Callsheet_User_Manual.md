# Callsheet User Manual

### Film Festival Management Platform

---

**Version 1.0 | July 2026**

---

## Table of Contents

1. [Getting Started](#1-getting-started)
   - [Logging In](#logging-in)
   - [Setting Your Password](#setting-your-password)
   - [The Dashboard](#the-dashboard)
2. [Navigating the Platform](#2-navigating-the-platform)
   - [The Sidebar](#the-sidebar)
   - [Selecting a Festival Year](#selecting-a-festival-year)
3. [Modules](#3-modules)
   - [Festival at a Glance](#festival-at-a-glance)
   - [Titles & Programs](#titles--programs)
   - [Ticketing Grid](#ticketing-grid)
   - [In Attendance](#in-attendance)
   - [Press Management](#press-management)
   - [Press Screenings](#press-screenings)
   - [Screener Access](#screener-access)
   - [Screener Requests](#screener-requests)
   - [Photo Shoots](#photo-shoots)
   - [Red Carpets](#red-carpets)
   - [Interview Management](#interview-management)
   - [Special Events](#special-events)
   - [Contacts Management](#contacts-management)
   - [Venue Management](#venue-management)
4. [Common Features](#4-common-features)
   - [Searching & Filtering](#searching--filtering)
   - [Sorting](#sorting)
   - [Card Popups](#card-popups)
   - [Importing Data](#importing-data)
   - [Exporting Data](#exporting-data)
5. [Account Settings](#5-account-settings)
6. [Administration](#6-administration-admin-only)
   - [Managing Users](#managing-users)
   - [Setting Permissions](#setting-permissions)
   - [Reports & Archives](#reports--archives)

---

\newpage

## 1. Getting Started

### Logging In

Navigate to the Callsheet login page in your browser. Enter the email address and password provided to you by your administrator.

> **Screenshot:** *Login page with email and password fields*

If you've forgotten your password, click **Forgot Password** to receive a reset link via email.

### Setting Your Password

On your first login, you will be prompted to set a new password. Choose a strong password — the strength indicator will guide you.

> **Screenshot:** *First-time password setup screen with strength indicator*

### The Dashboard

After logging in, you'll land on the **Titles & Programs** module by default. The platform is organized into modules, each handling a different aspect of festival operations. You'll only see modules you have permission to access.

---

\newpage

## 2. Navigating the Platform

### The Sidebar

The sidebar on the left is your main navigation. It displays:

- **Callsheet logo** at the top
- **Festival year selector** — choose which festival edition to work with
- **Module list** — click any module name to navigate to it
- **Admin section** — visible only to administrators
- **Logout** button at the bottom

Each module has an icon for quick visual identification.

> **Screenshot:** *Sidebar showing festival year selector and full module list*

### Selecting a Festival Year

Use the dropdown at the top of the sidebar to switch between festival years. All data throughout the platform is filtered by the selected year. Archived years appear in the dropdown but are read-only.

---

\newpage

## 3. Modules

### Festival at a Glance

Your festival's home base. This module shows key information at a glance:

- **Edition number and festival name** (e.g., "62nd Chicago International Film Festival")
- **Festival dates**
- **Important links** — quick access to external resources (festival website, ticketing platform, etc.)
- **Statistics** — total films, shorts programs, public screenings, and venues

> **Screenshot:** *Festival at a Glance overview showing stats and important links*

The **Festival Settings** tab (admin only) allows editing the festival name, dates, edition number, and managing important links with drag-and-drop reordering.

---

\newpage

### Titles & Programs

The central hub for managing your festival's film lineup. Organized into three tabs:

**Features Tab**

A searchable, sortable table of all feature films. Each row displays the film's title, director, countries, programs, genres, runtime, language, and more.

- Click a **film title** to open its detailed card popup
- Use the **search bar** to find films by title or director
- Use **filters** to narrow by program, genre, or premiere status
- Click **Add Film** to create a new entry

> **Screenshot:** *Features tab showing the film table with search bar and filters*

**Shorts Tab**

Displays short films grouped by shorts program. Works similarly to the Features tab — search, filter, sort, and click titles to view details.

> **Screenshot:** *Shorts tab showing shorts programs with expandable film lists*

**Programs Tab**

Manage non-ticketed festival programs like masterclasses, panel discussions, and special presentations. Add, edit, or export program information.

> **Screenshot:** *Programs tab showing program list*

**Adding or Editing a Film**

Click **Add Film** or click the edit icon on an existing film to open the film form. Fill in the relevant fields — title, director, runtime, language, genre, and technical details — then save.

> **Screenshot:** *Film edit modal with key fields highlighted*

---

\newpage

### Ticketing Grid

A calendar-style board view for managing public screenings. Screenings are organized by date with columns for each venue/theater.

- **Navigate dates** using the date picker or arrow buttons
- **Search** by film title, venue, or notes
- **Configure the view** — choose which venues to display, reorder columns, and set color coding by program
- Click a **film title** to view its card popup
- Click **Add Screening** to schedule a new public screening

> **Screenshot:** *Ticketing Grid showing a day's screenings across multiple venues*

Each screening card shows the film title, time, runtime, and venue/house. Color coding helps distinguish different program categories.

**Setting Up Your View**

Click the **Set View** button to open the configuration panel. Select which venues to include, drag to reorder them, and assign colors to different programs for easy visual identification.

> **Screenshot:** *Set View modal with venue selection and color coding options*

---

\newpage

### In Attendance

Track festival guests from arrival through departure. The main table shows each guest's name, country, guest type, confirmation status, travel arrangements, and check-in status.

- **Search** by name, email, or phone
- **Filter** by guest type (Features, Shorts, Industry, Jury, etc.), confirmation status, or check-in status
- Click **Check In** or **Check Out** to toggle a guest's status
- Click a **guest name** to view their full details

> **Screenshot:** *In Attendance table showing guest list with check-in toggles*

**Adding a Guest**

Click **Add Guest** and fill in their details — name, contact information, guest type, travel dates, flight info, hotel, dietary restrictions, and any special requirements.

> **Screenshot:** *Guest form modal*

**Linking Guests to Films**

Open a guest's details and use the Films section to associate them with one or more festival films.

**Daily Reports**

Click **Daily Report** to generate a Word document (.docx) for a specific date, including:

- Guest arrivals with flight details
- Guest departures
- All guests currently in attendance
- Hotel information

> **Screenshot:** *Daily Report button and date selection*

---

\newpage

### Press Management

A database of journalists and media contacts covering the festival.

Each entry tracks:

- Name, email, phone, and preferred contact method
- Media outlet(s) and outlet type (Print/Online, TV, Radio, Podcast, etc.)
- Social media handles and website
- Rotten Tomatoes accreditation status
- Accreditation level (P, G, S, or Unassigned)
- Credential pickup status

> **Screenshot:** *Press Management table with accreditation and outlet columns*

- **Search** by name, outlet, or email (accent-insensitive)
- **Filter** by accreditation level, outlet type, or credential pickup status
- Click a **journalist's name** to view their full press card popup

---

\newpage

### Press Screenings

Schedule and manage press-only screenings, separate from public ticketed screenings.

Each screening includes the date, time, film, venue/house, assigned staff member, and optional notes.

- **Search** by film title, venue, or staffer
- **Sort** by date, film, venue, or staffer
- Click the **film title** to view its card popup

> **Screenshot:** *Press Screenings table*

---

### Screener Access

Track which films have digital screener links available for press review.

Each film displays its current access status:

| Status | Meaning |
|--------|---------|
| **TBD** | Not yet determined |
| **Cinesend** | Uploaded to the Cinesend platform |
| **Link Available** | Has a direct streaming link (URL and password shown) |
| **Request Link** | Link must be requested from the distributor |
| **No Links** | No digital access available |

- **Search** by film title
- **Filter** by access type
- Update access status and enter streaming URLs/passwords as they become available

> **Screenshot:** *Screener Access showing films with different access statuses*

---

\newpage

### Screener Requests

Track press requests for screener links or screening tickets.

Each request captures the requester's name, outlet, email, the film requested, and the request type (screener link or screening ticket). Requests move through three statuses:

**New** → **Requested** → **Fulfilled**

- **Search** by requester, outlet, or film
- **Filter** by status or request type
- Update status as requests are processed

> **Screenshot:** *Screener Requests table with status filters*

---

### Photo Shoots

Coordinate photo shoots with festival guests and filmmakers.

Each shoot tracks:

- Date, call time, and shoot time
- Associated film(s) and guest subject(s)
- Venue/house and photographer/videographer
- Whether an intro Q&A is included
- Selects received status (Pending / Received)
- Sent to PR status (Pending / Sent)

> **Screenshot:** *Photo Shoots table*

Click film titles or subject names to view their respective card popups. Mark selects as received and track PR delivery.

---

\newpage

### Red Carpets

Manage red carpet events, linking them to films and guest attendees.

Each event includes:

- Date, start time, and guest call time
- Venue/house
- Associated films/programs and guest subjects
- Screening start time
- Links to RSVP form, RSVP responses, and run of show

> **Screenshot:** *Red Carpets table grouped by event*

Click film titles or subject names to view details. Add RSVP and run-of-show URLs for quick team access.

---

### Interview Management

Track and manage press interviews with filmmakers and talent.

The table displays each interview's film, journalist, outlet, subject(s), status, date, time, and location. Interviews move through these statuses:

| Status | Meaning |
|--------|---------|
| **TBD** | Not yet assigned |
| **Pitching** | Being pitched to press |
| **Subject Pending** | Awaiting subject confirmation |
| **Scheduled** | Confirmed and scheduled |
| **Film Team** | Handled by the film's team |
| **Complete** | Interview completed |
| **Declined** | Interview declined |

> **Screenshot:** *Interview Management table with status column*

**Key features:**

- **Inline editing** — click most cells to edit them directly, then press Enter to save
- **Status dropdown** — quickly change status from the table
- **Complete checkbox** — one-click toggle from Scheduled to Complete
- **Linked cards** — toggle "Show Films," "Show Guests," or "Show Journalists" to make names clickable, opening their card popups

> **Screenshot:** *Inline editing a cell in the Interview Management table*

---

\newpage

### Special Events

Manage galas, dinners, panels, receptions, and other special festival events.

Each event captures extensive details including date/time, event type, venue, associated films and guests, catering and beverage information, photography coverage, press access, RSVP tracking, and expected/actual attendance.

**Three view modes:**

- **Grid** — sortable table view
- **Calendar** — visual calendar layout
- **Timeline** — chronological list

> **Screenshot:** *Special Events in calendar view*

Switch between views using the toggle buttons. Filter by event type, venue, press access, or photography coverage.

---

### Contacts Management

Maintain a directory of film representatives, distributors, sales agents, and production companies.

**Two views:**

- **By Contact** — browse all contacts and see their associated films
- **By Film** — browse all films and see their associated contacts

> **Screenshot:** *Contacts Management in "By Contact" view*

Each contact entry includes name, company, email, phone, contact type, and notes. Link contacts to one or more films to keep track of who represents what.

---

\newpage

### Venue Management

Manage festival venues and their theater houses/screens.

Each venue entry includes:

- Venue name, address, and type (Movie Theater, Event Space, etc.)
- Contact information
- **Theater houses** — individual screens or rooms within the venue, each with a name, short code (used in the Ticketing Grid), and seat count

> **Screenshot:** *Venue Management table with houses column*

Click **Add Venue** and fill in the venue details. For movie theaters, add individual theater houses with their names, short codes, and capacities.

> **Screenshot:** *Venue form modal showing theater house configuration*

---

\newpage

## 4. Common Features

These features work consistently across all modules.

### Searching & Filtering

Every module has a **search bar** at the top. Type to search across multiple fields — results filter in real time. Search is accent-insensitive, so searching "Gonzalez" will match "González."

**Filter buttons** appear next to the search bar when a module supports filtering. Click a filter to narrow results by category (e.g., guest type, accreditation level, status). Active filters are visually highlighted.

> **Screenshot:** *Search bar with active filters highlighted*

### Sorting

Click any **column header** to sort by that column. Click again to toggle between ascending and descending order. An arrow indicator (up/down) shows the current sort direction.

### Card Popups

Click on a **film title**, **guest name**, **journalist name**, or **venue name** (when clickable) to open a read-only card popup with full details. Card popups are a quick way to view information without leaving your current module.

> **Screenshot:** *Film card popup showing full film details*

### Importing Data

Most modules support **bulk import** from Excel or CSV files.

1. Click the **Import** button (or download the import template first)
2. Select your file
3. A **field mapping** dialog lets you match your spreadsheet columns to Callsheet fields
4. Review the preview and confirm
5. Records are created in bulk

> **Screenshot:** *Import dialog with field mapping*

**Tip:** Download the import template first to see the expected format and column names.

### Exporting Data

Click the **Export** button in any module to download the current view as an Excel file. Exports respect your active search and filter settings — what you see is what you get.

---

\newpage

## 5. Account Settings

Access your account settings by clicking **Settings** in the sidebar.

From here you can:

- **View your account information** (email, name, role)
- **Change your password** — enter your current password, then your new password with confirmation. The strength indicator helps you choose a secure password.

> **Screenshot:** *Account Settings page with password change form*

---

\newpage

## 6. Administration (Admin Only)

The following sections are only available to users with Admin or Super Admin access.

### Managing Users

Navigate to the **Administration** section in the sidebar to manage user accounts.

The users table shows all accounts with their email, name, role, and access level.

> **Screenshot:** *Admin panel showing user list*

**Adding a User**

1. Click **Add User**
2. Enter their email address (required), name, role, and phone number
3. Click **Save**
4. The new user will receive an email to set their initial password

> **Screenshot:** *Add User form*

**Editing a User**

Click on a user to update their name, role, phone number, or admin status.

**Deleting a User**

Click the delete button next to a user to remove their account. This action cannot be undone.

---

\newpage

### Setting Permissions

Callsheet uses a role-based permission system with three access levels:

| Level | Description |
|-------|-------------|
| **User** | Can only access modules they've been granted permission to |
| **Admin** | Can access all modules and the admin panel |
| **Super Admin** | Full access including user management and festival settings |

**Configuring Module Permissions**

1. In the Administration panel, click on a user
2. Click **Manage Permissions**
3. For each module, toggle:
   - **Read** — the user can view the module
   - **Edit** — the user can add, edit, and delete data in the module
4. Click **Save Permissions**

> **Screenshot:** *Permission management panel with read/edit toggles per module*

A user who has **Edit** permission but not **Read** permission will not be able to access the module. **Read** is required for **Edit** to be useful.

**Modules available for permission assignment:**

- Festival Overview
- Titles & Programs
- Ticketing Grid
- In Attendance
- Press Management
- Press Screenings
- Screener Access
- Screener Requests
- Photo Shoots
- Red Carpets
- Interview Management
- Special Events
- Contacts Management
- Venue Management
- Reports & Archives

---

\newpage

### Reports & Archives

Navigate to **Reports & Archives** to manage festival years.

**Creating a New Festival Year**

1. Click **Create New Festival Year**
2. Enter the year, edition number, festival name, and date range
3. Choose what to copy from the previous year:
   - Venues
   - Contacts
   - Press database
   - Template programs
4. Click **Create**

> **Screenshot:** *New Festival Year creation form with copy options*

The system will set up the new year with the selected data, giving you a head start.

**Archiving a Festival Year**

Once a festival is complete, click **Archive** next to that year. Archived years remain accessible via the year selector in the sidebar but are read-only.

To restore an archived year, click **Unarchive**.

**Exporting Festival Data**

Click **Export** next to any festival year to download a complete Excel workbook containing all data — films, guests, press, venues, screenings, events, interviews, and more.

> **Screenshot:** *Reports & Archives showing festival years with archive/export buttons*

---

\newpage

## Quick Reference

| Task | Where to Go |
|------|-------------|
| Add a film | Titles & Programs → Add Film |
| Schedule a public screening | Ticketing Grid → Add Screening |
| Schedule a press screening | Press Screenings → Add Screening |
| Check in a guest | In Attendance → Click Check In |
| Generate a daily guest report | In Attendance → Daily Report |
| Track a screener link | Screener Access → Update access type |
| Log a press request | Screener Requests → Add Request |
| Schedule an interview | Interview Management → Add Interview |
| Create a special event | Special Events → Add Event |
| Add a venue | Venue Management → Add Venue |
| Add a press contact | Press Management → Add Press |
| Add a film contact | Contacts Management → Add Contact |
| Change your password | Settings → Change Password |
| Add a new user | Administration → Add User |
| Set user permissions | Administration → User → Manage Permissions |
| Start a new festival year | Reports & Archives → Create New Festival Year |
| Export all festival data | Reports & Archives → Export |

---

*Callsheet is developed and maintained by Acacia Consulting Group.*

*For technical support, contact your system administrator.*
