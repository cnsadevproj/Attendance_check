function doGet(e) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('schedule_json');
  if (cached) {
    return ContentService.createTextOutput(cached).setMimeType(ContentService.MimeType.JSON);
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var schedule = [];

  ss.getSheets().forEach(function(sheet) {
    var data = sheet.getDataRange().getValues();

    var headerIdx = -1;
    for (var i = 0; i < Math.min(5, data.length); i++) {
      if (String(data[i][0]).trim() === '고유번호') {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return;

    var headers = data[headerIdx].map(function(h) { return String(h).trim(); });
    var ci = {
      uid: headers.indexOf('고유번호'),
      date: headers.indexOf('강좌 일자'),
      day: headers.indexOf('요일'),
      teacher: headers.indexOf('성명'),
      course: headers.indexOf('강좌명'),
      time: headers.indexOf('강좌 시간'),
      makeup: headers.indexOf('보강 날짜')
    };

    var cur = { uid: null, teacher: '', course: '', time: '' };

    for (var i = headerIdx + 1; i < data.length; i++) {
      var row = data[i];
      var uid = ci.uid >= 0 ? row[ci.uid] : null;
      var dateVal = ci.date >= 0 ? row[ci.date] : null;
      var teacher = ci.teacher >= 0 ? row[ci.teacher] : '';
      var course = ci.course >= 0 ? row[ci.course] : '';
      var timeVal = ci.time >= 0 ? row[ci.time] : '';
      var makeup = ci.makeup >= 0 ? row[ci.makeup] : null;

      if (uid !== '' && uid !== null && uid !== undefined) {
        cur.uid = Number(uid);
      }
      if (teacher) cur.teacher = String(teacher).trim();
      if (course) cur.course = String(course).trim();
      if (timeVal) cur.time = String(timeVal).trim();

      var dateStr = toDateStr_(dateVal);
      if (!dateStr) continue;
      if (!cur.uid || !cur.course) continue;

      var timeMatch = cur.time.match(/\(([^)]+)\)/);

      schedule.push({
        uid: cur.uid,
        course: cur.course,
        teacher: cur.teacher,
        date: dateStr,
        day: String(ci.day >= 0 ? row[ci.day] || '' : '').trim(),
        time: timeMatch ? timeMatch[1] : '',
        makeup: toDateStr_(makeup)
      });
    }
  });

  var output = JSON.stringify({
    schedule: schedule,
    count: schedule.length,
    updatedAt: new Date().toISOString()
  });

  cache.put('schedule_json', output, 300);

  return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
}

function toDateStr_(val) {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val)) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = String(val).trim();
  var m = s.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (m) return '20' + m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  return null;
}
