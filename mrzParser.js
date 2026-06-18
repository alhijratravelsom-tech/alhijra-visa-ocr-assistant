var MrzParser = {
  currentYearTwoDigits: parseInt(new Date().toISOString().substring(2, 4), 10),

  normalizeText: function (rawText) {
    if (!rawText) return '';
    var text = rawText.toUpperCase();
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(/\r/g, '\n');
    var lines = text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });
    return lines.join('\n');
  },

  cleanMRZLine: function (line) {
    if (!line) return '';
    line = line.toUpperCase();
    line = line.replace(/\s/g, '<');
    line = line.replace(/[^A-Z0-9<]/g, '');
    return line;
  },

  correctNumericInText: function (str) {
    if (!str) return '';
    var result = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      if (ch === '0') ch = 'O';
      result += ch;
    }
    return result;
  },

  correctLine2Numerics: function (line) {
    if (!line) return '';
    var chars = line.split('');
    var numericRanges = [
      { start: 0, end: 9 }, { start: 13, end: 19 }, { start: 21, end: 27 }
    ];
    for (var i = 0; i < chars.length; i++) {
      var isNumeric = false;
      for (var r = 0; r < numericRanges.length; r++) {
        if (i >= numericRanges[r].start && i < numericRanges[r].end) { isNumeric = true; break; }
      }
      if (isNumeric) {
        if (chars[i] === 'O' || chars[i] === 'Q' || chars[i] === 'D') chars[i] = '0';
        else if (chars[i] === 'I' || chars[i] === 'L' || chars[i] === '|' || chars[i] === '!') chars[i] = '1';
        else if (chars[i] === 'S' || chars[i] === '$') chars[i] = '5';
        else if (chars[i] === 'B') chars[i] = '8';
        else if (chars[i] === 'Z') chars[i] = '2';
        else if (chars[i] === 'G') chars[i] = '6';
        else if (chars[i] === 'U') chars[i] = '0';
      }
    }
    return chars.join('');
  },

  padMRZLine: function (line) {
    if (!line) return '';
    if (line.length < 44) {
      while (line.length < 44) { line += '<'; }
    }
    if (line.length > 44) {
      line = line.substring(0, 44);
    }
    return line;
  },

  detectMRZ: function (rawText) {
    if (!rawText) return null;
    var normalized = this.normalizeText(rawText);
    var rawLines = normalized.split('\n');

    var cleaned = rawLines.map(function (l) {
      return MrzParser.cleanMRZLine(l);
    });

    for (var i = 0; i < cleaned.length - 1; i++) {
      var l1 = cleaned[i];
      var l2 = cleaned[i + 1];
      if (l1.length >= 40 && l1.length <= 50 && l2.length >= 40 && l2.length <= 50) {
        if ((l1.indexOf('P<') === 0 || l1.indexOf('P') === 0 || l1.indexOf('P<') === 0) && l2.indexOf('<') >= 8) {
          return { line1: this.padMRZLine(l1), line2: this.padMRZLine(l2), rawLine1: rawLines[i], rawLine2: rawLines[i + 1] };
        }
      }
    }

    for (var j = 0; j < cleaned.length - 1; j++) {
      var a = cleaned[j];
      var b = cleaned[j + 1];
      if (a.length >= 30 && a.length <= 55 && b.length >= 30 && b.length <= 55) {
        var hasChevronA = a.indexOf('<') > 0;
        var hasChevronB = b.indexOf('<') > 0;
        if (hasChevronA || hasChevronB) {
          return { line1: this.padMRZLine(a), line2: this.padMRZLine(b), rawLine1: rawLines[j], rawLine2: rawLines[j + 1] };
        }
      }
    }

    for (var k = 0; k < cleaned.length - 2; k++) {
      var merged = cleaned[k] + cleaned[k + 1] + cleaned[k + 2];
      if (merged.length >= 70) {
        var mid = Math.floor(merged.length / 2);
        var ml1 = merged.substring(0, mid);
        var ml2 = merged.substring(mid);
        if (ml1.length >= 30 && ml2.length >= 30) {
          return { line1: this.padMRZLine(ml1), line2: this.padMRZLine(ml2), rawLine1: rawLines[k], rawLine2: rawLines[k + 1] };
        }
      }
    }

    var full = cleaned.join('');
    if (full.length >= 70) {
      var split = Math.floor(full.length / 2);
      var fl1 = full.substring(0, split);
      var fl2 = full.substring(split);
      if (fl1.length >= 35 && fl2.length >= 35) {
        return { line1: this.padMRZLine(fl1), line2: this.padMRZLine(fl2), rawLine1: rawText, rawLine2: '' };
      }
    }

    for (var m = 0; m < cleaned.length - 1; m++) {
      var c1 = cleaned[m];
      var c2 = cleaned[m + 1];
      if (c1.length >= 44 && c2.length >= 44) {
        var isTD3 = (c1.indexOf('P') === 0 || c1.indexOf('P<') === 0) && (c2.indexOf('<') !== -1);
        if (isTD3) {
          return { line1: this.padMRZLine(c1), line2: this.padMRZLine(c2), rawLine1: rawLines[m], rawLine2: rawLines[m + 1] };
        }
      }
    }

    return null;
  },

  parseTD3: function (line1, line2) {
    var result = {
      documentType: '', issuingCountry: '', surname: '', givenNames: '',
      firstName: '', middleName: '', lastName: '', fullName: '',
      passportNumber: '', passportNumberCheckDigit: '', nationality: '',
      dateOfBirth: '', birthDateCheckDigit: '', gender: '',
      passportExpiryDate: '', expiryDateCheckDigit: '', optionalData: '',
      finalCheckDigit: '', checkDigitValid: true, checkDigitWarnings: [],
      parsedAt: new Date().toISOString()
    };

    if (!line1 || !line2) return result;

    line1 = line1.replace(/[^A-Z0-9<]/g, '').toUpperCase();
    line2 = line2.replace(/[^A-Z0-9<]/g, '').toUpperCase();

    line2 = this.correctLine2Numerics(line2);

    result.documentType = line1.substring(0, 2) || '';
    result.issuingCountry = line1.substring(2, 5) || '';

    var namePart = line1.substring(5) || '';
    var nameParts = namePart.split('<<');
    result.surname = nameParts[0] || '';
    result.givenNames = nameParts.length > 1 ? nameParts[1] : '';

    result.surname = result.surname.replace(/</g, ' ').trim();
    result.givenNames = result.givenNames.replace(/</g, ' ').trim();

    var givenNameArray = result.givenNames.split(' ').filter(function (s) { return s.length > 0; });
    result.firstName = givenNameArray[0] || '';
    result.middleName = givenNameArray.slice(1).join(' ') || '';
    result.lastName = result.surname;
    result.fullName = (result.givenNames + ' ' + result.surname).trim();

    result.passportNumber = line2.substring(0, 9) || '';
    result.passportNumberCheckDigit = line2.substring(9, 10) || '';
    result.nationality = line2.substring(10, 13) || '';

    var dobRaw = line2.substring(13, 19) || '';
    result.dateOfBirth = this.parseMRZDate(dobRaw, true);
    result.birthDateCheckDigit = line2.substring(19, 20) || '';

    result.gender = line2.substring(20, 21) || '';
    if (result.gender === 'M' || result.gender === '<') result.gender = 'Male';
    else if (result.gender === 'F') result.gender = 'Female';
    else result.gender = 'Unspecified';

    var expiryRaw = line2.substring(21, 27) || '';
    result.passportExpiryDate = this.parseMRZDate(expiryRaw, false);
    result.expiryDateCheckDigit = line2.substring(27, 28) || '';

    result.optionalData = line2.substring(28, 42) || '';
    result.optionalData = result.optionalData.replace(/</g, '');
    result.finalCheckDigit = line2.length > 42 ? line2.substring(42, 43) : '';

    var warnings = [];
    var pw = this.validatePassportNumber(line2.substring(0, 10));
    if (!pw.valid) warnings.push('Passport check digit: ' + pw.message);
    var dw = this.validateDateField(dobRaw, line2.substring(19, 20));
    if (!dw.valid) warnings.push('DOB check digit: ' + dw.message);
    var ew = this.validateDateField(expiryRaw, line2.substring(27, 28));
    if (!ew.valid) warnings.push('Expiry check digit: ' + ew.message);
    if (line2.length > 43) {
      var fw = this.validateFinalCheckDigit(line2);
      if (!fw.valid) warnings.push('Final check digit: ' + fw.message);
    }

    result.checkDigitWarnings = warnings;
    result.checkDigitValid = warnings.length === 0;

    return result;
  },

  parseMRZDate: function (yymmdd, isBirthDate) {
    if (!yymmdd || yymmdd.length < 6) return '';
    var yyStr = yymmdd.substring(0, 2);
    var mm = yymmdd.substring(2, 4);
    var dd = yymmdd.substring(4, 6);
    if (yyStr.replace(/[^0-9]/g, '').length < 2) return '';
    var yy = parseInt(yyStr, 10);
    if (isNaN(yy)) return '';
    if (mm.replace(/[^0-9]/g, '').length < 2) mm = '01';
    else {
      var mmNum = parseInt(mm, 10);
      if (mmNum < 1 || mmNum > 12) mm = '01';
    }
    if (dd.replace(/[^0-9]/g, '').length < 2) dd = '01';
    else {
      var ddNum = parseInt(dd, 10);
      if (ddNum < 1 || ddNum > 31) dd = '01';
    }
    var fullYear;
    if (isBirthDate) {
      fullYear = yy > this.currentYearTwoDigits ? 1900 + yy : 2000 + yy;
    } else {
      fullYear = 2000 + yy;
    }
    var result = String(fullYear) + '-' + mm + '-' + dd;
    if (isNaN(fullYear) || fullYear < 1900 || fullYear > 2100) return '';
    return result;
  },

  computeCheckDigit: function (str) {
    var weights = [7, 3, 1];
    var total = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var val;
      if (ch >= '0' && ch <= '9') { val = parseInt(ch, 10); }
      else if (ch >= 'A' && ch <= 'Z') { val = ch.charCodeAt(0) - 55; }
      else if (ch === '<') { val = 0; }
      else { return null; }
      total += val * weights[i % 3];
    }
    return String(total % 10);
  },

  validatePassportNumber: function (str) {
    if (!str || str.length < 10) return { valid: false, message: 'Insufficient length for validation' };
    var data = str.substring(0, 9);
    var check = str.substring(9, 10);
    var computed = this.computeCheckDigit(data);
    if (computed === null) return { valid: true, message: 'Skipped - non-numeric characters' };
    if (computed === check) return { valid: true, message: 'Valid' };
    return { valid: false, message: 'Expected ' + computed + ', got ' + check };
  },

  validateDateField: function (rawDate, checkDigit) {
    if (!rawDate || rawDate.length < 6 || !checkDigit) return { valid: true, message: 'Skipped - insufficient data' };
    var computed = this.computeCheckDigit(rawDate);
    if (computed === null) return { valid: true, message: 'Skipped - non-numeric' };
    if (computed === checkDigit) return { valid: true, message: 'Valid' };
    return { valid: false, message: 'Expected ' + computed + ', got ' + check };
  },

  validateFinalCheckDigit: function (line2) {
    if (!line2 || line2.length < 44) return { valid: true, message: 'Skipped - line too short' };
    var data = line2.substring(0, 43);
    var check = line2.substring(43, 44);
    var computed = this.computeCheckDigit(data);
    if (computed === null) return { valid: true, message: 'Skipped - non-numeric' };
    if (computed === check) return { valid: true, message: 'Valid' };
    return { valid: false, message: 'Expected ' + computed + ', got ' + check };
  },

  extractPassportData: function (rawText) {
    var result = {
      success: false, mrzDetected: false, rawText: rawText || '',
      parsedData: null, mrzLines: null, error: '', ocrConfidence: 0,
      warnings: []
    };

    if (!rawText || rawText.trim().length === 0) {
      result.error = 'No text provided for MRZ extraction.';
      return result;
    }

    var mrz = this.detectMRZ(rawText);
    if (!mrz) {
      result.error = 'MRZ not detected clearly. Please upload a clearer passport image or enter data manually.';
      return result;
    }

    result.mrzDetected = true;
    result.mrzLines = { line1: mrz.line1, line2: mrz.line2 };

    var parsed = this.parseTD3(mrz.line1, mrz.line2);
    result.parsedData = parsed;
    result.warnings = parsed.checkDigitWarnings || [];
    result.success = true;

    return result;
  }
};
