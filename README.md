# Alhijra Visa OCR Assistant

**Client:** Alhijra Travel Agency  
**Website:** [www.alhijratravel.so](https://www.alhijratravel.so)  
**Email:** info@alhijratravel.so  
**Version:** 1.0.0 (Phases 1-6)  
**ZIP:** `alhijra-visa-ocr-assistant-v1.0.0.zip` (16.4 MB, 26 files)

## Overview

Alhijra Visa OCR Assistant is a Chrome Extension that helps travel agency staff scan, classify, and map form fields on the Saudi visa website (visa.visitsaudi.com). It is designed as an assistant tool to improve efficiency while maintaining full compliance with website policies.

## Compliance Rules

1. Does NOT bypass CAPTCHA
2. Does NOT automate CAPTCHA solving
3. Does NOT automate payment
4. Does NOT submit visa applications automatically
5. Does NOT create accounts automatically
6. Does NOT scrape data outside visible form fields
7. Does NOT store passport images permanently
8. Does NOT send customer data to external servers
9. Staff must review all extracted data before filling forms
10. Only runs on `https://visa.visitsaudi.com/*`

## Phase 1-6 Features

- **Field Scanner**: Detects all visible form fields (input, select, textarea, checkbox, radio, file)
- **Field Classification**: Auto-suggests categories based on field labels and attributes
- **Field Mapping Profiles**: Create, rename, delete, and duplicate mapping profiles
- **Import/Export**: Export mapping profiles as JSON, import from JSON files
- **Field Highlighting**: Temporarily highlight fields on the target page (tooltip appended to body)
- **Settings**: Configure highlight, debug mode, language, date format, auto-save, confirm
- **Fixed Field Fill (Phase 2)**: Fill only "Fixed Default Field" classified fields with saved default values
- **Fill Review Modal**: Review all fields before filling, see skipped fields
- **Fill Result Report**: Detailed per-field result (filled/failed/skipped) with reasons
- **Framework-safe Value Setting**: Uses native property setters and dispatches input/change/blur events for Angular/React/Vue compatibility
- **Select Matching**: Matches by value first, then by option text fallback
- **Checkbox/Radio Filling**: Supported with proper event dispatching
- **Local OCR Engine (Phase 3)**: Tesseract.js integrated locally for browser-based passport OCR
- **MRZ Detection & Parsing**: Automatic MRZ line detection from OCR text with TD3 passport format parsing
- **Check Digit Validation**: MRZ check digit computation and validation with visual warnings
- **Passport Data Review**: Editable extracted data form with fullName, DOB, expiry, gender, nationality
- **Image Preprocessing**: Grayscale conversion, contrast adjustment, automatic MRZ region cropping
- **Manual Data Entry**: All extracted fields are editable for staff correction
- **Session-Only Storage**: Passport data kept in memory or chrome.storage.session only; cleared on popup close
- **OCR Progress Reporting**: Real-time progress bar with status messages during OCR execution
- **Debug Mode**: Raw OCR text visible in collapsible debug section when debug mode is enabled
- **Dynamic OCR Field Fill (Phase 4)**: Fill "Dynamic OCR Field" classified fields using confirmed passport data after staff review
- **Dynamic Fill Review Modal**: Review matched fields, passport values, and confidence before filling
- **Dynamic Fill Result Report**: Per-field result (filled/failed/skipped) with detailed reasons
- **Country Code Select Matching**: Matches SOM→Somalia, SAU→Saudi Arabia, etc. in dropdowns
- **Date Format Handling**: Automatic date format conversion for date/DOB fields based on settings
- **Date Fill Mode Setting**: Auto, YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, or skip dates
- **Extended Gender Matching**: Male/Female values mapped to M/F in dropdowns
- **Customer Data Entry (Phase 5)**: Manual customer data form (phone, email, address, occupation, marital status, emergency contact, notes)
- **Travel Data Entry (Phase 5)**: Manual travel data form (arrival/departure date, flight, hotel, package)
- **Customer Fill Review Modal**: Review mapped Dynamic Customer Fields before filling from session data
- **Travel Fill Review Modal**: Review mapped Dynamic Travel Fields before filling from session data
- **Document Upload Review (Phase 5)**: Maps File Upload fields from profile, shows status, highlights upload fields
- **Session-Only Memory**: Customer and travel data stored in `window.alhijraSessionData` only; cleared on popup close
- **Metadata-Only Storage**: Fill result counts (filled/failed/skipped) stored in chrome.storage.local; no actual values
- **Customer Fill Settings**: Option to require confirmation before customer field fill
- **Travel Fill Settings**: Option to require confirmation before travel field fill
- **Document Review Settings**: Option to require confirmation before document review
- **Secure Storage**: All data stored locally via chrome.storage.local with error handling
- **Debug Mode**: Enable/disable debug logging in settings
- **Selector Copy**: Copy field selectors to clipboard

### Phase 6 Features

- **Multi-Staff Support**: Staff selector dropdown in the extension header; each fill/OCR action records which staff member performed it
- **Staff Configuration**: 5 predefined staff members with ID, name, color, and initials; staff filter in audit log viewer
- **Full Backup**: Download a single JSON backup containing all profiles, mappings, settings, active profile, staff config, and up to 100 recent audit logs
- **Restore from Backup**: Upload a backup file to restore all data after confirmation prompt
- **Audit Logging**: Every fill (fixed, OCR, customer, travel), OCR run, OCR confirm, backup, restore, and staff change is logged with timestamp
- **Audit Log Viewer**: Logs tab with filterable table (by type and staff member), most-recent-first display, up to 500 entries capped
- **Audit Log Export**: Download audit logs as JSON from the Logs tab
- **Audit Log Clear**: Clear all audit logs with confirmation prompt
- **Privacy-Preserving Logs**: Audit logs store only metadata (counts, timestamps, profile names) — no passport/customer/travel values
- **No New Permissions**: Phase 6 uses existing `storage`, `activeTab`, `scripting` permissions only

## Installation

### 0. Before Installation: Tesseract.js Setup (Phase 3+)

OCR functionality requires Tesseract.js and core files in the `libs/` folder:

**Quick setup (recommended):**
1. Ensure Node.js is installed
2. In a terminal, run: `npm install tesseract.js`
3. Run the included setup script (copies all needed files):
   ```
   npm install tesseract.js
   xcopy node_modules\tesseract.js\dist\tesseract.min.js libs\ /Y
   xcopy node_modules\tesseract.js\dist\worker.min.js libs\ /Y
   xcopy node_modules\tesseract.js-core\tesseract-core.wasm.js libs\ /Y
   xcopy node_modules\tesseract.js-core\tesseract-core.wasm libs\ /Y
   xcopy node_modules\tesseract.js-core\tesseract-core-simd.wasm.js libs\ /Y
   xcopy node_modules\tesseract.js-core\tesseract-core-simd.wasm libs\ /Y
   ```
4. Reload the extension in `chrome://extensions/`

**Required files in `libs/`:**
- `tesseract.min.js` - Main OCR library (from tesseract.js/dist/)
- `worker.min.js` - Web Worker script (from tesseract.js/dist/)
- `tesseract-core.wasm.js` + `.wasm` - Core OCR engine (from tesseract.js-core/)
- `tesseract-core-simd.wasm.js` + `.wasm` - SIMD-optimized core (optional but recommended)

**Lang data (required for OCR to function):**
The extension looks for language data at `libs/lang-data/eng.traineddata`. This file (~22 MB) is now bundled in the ZIP at the correct location. 

If you need to download it separately (e.g., after a fresh `git clone`), run:
```
powershell -ExecutionPolicy Bypass -File libs/download-lang-data.ps1
```
Or download manually from:
- https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata
- Place it in `libs/lang-data/eng.traineddata`

If the lang data is missing, Tesseract.js will attempt to download it. For fully offline operation, the file must be present.

**Privacy note:** Tesseract.js runs entirely in the browser. No image data, OCR text, or passport data is sent to any external server. All processing happens locally inside the Chrome extension popup.

### 1. Load Unpacked Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `alhijra-visa-ocr-assistant` folder
5. The extension icon will appear in the toolbar

### 2. Pin the Extension

1. Click the puzzle piece icon in the toolbar
2. Find "Alhijra Visa OCR Assistant"
3. Click the pin icon

## How to Use

### Field Scanning

1. Navigate to any page on `https://visa.visitsaudi.com/*`
2. Click the extension icon to open the popup
3. Go to the **Scanner** tab
4. Click **Scan Current Page Fields**
5. View detected fields in the table

### Classifying Fields

1. After scanning, go to the **Mapping** tab
2. For each field, select a **Category**:
   - **Dynamic OCR Field**: Data extracted from passport/MRZ
   - **Dynamic Customer Field**: Customer-provided data
   - **Dynamic Travel Field**: Trip-related data
   - **Fixed Default Field**: Pre-set values (enter default value)
   - **File Upload Field**: Document uploads
   - **Ignore Field**: Skip this field
3. Select the appropriate **Data Source**
4. Add **Default Value** (for Fixed fields) or **Staff Notes**

### Managing Profiles

1. Go to the **Profiles** tab
2. Enter a name and click **Create Profile**
3. Select a profile to make it active (highlighted in gold)
4. Use **Save Mapping** / **Load Mapping** to persist field classifications
5. Use **Duplicate** or **Rename** to manage profiles

### Import/Export

1. Go to the **Import/Export** tab
2. Click **Export Mapping JSON** to download current profile
3. Click **Import Mapping JSON** to upload a previously exported file
4. Click **Export Current Scan JSON** to export raw scan data

### Field Highlighting

1. In the **Scanner** tab, click **HL** (Highlight) on any row
2. The field will be outlined in gold with a navy tooltip
3. Tooltip is appended to document.body (not inside the field)
4. Highlight disappears after 3 seconds

### Copy Selector

1. In the **Scanner** tab, click **C** (Copy) on any row
2. The selector text is copied to clipboard

## Staff Management (Phase 6)

### Change Active Staff Member

1. In the extension header, find the **Staff** dropdown next to the domain status badge
2. Select a staff member from the list (Staff 1–5)
3. All subsequent actions (fill, OCR, backup) will be attributed to this staff member in audit logs
4. Staff selection persists across popup opens

## Backup & Restore (Phase 6)

### Create a Full Backup

1. Go to the **Import/Export** tab
2. In the **Full Backup** card, click **Download Backup**
3. A `.json` file with timestamped filename is downloaded (e.g., `alhijra-backup-2026-06-16.json`)
4. The backup includes: all profiles, mappings, settings, active profile, staff config, and up to 100 recent audit logs

### Restore from Backup

1. Go to the **Import/Export** tab
2. In the **Restore from Backup** card, click **Restore from Backup**
3. Select a previously downloaded backup `.json` file
4. A confirmation prompt warns: "This will replace all current data. Continue?"
5. On confirm, all profiles, mappings, settings, staff, and audit logs are restored
6. Success message shows counts of restored entities
7. The popup refreshes with restored data

### Privacy Note
Backup files contain staff configuration but do NOT contain passport numbers, customer data, travel data, or document content. Only field metadata and configurations are backed up.

## Audit Logs (Phase 6)

### View Audit Logs

1. Click the **Logs** tab in the navigation bar
2. All logged events appear in a table, most recent first
3. Each entry shows: Timestamp, Staff Name, Event Type, Profile Name, Fields Filled/Failed/Skipped

### Filter Audit Logs

1. Use the **Type** dropdown to filter by event type (Fixed Fill, OCR Fill, Customer Fill, Travel Fill, OCR Run, OCR Confirm, Backup, Restore, Staff Change)
2. Use the **Staff** dropdown to filter by staff member
3. Click **Filter** to apply selections

### Export Audit Logs

1. Click **Export JSON** in the Logs tab
2. All logs (up to 500) are downloaded as a timestamped `.json` file

### Clear Audit Logs

1. Click **Clear All** in the Logs tab
2. Confirm the prompt — all logs are permanently removed

### What Is Logged
- **Fixed Fill**: profile, field counts
- **OCR Fill**: profile, field counts
- **Customer Fill**: profile, field counts
- **Travel Fill**: profile, field counts
- **OCR Run**: field count, success/failure status
- **OCR Confirm**: field count, missing fields (if any)
- **Backup**: profile and mapping counts
- **Restore**: restored profile, mapping, and log counts
- **Staff Change**: previous and new staff ID

### What Is NOT Logged
- Passport numbers, MRZ data, names, dates of birth
- Customer phone numbers, emails, addresses
- Travel dates, flight numbers, hotel names
- Any form field values

## Passport OCR (Phase 3)

### Upload Passport Image

1. Go to the **Passport OCR** tab
2. Drag & drop a passport image onto the upload area, or click **Browse File**
3. Supported formats: JPG, JPEG, PNG, WEBP
4. Maximum file size: 10 MB
5. Image preview will appear after upload

### Run OCR

1. Click **Run OCR**
2. Progress is shown:
   - Loading OCR engine (10-50%)
   - Recognizing text on full image (60%)
   - Analyzing MRZ region (75%)
   - Extracting MRZ data (85-95%)
   - Complete (100%)
3. Extracted data populates the review form automatically
4. MRZ lines and check digit validation status are shown
5. If debug mode is enabled in Settings, raw OCR text is shown in a collapsible section

### Review & Correct Data

1. All extracted fields are editable:
   - Passport Number
   - First Name, Middle Name, Last Name, Full Name
   - Nationality, Country Code
   - Date of Birth, Gender
   - Passport Expiry Date, Issuing Country, Document Type
2. Correct any OCR errors manually
3. Check digit validation shows status:
   - **Valid** (green): All check digits match
   - **Warning** (yellow): Some check digits mismatch (review data carefully)
4. MRZ lines are displayed for reference

### Confirm Passport Data

1. Click **Confirm Passport Data**
2. Data is saved temporarily for the current session only
3. Confirmation message: "Passport data confirmed for this session only. Data cleared when popup closes."
4. If required fields are missing (Passport Number, Name, Date of Birth), confirmation shows a warning

### Clear Passport Data

1. Click **Clear Passport Data**
2. Image preview, OCR text, extracted fields, and session data are all cleared
3. The upload area is shown again for a new scan

### Copy Data JSON

1. Click **Copy Data JSON** to copy all extracted passport data as formatted JSON to clipboard
2. Includes MRZ lines, check digit status, and OCR confidence

### Stop OCR

1. Click **Stop** if OCR is taking too long or the wrong image was uploaded
2. The engine is stopped and controls return to ready state

## Dynamic OCR Field Fill (Phase 4)

### Prerequisites
1. Passport OCR data must be confirmed (see Passport OCR section)
2. Website fields must be scanned and classified as "Dynamic OCR Field"
3. Each Dynamic OCR Field must have a data source mapped (e.g., passportNumber, firstName)
4. The mapping must be saved to a profile

### Fill Dynamic OCR Fields

1. Complete Passport OCR workflow and click **Confirm Passport Data**
2. The **Fill Dynamic OCR Fields** button becomes enabled (in Dashboard, Mapping, and Passport OCR tabs)
3. Click **Fill Dynamic OCR Fields**
4. Review modal shows:
   - Profile name
   - Total fields to fill
   - Fields skipped due to missing data
   - Table with: Website Field Label, OCR Source, Passport Value, Selector Confidence, Status
5. Fields with confidence < 50 show a "Verify" badge
6. Fields without matching passport data are shown as skipped
7. Click **Confirm Fill Dynamic Fields** to proceed
8. Result modal shows filled/failed/skipped counts with per-row details

### Safety Rules
- Only "Dynamic OCR Field" classified fields are filled
- Only fields with matching passport data are filled
- Disabled, hidden, read-only, file, password, and button fields are skipped
- Selectors with confidence < 50 are skipped with "manual verification required"
- No form is submitted automatically
- No CAPTCHA is touched
- No payment fields are filled
- Passport data is not stored permanently

### Select Matching
- For select (dropdown) fields, the system tries:
  1. Exact value match
  2. Normalized option text match
  3. Country code lookup (e.g., SOM → Somalia/Somali in dropdown)
- Gender values are matched as Male/Female
- Country codes are expanded using the built-in COUNTRY_CODE_MAP

### Date Handling
- Passport dates (DOB, expiry) are stored as YYYY-MM-DD
- For `type="date"` inputs, YYYY-MM-DD is used directly
- For text inputs, the configured **Date Fill Mode** setting is applied:
  - Auto (detect)
  - YYYY-MM-DD
  - DD/MM/YYYY
  - MM/DD/YYYY
  - Skip dates (dates are not filled)

## Testing Checklist

### Installation
- [ ] Extension loads in chrome://extensions without errors
- [ ] Icon appears in toolbar after loading

### Domain Restriction
- [ ] On https://visa.visitsaudi.com/*: status shows "Valid Domain" (green)
- [ ] On any other site: status shows "Invalid Domain" (red)

### Field Scanning
- [ ] Navigate to a page with visa form fields
- [ ] Click Scan Current Page Fields
- [ ] Fields appear in the scanner table with correct labels
- [ ] Field types are correctly identified (input:text, select-one, etc.)
- [ ] Required fields show checkmark
- [ ] Hidden fields are detected but marked hidden

### Field Highlighting
- [ ] Click HL button on a field row
- [ ] Field scrolls into view on the target page
- [ ] Gold outline appears (3px solid #D4AF37)
- [ ] Tooltip shows above the field (appended to body)
- [ ] Highlight disappears after 3 seconds

### Classification
- [ ] Auto-classification suggests category and source based on labels
- [ ] Staff can override category via dropdown
- [ ] Data source dropdown updates when category changes
- [ ] Default value field accepts text input

### Mapping Profiles
- [ ] Default profiles are created on first load (7 profiles)
- [ ] New profiles can be created
- [ ] Profiles can be renamed (prompt dialog)
- [ ] Profiles can be duplicated (copies mapping too)
- [ ] Profiles can be deleted (last profile cannot be deleted)
- [ ] Active profile is highlighted in gold

### Save/Load Mapping
- [ ] Save Mapping persists current field classifications
- [ ] Close and reopen popup
- [ ] Load Mapping restores saved classifications
- [ ] Mapping progress shows correct count

### Export/Import
- [ ] Export produces valid JSON with extension metadata
- [ ] Import accepts valid exported JSON
- [ ] Invalid JSON shows friendly error message
- [ ] Imported profile appears in profiles list

### Settings
- [ ] Toggle Field Highlight (Yes/No)
- [ ] Toggle Debug Mode (Yes/No)
- [ ] Language selection (English/Arabic)
- [ ] Date format selection
- [ ] Toggle Auto-save
- [ ] Toggle Confirm before save
- [ ] Settings persist after reopening popup

### Clear Operations
- [ ] Clear Scan removes fields from display
- [ ] Clear All Mappings resets all field categories
- [ ] Clear All Local Data removes everything and recreates defaults

### Fixed Field Fill (Phase 2)
- [ ] Scan fields on a page with form fields
- [ ] Map some fields as "Fixed Default Field" and enter default values
- [ ] Map some fields as other categories (OCR, Customer, Travel)
- [ ] Save mapping to profile
- [ ] Click **Fill Fixed Fields** from Dashboard or Mapping tab
- [ ] Review modal appears with profile name, field count, table
- [ ] Fields with confidence < 50 show "Verify" badge
- [ ] Fields without default values show as "Skipped"
- [ ] Click **Confirm Fill** to proceed
- [ ] Result modal shows filled/failed/skipped counts
- [ ] Only Fixed Default Fields were filled on the page
- [ ] Dynamic OCR/Customer/Travel fields were NOT filled
- [ ] File upload fields were NOT filled
- [ ] Disabled/readonly/hidden fields were NOT filled
- [ ] Select fields with matching values were filled
- [ ] Checkbox fields were checked/unchecked correctly
- [ ] No submit, payment, or CAPTCHA action occurred
- [ ] No form was submitted automatically

### Customer / Travel Data Entry (Phase 5)

#### Prerequisites
1. Website fields must be scanned and classified as "Dynamic Customer Field" or "Dynamic Travel Field"
2. Data sources must be mapped (e.g., phoneNumber, email, arrivalDate, flightNumber)
3. Mapping must be saved to a profile

#### Customer Data Workflow

1. Open **Customer Data** tab
2. Enter customer information:
   - Phone Number, Email, Address, Occupation
   - Marital Status (Single/Married/Divorced/Widowed)
   - Emergency Contact, Customer Notes
3. Click **Save Customer Data for Session**
4. A green banner confirms data is saved
5. **Fill Customer Fields** button becomes enabled
6. Click **Fill Customer Fields**
7. Review modal shows:
   - Profile name
   - Dynamic Customer Fields found with matching data
   - Fields skipped due to missing data
8. Click **Confirm Fill Customer Fields**
9. Result modal shows filled/failed/skipped counts
10. Only "Dynamic Customer Field" classified fields are filled
11. Disabled/hidden/readonly/password/file fields are skipped
12. No form is submitted automatically

#### Travel Data Workflow

1. Open **Travel Data** tab
2. Enter travel information:
   - Arrival Date, Departure Date (HTML date inputs)
   - Flight Number, Departure City, Arrival City
   - Hotel Name, Hotel Address, Stay Duration, Package Name
3. Click **Save Travel Data for Session**
4. Green banner confirms data is saved
5. **Fill Travel Fields** button becomes enabled
6. Click **Fill Travel Fields**
7. Review modal shows matching fields
8. Click **Confirm Fill Travel Fields**
9. Result modal shows filled/failed/skipped counts
10. Dates are formatted per Date Fill Mode setting

#### Document Upload Review (Phase 5)

1. Open **Documents** tab
2. System loads File Upload fields from active profile
3. Review table shows:
   - Field label and document type source
   - Selector string
   - Whether the upload field is found on the page (Found/Not Found)
   - Confidence and accepted file types
4. Click **Highlight Upload Fields** to visually locate upload fields on the visa page
5. Staff must manually upload files to the website — no auto-upload in Phase 5

### Customer Data Fill (Phase 5)
- [ ] Open Customer Data tab
- [ ] Enter sample customer data (phone, email, address, etc.)
- [ ] Click Save Customer Data for Session - green banner appears
- [ ] Fill Customer Fields button becomes enabled
- [ ] Click Fill Customer Fields
- [ ] Review modal shows profile name, fields to fill, skipped fields
- [ ] Confirm fill
- [ ] Result modal shows filled/failed/skipped counts
- [ ] Only Dynamic Customer Field classified fields are filled on the page
- [ ] Disabled/readonly/hidden fields are NOT filled
- [ ] Clear customer data - banner disappears, button disabled
- [ ] No form is submitted automatically

### Travel Data Fill (Phase 5)
- [ ] Open Travel Data tab
- [ ] Enter sample travel data (arrival, departure, flight, hotel)
- [ ] Click Save Travel Data for Session - green banner appears
- [ ] Fill Travel Fields button becomes enabled
- [ ] Click Fill Travel Fields
- [ ] Review modal shows profile name, fields to fill, skipped fields
- [ ] Confirm fill
- [ ] Result modal shows filled/failed/skipped counts
- [ ] Only Dynamic Travel Field classified fields are filled
- [ ] Dates are formatted correctly per Date Fill Mode settings
- [ ] Clear travel data - banner disappears, button disabled

### Document Review (Phase 5)
- [ ] Open Documents tab
- [ ] File Upload fields from active profile are listed
- [ ] Each field shows Found on page or Not found status
- [ ] Click Highlight Upload Fields
- [ ] Upload fields on the website are highlighted
- [ ] No auto-upload occurs
- [ ] No form submission occurs

### Staff Management (Phase 6)
- [ ] Staff dropdown is visible in header next to domain status
- [ ] Select a different staff member from dropdown
- [ ] Staff selection persists after reopening popup

### Backup & Restore (Phase 6)
- [ ] Go to Import/Export tab, click **Download Backup**
- [ ] A `.json` file is downloaded with correct structure
- [ ] Backup JSON contains: profiles, mappings, settings, activeProfileId, staffMembers, auditLogs, backupType
- [ ] Click **Restore from Backup**, select the downloaded file
- [ ] Confirmation prompt appears before restore
- [ ] After confirm, all data is restored
- [ ] Profiles, mappings, settings match the backup
- [ ] Staff selection and logs are restored

### Audit Log Viewer (Phase 6)
- [ ] Logs tab is visible in navigation
- [ ] Open Logs tab — shows table with most-recent-first order
- [ ] Each row shows: Timestamp, Staff, Type, Profile, Filled/Failed/Skipped
- [ ] Type filter dropdown lists all event types
- [ ] Staff filter dropdown lists all staff members
- [ ] Apply filters — table updates accordingly
- [ ] Click **Refresh** — logs reload
- [ ] Click **Export JSON** — `.json` file is downloaded
- [ ] Click **Clear All** — confirmation prompt, then logs cleared
- [ ] Table shows "No logs match the current filters" when empty

### Audit Logging Integration (Phase 6)
- [ ] Perform a Fixed Fill — log entry appears: type "Fixed Fill"
- [ ] Perform an OCR Fill — log entry appears: type "OCR Fill"
- [ ] Perform a Customer Fill — log entry appears: type "Customer Fill"
- [ ] Perform a Travel Fill — log entry appears: type "Travel Fill"
- [ ] Run OCR — log entry appears: type "OCR Run"
- [ ] Confirm OCR data — log entry appears: type "OCR Confirm"
- [ ] Create backup — log entry appears: type "Backup"
- [ ] Restore from backup — log entry appears: type "Restore"
- [ ] Change staff member — log entry appears: type "Staff Change"
- [ ] Log entries show correct counts (filled/failed/skipped)
- [ ] No passport/customer/travel values appear in log entries

### Dynamic OCR Field Fill (Phase 4)
- [ ] Scan and map fields on visa page as "Dynamic OCR Field"
- [ ] Assign data sources (passportNumber, firstName, nationality, etc.) to mapped fields
- [ ] Save mapping to profile
- [ ] Upload passport image and run OCR in Passport OCR tab
- [ ] Review and confirm passport data
- [ ] Fill Dynamic OCR Fields button becomes enabled
- [ ] Click Fill Dynamic OCR Fields from Dashboard, Mapping, or Passport OCR tab
- [ ] Review modal shows profile name and field details
- [ ] Fields with matching passport data show passport values
- [ ] Fields with confidence < 50 show "Verify" badge
- [ ] Fields without matching data show as "Skipped"
- [ ] Click Confirm Fill Dynamic Fields
- [ ] Result modal shows filled/failed/skipped counts
- [ ] Only Dynamic OCR Field classified fields are filled on the page
- [ ] Fixed Default fields are NOT affected by this fill
- [ ] Dynamic Customer/Travel fields are NOT filled
- [ ] File upload fields are NOT filled
- [ ] Disabled/readonly/hidden fields are NOT filled
- [ ] Password fields are NOT filled
- [ ] Dropdown fields match values correctly (including country codes)
- [ ] Date fields are formatted per settings
- [ ] Gender fields match Male/Female correctly
- [ ] No form is submitted automatically
- [ ] No CAPTCHA is bypassed
- [ ] No payment automation occurs
- [ ] Fill Dynamic OCR Fields button is disabled after passport data is cleared

### Passport OCR (Phase 3)
- [ ] Passport OCR tab is visible and clickable in navigation
- [ ] Upload area accepts drag & drop
- [ ] Browse File opens file picker
- [ ] JPG, PNG, WEBP files are accepted
- [ ] Files over 10 MB show a friendly error
- [ ] Unsupported file types show a friendly error
- [ ] Image preview appears after upload
- [ ] Clear Image button removes preview and returns to upload area
- [ ] Run OCR button is enabled after image is loaded
- [ ] OCR progress bar updates during processing
- [ ] Progress status text shows meaningful messages
- [ ] MRZ lines are detected from passport image
- [ ] Passport Number is extracted correctly
- [ ] First Name, Middle Name, Last Name are parsed from MRZ
- [ ] Full Name is constructed correctly
- [ ] Nationality code is extracted
- [ ] Date of Birth is converted to YYYY-MM-DD
- [ ] Gender is converted to Male/Female/Unspecified
- [ ] Passport Expiry Date is converted to YYYY-MM-DD
- [ ] Check digit validation shows Valid (green) for correct data
- [ ] Check digit validation shows Warning (yellow) for mismatches
- [ ] All extracted fields are editable
- [ ] Staff can correct OCR errors manually
- [ ] Confirm Passport Data stores data for session only
- [ ] Clear Passport Data removes all extracted data
- [ ] Copy Data JSON copies formatted JSON to clipboard
- [ ] Stop button interrupts OCR processing
- [ ] Debug section shows raw OCR text when Debug Mode is ON
- [ ] Debug section is hidden when Debug Mode is OFF
- [ ] No form fields are filled on the website during Phase 3
- [ ] No data is sent to external servers
- [ ] No passport image is stored permanently
- [ ] Closing and reopening popup clears sensitive data

### Security
- [ ] Extension does not work outside https://visa.visitsaudi.com/*
- [ ] No external network requests made
- [ ] No passport images stored
- [ ] No customer data sent to external servers
- [ ] No filled customer data stored in extension
- [ ] All storage is local (chrome.storage.local)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Could not connect to page" | Refresh the target page and try again |
| "Not on visa.visitsaudi.com" | Navigate to the Saudi visa website |
| No fields detected | Ensure the page has loaded completely |
| Import fails with error | Verify the JSON file is valid Alhijra mapping format |
| Extension not working | Reload the extension in chrome://extensions |
| Highlight not working | Refresh the page and ensure extension is active |
| Mapping not saved | Select a profile first, then save |
| "Tesseract.js not loaded" | Download tesseract.min.js from node_modules and place in libs/ |
| "MRZ not detected" | Upload a clearer passport image; ensure MRZ lines are visible |
| Wrong dates extracted | Manually correct in the editable fields |
| Incorrect names | Names are parsed from MRZ; fix common OCR misreads manually |
| Low OCR confidence | Use a higher resolution image; ensure good lighting and focus |
| OCR engine fails to load | Check that tesseract.min.js is valid and not corrupted |
| Popup lags during OCR | Use a smaller image; very large images may slow down processing |

## Project Structure

```
alhijra-visa-ocr-assistant/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── fieldScanner.js
├── selectorUtils.js
├── classifier.js
├── formFiller.js
├── mrzParser.js          (Phase 3 - MRZ detection & parsing)
├── ocrEngine.js           (Phase 3 - OCR orchestration)
├── storage.js             (Phase 6 - backup/restore, audit log CRUD, staff CRUD)
├── constants.js           (Phase 6 - STAFF_MEMBERS, AUDIT_EVENT_TYPES, new STORAGE_KEYS/DEFAULT_SETTINGS)
├── utils.js
├── download-lang-data.ps1   (script in libs/ to download eng.traineddata)
├── libs/
│   ├── tesseract.min.js          (Phase 3 - Tesseract.js browser bundle)
│   ├── worker.min.js              (Phase 3 - Tesseract.js web worker)
│   ├── tesseract-core.wasm.js     (Phase 3 - Core OCR engine)
│   ├── tesseract-core.wasm        (Phase 3 - Core WASM binary)
│   ├── tesseract-core-simd.wasm.js (Phase 3 - SIMD core)
│   ├── tesseract-core-simd.wasm   (Phase 3 - SIMD WASM binary)
│   └── lang-data/
│       └── eng.traineddata        (Phase 3 - English language data)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Known Limitations (Phases 1-6)

- Dynamic Customer/Travel field auto-fill is NOT implemented (future phases)
- Does not support iframe fields
- Does not support shadow DOM fields
- Radio button groups are grouped but individual radio labels shown in details modal only
- Selectors with confidence < 50 are not auto-filled and require manual verification
- File upload fields cannot be auto-filled
- Fill only works on the current page — does not navigate through multi-page forms
- Tesseract.js requires manual setup of core files and language data (see Installation section)
- MRZ parsing supports TD3 (passport) format only; does not support TD1 (ID card) or TD2 formats
- OCR requires a clear passport image; poor quality images may fail MRZ detection
- OCR runs in the popup context; large images may cause popup to lag
- Passport data exists only in memory; closing popup clears all sensitive data (by design)
- MRZ check digit validation is advisory only; staff can still confirm data with warnings
- Dynamic OCR Field fill requires passport data to be confirmed first; auto-fill without confirmation is not possible
- Country code dropdown matching relies on the built-in COUNTRY_CODE_MAP which may not cover all edge cases
- Customer/Travel data exists in memory only; closing popup clears all data (by design)
- Document uploads are NOT automated; staff must upload files manually to highlighted fields
- Phase 5 does NOT support file attachment automation; only review and highlight
- Audit logs are capped at 500 entries; older entries are automatically removed
- Multi-staff support is local only — no server sync or shared staff list across devices
- Backup restores all data including audit logs; restoring a backup overwrites current logs
- Staff list is predefined (5 staff members) — custom staff names not supported in this version

## Next Phase Plan

### Phase 7: UI Polish & Performance
- Dashboard analytics overview
- Advanced reporting
- Performance optimizations for large profiles
- Keyboard shortcuts
- Enhanced date handling improvements

## License

This extension is developed exclusively for Alhijra Travel Agency. Internal use only.
