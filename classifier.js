function autoClassifyField(label, name, id, placeholder, nearbyText, tag, type) {
  const textToSearch = [label, name, id, placeholder, nearbyText]
    .filter(t => t)
    .join(' ')
    .toLowerCase()
    .trim();

  const checks = [
    { keywords: ['passport number', 'document number', 'passport no', 'passport#', 'passportid'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'passportNumber', score: 95 },
    { keywords: ['given name', 'first name', 'forename', 'firstname', 'givenname'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'firstName', score: 95 },
    { keywords: ['middle name', 'middlename', 'middle'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'middleName', score: 90 },
    { keywords: ['surname', 'last name', 'family name', 'lastname', 'familyname'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'lastName', score: 95 },
    { keywords: ['full name', 'fullname', 'complete name'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'fullName', score: 90 },
    { keywords: ['nationality', 'citizenship', 'national'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'nationality', score: 90 },
    { keywords: ['country code', 'countrycode'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'countryCode', score: 85 },
    { keywords: ['date of birth', 'birth date', 'dob', 'birthdate', 'dateofbirth'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'dateOfBirth', score: 95 },
    { keywords: ['gender', 'sex'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'gender', score: 90 },
    { keywords: ['issue date', 'date of issue', 'passport issue', 'issued date', 'issuance'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'passportIssueDate', score: 90 },
    { keywords: ['expiry date', 'expiration date', 'passport expiry', 'expiry', 'expiration', 'expire'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'passportExpiryDate', score: 90 },
    { keywords: ['place of birth', 'birth place', 'placeofbirth', 'pob'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'placeOfBirth', score: 85 },
    { keywords: ['passport type', 'passporttype', 'document type'], category: FIELD_CATEGORIES.DYNAMIC_OCR, source: 'passportType', score: 80 },
    { keywords: ['email', 'e-mail', 'electronic mail'], category: FIELD_CATEGORIES.DYNAMIC_CUSTOMER, source: 'email', score: 95 },
    { keywords: ['phone', 'mobile', 'contact number', 'telephone', 'tel', 'phone number'], category: FIELD_CATEGORIES.DYNAMIC_CUSTOMER, source: 'phoneNumber', score: 95 },
    { keywords: ['address', 'residential address'], category: FIELD_CATEGORIES.DYNAMIC_CUSTOMER, source: 'address', score: 85 },
    { keywords: ['occupation', 'job', 'profession', 'employment'], category: FIELD_CATEGORIES.DYNAMIC_CUSTOMER, source: 'occupation', score: 80 },
    { keywords: ['marital status', 'maritalstatus'], category: FIELD_CATEGORIES.DYNAMIC_CUSTOMER, source: 'maritalStatus', score: 85 },
    { keywords: ['emergency contact', 'emergencycontact', 'emergency'], category: FIELD_CATEGORIES.DYNAMIC_CUSTOMER, source: 'emergencyContact', score: 80 },
    { keywords: ['customer notes', 'notes', 'additional notes', 'special notes'], category: FIELD_CATEGORIES.DYNAMIC_CUSTOMER, source: 'customerNotes', score: 70 },
    { keywords: ['arrival date', 'arrivaldate', 'date of arrival', 'arrival'], category: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'arrivalDate', score: 90 },
    { keywords: ['departure date', 'departuredate', 'date of departure', 'departure'], category: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'departureDate', score: 90 },
    { keywords: ['flight number', 'flightno', 'flight no', 'flight#'], category: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'flightNumber', score: 85 },
    { keywords: ['departure city', 'departurecity', 'from city'], category: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'departureCity', score: 80 },
    { keywords: ['arrival city', 'arrivalcity', 'destination city', 'to city'], category: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'arrivalCity', score: 80 },
    { keywords: ['hotel name', 'hotelname', 'hotel'], category: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'hotelName', score: 85 },
    { keywords: ['hotel address', 'hoteladdress'], category: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'hotelAddress', score: 80 },
    { keywords: ['stay duration', 'duration of stay', 'stayduration', 'length of stay'], category: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'stayDuration', score: 80 },
    { keywords: ['package name', 'packagename', 'package'], category: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'packageName', score: 70 },
    { keywords: ['purpose of visit', 'visit purpose', 'purpose', 'travel purpose'], category: FIELD_CATEGORIES.FIXED_DEFAULT, source: 'purposeOfVisit', score: 90 },
    { keywords: ['country of residence', 'residence country', 'residence', 'country of residency'], category: FIELD_CATEGORIES.FIXED_DEFAULT, source: 'countryOfResidence', score: 90 },
    { keywords: ['application language', 'language', 'preferred language'], category: FIELD_CATEGORIES.FIXED_DEFAULT, source: 'applicationLanguage', score: 80 },
    { keywords: ['office email', 'officeemail', 'agency email'], category: FIELD_CATEGORIES.FIXED_DEFAULT, source: 'officeEmail', score: 75 },
    { keywords: ['office phone', 'officephone', 'agency phone', 'office telephone'], category: FIELD_CATEGORIES.FIXED_DEFAULT, source: 'officePhone', score: 75 },
    { keywords: ['agency name', 'agencyname', 'company name', 'travel agency'], category: FIELD_CATEGORIES.FIXED_DEFAULT, source: 'agencyName', score: 80 },
    { keywords: ['religion', 'religious'], category: FIELD_CATEGORIES.FIXED_DEFAULT, source: 'religion', score: 85 },
    { keywords: ['preferred contact', 'contact method', 'preferred method'], category: FIELD_CATEGORIES.FIXED_DEFAULT, source: 'preferredContactMethod', score: 75 },
    { keywords: ['passport upload', 'passport image', 'passport copy', 'upload passport', 'passport photo'], category: FIELD_CATEGORIES.FILE_UPLOAD, source: 'passportImage', score: 90 },
    { keywords: ['personal photo', 'applicant photo', 'photo upload', 'upload photo', 'passport size photo'], category: FIELD_CATEGORIES.FILE_UPLOAD, source: 'personalPhoto', score: 90 },
    { keywords: ['hotel booking', 'hotelbooking', 'hotel reservation', 'booking confirmation'], category: FIELD_CATEGORIES.FILE_UPLOAD, source: 'hotelBooking', score: 80 },
    { keywords: ['flight ticket', 'flightticket', 'airline ticket', 'boarding pass', 'e-ticket'], category: FIELD_CATEGORIES.FILE_UPLOAD, source: 'flightTicket', score: 80 },
    { keywords: ['insurance document', 'insurance', 'travel insurance', 'health insurance'], category: FIELD_CATEGORIES.FILE_UPLOAD, source: 'insuranceDocument', score: 80 },
    { keywords: ['invitation letter', 'invitationletter', 'letter of invitation'], category: FIELD_CATEGORIES.FILE_UPLOAD, source: 'invitationLetter', score: 80 },
    { keywords: ['other document', 'otherdocument', 'supporting document', 'additional document'], category: FIELD_CATEGORIES.FILE_UPLOAD, source: 'otherDocument', score: 60 }
  ];

  const labelTypeCheck = [
    { labelContains: ['arrival'], typeContains: ['select', 'date'], field: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'arrivalDate' },
    { labelContains: ['arrival'], typeContains: ['text'], field: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'arrivalCity' },
    { labelContains: ['departure'], typeContains: ['select', 'date'], field: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'departureDate' },
    { labelContains: ['departure'], typeContains: ['text'], field: FIELD_CATEGORIES.DYNAMIC_TRAVEL, source: 'departureCity' }
  ];

  for (const check of checks) {
    if (check.keywords.some(kw => textToSearch.includes(kw))) {
      return {
        suggestedCategory: check.category,
        suggestedSource: check.source,
        confidence: check.score,
        needsManualVerification: false
      };
    }
  }

  for (const check of labelTypeCheck) {
    const normalizedLabel = normalizeString(textToSearch);
    if (check.labelContains.some(lc => normalizedLabel.includes(lc))) {
      const fieldTypeStr = `${tag}:${type}`;
      if (check.typeContains.some(tc => fieldTypeStr.includes(tc))) {
        return {
          suggestedCategory: check.field,
          suggestedSource: check.source,
          confidence: 75,
          needsManualVerification: false
        };
      }
    }
  }

  if (type === 'file' || tag === 'input' && type === 'file') {
    return {
      suggestedCategory: FIELD_CATEGORIES.FILE_UPLOAD,
      suggestedSource: 'otherDocument',
      confidence: 50,
      needsManualVerification: true
    };
  }

  if (tag === 'input' && type === 'hidden') {
    return {
      suggestedCategory: FIELD_CATEGORIES.IGNORE,
      suggestedSource: null,
      confidence: 50,
      needsManualVerification: true
    };
  }

  return {
    suggestedCategory: null,
    suggestedSource: null,
    confidence: 0,
    needsManualVerification: true
  };
}

function getSourcesForCategory(category) {
  switch (category) {
    case FIELD_CATEGORIES.DYNAMIC_OCR: return OCR_SOURCES;
    case FIELD_CATEGORIES.DYNAMIC_CUSTOMER: return CUSTOMER_SOURCES;
    case FIELD_CATEGORIES.DYNAMIC_TRAVEL: return TRAVEL_SOURCES;
    case FIELD_CATEGORIES.FIXED_DEFAULT: return FIXED_SOURCES;
    case FIELD_CATEGORIES.FILE_UPLOAD: return FILE_UPLOAD_SOURCES;
    default: return [];
  }
}
