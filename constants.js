const ALHIJRA = {
  BRAND: {
    NAVY: '#163A5F',
    SKY_BLUE: '#8CBFE8',
    GOLD: '#D4AF37',
    WHITE: '#FFFFFF'
  },
  EXTENSION: {
    NAME: 'Alhijra Visa OCR Assistant',
    VERSION: '1.0.0',
    TARGET_DOMAIN: 'visa.visitsaudi.com',
    TARGET_PATTERN: 'https://visa.visitsaudi.com/*'
  }
};

const FIELD_CATEGORIES = {
  DYNAMIC_OCR: 'Dynamic OCR Field',
  DYNAMIC_CUSTOMER: 'Dynamic Customer Field',
  DYNAMIC_TRAVEL: 'Dynamic Travel Field',
  FIXED_DEFAULT: 'Fixed Default Field',
  FILE_UPLOAD: 'File Upload Field',
  IGNORE: 'Ignore Field'
};

const CATEGORY_COLORS = {
  'Dynamic OCR Field': '#D4AF37',
  'Dynamic Customer Field': '#8CBFE8',
  'Dynamic Travel Field': '#163A5F',
  'Fixed Default Field': '#2E7D32',
  'File Upload Field': '#E65100',
  'Ignore Field': '#9E9E9E'
};

const OCR_SOURCES = [
  { id: 'passportNumber', label: 'Passport Number' },
  { id: 'firstName', label: 'First Name' },
  { id: 'middleName', label: 'Middle Name' },
  { id: 'lastName', label: 'Last Name' },
  { id: 'fullName', label: 'Full Name' },
  { id: 'nationality', label: 'Nationality' },
  { id: 'countryCode', label: 'Country Code' },
  { id: 'dateOfBirth', label: 'Date of Birth' },
  { id: 'gender', label: 'Gender' },
  { id: 'passportIssueDate', label: 'Passport Issue Date' },
  { id: 'passportExpiryDate', label: 'Passport Expiry Date' },
  { id: 'placeOfBirth', label: 'Place of Birth' },
  { id: 'passportType', label: 'Passport Type' }
];

const CUSTOMER_SOURCES = [
  { id: 'phoneNumber', label: 'Phone Number' },
  { id: 'email', label: 'Email' },
  { id: 'address', label: 'Address' },
  { id: 'occupation', label: 'Occupation' },
  { id: 'maritalStatus', label: 'Marital Status' },
  { id: 'emergencyContact', label: 'Emergency Contact' },
  { id: 'customerNotes', label: 'Customer Notes' }
];

const TRAVEL_SOURCES = [
  { id: 'arrivalDate', label: 'Arrival Date' },
  { id: 'departureDate', label: 'Departure Date' },
  { id: 'flightNumber', label: 'Flight Number' },
  { id: 'departureCity', label: 'Departure City' },
  { id: 'arrivalCity', label: 'Arrival City' },
  { id: 'hotelName', label: 'Hotel Name' },
  { id: 'hotelAddress', label: 'Hotel Address' },
  { id: 'stayDuration', label: 'Stay Duration' },
  { id: 'packageName', label: 'Package Name' }
];

const FIXED_SOURCES = [
  { id: 'countryOfResidence', label: 'Country of Residence' },
  { id: 'purposeOfVisit', label: 'Purpose of Visit' },
  { id: 'applicationLanguage', label: 'Application Language' },
  { id: 'officeEmail', label: 'Office Email' },
  { id: 'officePhone', label: 'Office Phone' },
  { id: 'agencyName', label: 'Agency Name' },
  { id: 'religion', label: 'Religion' },
  { id: 'preferredContactMethod', label: 'Preferred Contact Method' }
];

const FILE_UPLOAD_SOURCES = [
  { id: 'passportImage', label: 'Passport Image' },
  { id: 'personalPhoto', label: 'Personal Photo' },
  { id: 'hotelBooking', label: 'Hotel Booking' },
  { id: 'flightTicket', label: 'Flight Ticket' },
  { id: 'insuranceDocument', label: 'Insurance Document' },
  { id: 'invitationLetter', label: 'Invitation Letter' },
  { id: 'otherDocument', label: 'Other Document' }
];

const STAFF_MEMBERS = [
  { id: 'staff1', name: 'Staff 1', color: '#163A5F', initials: 'S1' },
  { id: 'staff2', name: 'Staff 2', color: '#8CBFE8', initials: 'S2' },
  { id: 'staff3', name: 'Staff 3', color: '#D4AF37', initials: 'S3' },
  { id: 'staff4', name: 'Staff 4', color: '#2E7D32', initials: 'S4' },
  { id: 'staff5', name: 'Staff 5', color: '#E65100', initials: 'S5' }
];

const AUDIT_EVENT_TYPES = {
  FILL_FIXED: 'fill_fixed',
  FILL_OCR: 'fill_ocr',
  FILL_CUSTOMER: 'fill_customer',
  FILL_TRAVEL: 'fill_travel',
  OCR_RUN: 'ocr_run',
  OCR_CONFIRM: 'ocr_confirm',
  BACKUP: 'backup',
  RESTORE: 'restore',
  STAFF_CHANGE: 'staff_change',
  SETTINGS_CHANGE: 'settings_change'
};

const DEFAULT_PROFILES = [
  { id: 'applicant-personal', name: 'Applicant Personal Information' },
  { id: 'passport-information', name: 'Passport Information' },
  { id: 'travel-information', name: 'Travel Information' },
  { id: 'contact-information', name: 'Contact Information' },
  { id: 'documents-upload', name: 'Documents Upload' },
  { id: 'payment-information', name: 'Payment Information' },
  { id: 'custom', name: 'Custom Profile' }
];

const MESSAGE_TYPES = {
  SCAN_FIELDS: 'SCAN_FIELDS',
  FIELD_SCAN_RESULT: 'FIELD_SCAN_RESULT',
  HIGHLIGHT_FIELD: 'HIGHLIGHT_FIELD',
  GET_PAGE_STATUS: 'GET_PAGE_STATUS',
  PAGE_STATUS_RESULT: 'PAGE_STATUS_RESULT',
  SAVE_MAPPING: 'SAVE_MAPPING',
  LOAD_MAPPING: 'LOAD_MAPPING',
  CLEAR_SCAN: 'CLEAR_SCAN',
  FILL_FIXED_FIELDS: 'FILL_FIXED_FIELDS',
  FILL_DYNAMIC_OCR_FIELDS: 'FILL_DYNAMIC_OCR_FIELDS',
  FILL_DYNAMIC_CUSTOMER_FIELDS: 'FILL_DYNAMIC_CUSTOMER_FIELDS',
  FILL_DYNAMIC_TRAVEL_FIELDS: 'FILL_DYNAMIC_TRAVEL_FIELDS',
  OCR_SAVE_SESSION: 'OCR_SAVE_SESSION',
  OCR_LOAD_SESSION: 'OCR_LOAD_SESSION',
  OCR_CLEAR_SESSION: 'OCR_CLEAR_SESSION'
};

const STORAGE_KEYS = {
  LAST_SCAN: 'alhijra_lastScan',
  MAPPINGS: 'alhijra_mappings',
  PROFILES: 'alhijra_profiles',
  SETTINGS: 'alhijra_settings',
  ACTIVE_PROFILE: 'alhijra_activeProfile',
  OCR_SESSION: 'alhijra_ocr_session',
  LAST_CUSTOMER_FILL: 'alhijra_lastCustomerFill',
  LAST_TRAVEL_FILL: 'alhijra_lastTravelFill',
  LAST_DOCUMENT_REVIEW: 'alhijra_lastDocumentReview',
  AUDIT_LOG: 'alhijra_auditLog',
  STAFF_MEMBERS_KEY: 'alhijra_staffMembers'
};

const DEFAULT_SETTINGS = {
  fieldHighlight: true,
  debugMode: false,
  preferredLanguage: 'en',
  dateFormat: 'YYYY-MM-DD',
  dateFillMode: 'auto',
  autoSaveMapping: true,
  confirmBeforeSave: true,
  confirmBeforeCustomerFill: true,
  confirmBeforeTravelFill: true,
  confirmBeforeDocumentReview: true,
  currentStaffId: 'staff1',
  autoBackupReminder: true,
  backupReminderDays: 7
};

const DATE_FILL_MODES = {
  AUTO: 'auto',
  YYYY_MM_DD: 'yyyy-mm-dd',
  DD_MM_YYYY: 'dd/mm/yyyy',
  MM_DD_YYYY: 'mm/dd/yyyy',
  SKIP: 'skip'
};

const COUNTRY_CODE_MAP = {
  SOM: ['Somalia', 'Somali', 'SOMALIA', 'SOMALI'],
  SAU: ['Saudi Arabia', 'Saudi', 'SAUDI ARABIA', 'SAUDI'],
  ETH: ['Ethiopia', 'Ethiopian', 'ETHIOPIA', 'ETHIOPIAN'],
  KEN: ['Kenya', 'Kenyan', 'KENYA', 'KENYAN'],
  DJI: ['Djibouti', 'Djiboutian', 'DJIBOUTI', 'DJIBOUTIAN'],
  YEM: ['Yemen', 'Yemeni', 'YEMEN', 'YEMENI'],
  USA: ['United States', 'United States of America', 'USA', 'AMERICAN'],
  GBR: ['United Kingdom', 'UK', 'Britain', 'British', 'GBR', 'UNITED KINGDOM'],
  ARE: ['United Arab Emirates', 'UAE', 'Emirates', 'ARE', 'UNITED ARAB EMIRATES'],
  TUR: ['Turkey', 'Turkish', 'TURKEY', 'TURKISH'],
  EGY: ['Egypt', 'Egyptian', 'EGYPT', 'EGYPTIAN'],
  SDN: ['Sudan', 'Sudanese', 'SUDAN', 'SUDANESE'],
  JOR: ['Jordan', 'Jordanian', 'JORDAN', 'JORDANIAN'],
  IRQ: ['Iraq', 'Iraqi', 'IRAQ', 'IRAQI'],
  SYR: ['Syria', 'Syrian', 'SYRIA', 'SYRIAN'],
  LBN: ['Lebanon', 'Lebanese', 'LEBANON', 'LEBANESE'],
  PSE: ['Palestine', 'Palestinian', 'PALESTINE', 'PALESTINIAN'],
  QAT: ['Qatar', 'Qatari', 'QATAR', 'QATARI'],
  KWT: ['Kuwait', 'Kuwaiti', 'KUWAIT', 'KUWAITI'],
  BHR: ['Bahrain', 'Bahraini', 'BAHRAIN', 'BAHRAINI'],
  OMN: ['Oman', 'Omani', 'OMAN', 'OMANI'],
  PAK: ['Pakistan', 'Pakistani', 'PAKISTAN', 'PAKISTANI'],
  IND: ['India', 'Indian', 'INDIA', 'INDIAN'],
  BGD: ['Bangladesh', 'Bangladeshi', 'BANGLADESH', 'BANGLADESHI'],
  PHL: ['Philippines', 'Filipino', 'PHILIPPINES', 'FILIPINO'],
  IDN: ['Indonesia', 'Indonesian', 'INDONESIA', 'INDONESIAN']
};

const PASSPORT_DATA_FIELDS = [
  'passportNumber', 'firstName', 'middleName', 'lastName', 'fullName',
  'nationality', 'countryCode', 'dateOfBirth', 'gender',
  'passportExpiryDate', 'issuingCountry', 'documentType'
];

const FIELD_TAGS = ['INPUT', 'SELECT', 'TEXTAREA'];
const INPUT_TYPES = ['text', 'email', 'tel', 'number', 'date', 'url', 'password', 'checkbox', 'radio', 'file', 'hidden', 'search', 'time', 'datetime-local', 'month', 'week'];
const VISUAL_INPUT_TYPES = ['text', 'email', 'tel', 'number', 'date', 'url', 'password', 'search', 'time', 'datetime-local', 'month', 'week', 'checkbox', 'radio', 'file'];
