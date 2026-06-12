// ════════════════════════════════════════════════════════
// HM Label & Accessories Ltd. — Enhanced Google Apps Script
// Created by IA EMON | +8801719264759 | iaemonbd.github.io/web
// Version 2.0 — Centralized Credentials + Business Hours + QR
// ════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// ✅ SECTION 1: GOOGLE SHEET ID (পরিবর্তন করুন)
// ══════════════════════════════════════════════════════
const SHEET_ID = '1vK6XQkj1w5uy2mQQq4Snjv5qDK0Y_wZjqgkzUXr5MFE';

// ══════════════════════════════════════════════════════
// ✅ SECTION 2: TELEGRAM CREDENTIALS (পরিবর্তন করুন)
// Telegram Bot Token ও Chat ID এখানে সংরক্ষিত থাকবে
// Google Sheet এর 'Credentials' শিট থেকেও পাওয়া যাবে
// ══════════════════════════════════════════════════════
const TG_BOT_TOKEN_DEFAULT = '8754907131:AAFrY6lpa9-NXlZfITY9F6Hi13mgWhP-xg4';
const TG_CHAT_ID_DEFAULT   = '5331899512';

// ══════════════════════════════════════════════════════
// ✅ SECTION 3: IPINFO TOKEN (পরিবর্তন করুন)
// https://ipinfo.io থেকে বিনামূল্যে পাওয়া যায়
// ══════════════════════════════════════════════════════
const IPINFO_TOKEN_DEFAULT = '06e85c624a00b8';

// ══════════════════════════════════════════════════════
// ✅ SECTION 4: WEATHER API BASE URL (পরিবর্তন করুন)
// বর্তমানে বিনামূল্যে open-meteo ব্যবহার করা হচ্ছে
// ══════════════════════════════════════════════════════
const WEATHER_API_BASE = 'https://api.open-meteo.com/v1/forecast';

// ══════════════════════════════════════════════════════
// doGet — GET রিকোয়েস্ট হ্যান্ডলিং
// ══════════════════════════════════════════════════════
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;

    if (action === 'init') {
      result = initDatabase();
    } else if (action === 'getAll') {
      result = getAllData();
    } else if (action === 'verifyPassword') {
      result = verifyPassword(e.parameter.password);
    } else if (action === 'getBusinessHours') {
      result = getBusinessHours();
    } else if (action === 'getCredentials') {
      // ✅ frontend সব credentials এখান থেকে নেবে
      result = getCredentials();
    } else {
      result = { success: false, message: 'Invalid action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'doGet Error: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ══════════════════════════════════════════════════════
// doPost — POST রিকোয়েস্ট হ্যান্ডলিং
// ══════════════════════════════════════════════════════
function doPost(e) {
  try {
    Logger.log('doPost called');
    Logger.log('Post data: ' + e.postData.contents);

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'JSON parse error: ' + parseError.toString()
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const action = data.action;
    Logger.log('Action: ' + action);

    let result;

    switch (action) {
      case 'changePassword':
        result = changePassword(data.data.currentPassword, data.data.newPassword);
        break;
      case 'addTeamMember':
        result = addTeamMember(data.data);
        break;
      case 'updateTeamMember':
        result = updateTeamMember(data.data);
        break;
      case 'deleteTeamMember':
        result = deleteTeamMember(data.data.id);
        break;
      case 'addProduct':
        result = addProduct(data.data);
        break;
      case 'deleteProduct':
        result = deleteProduct(data.data.id);
        break;
      case 'addFeature':
        result = addFeature(data.data);
        break;
      case 'deleteFeature':
        result = deleteFeature(data.data.id);
        break;
      case 'updateSettings':
        result = updateSettings(data.data);
        break;
      case 'updateBusinessHours':
        result = updateBusinessHours(data.data);
        break;
      case 'addBusinessHour':
        result = addBusinessHour(data.data);
        break;
      case 'deleteBusinessHour':
        result = deleteBusinessHour(data.data.id);
        break;
      case 'updateCredentials':
        result = updateCredentials(data.data);
        break;
      default:
        result = { success: false, message: 'Unknown action: ' + action };
    }

    Logger.log('Result: ' + JSON.stringify(result));

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('doPost Error: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'doPost Error: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ══════════════════════════════════════════════════════
// ✅ getCredentials — সব API credential একসাথে রিটার্ন
// ══════════════════════════════════════════════════════
function getCredentials() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const credSheet = ss.getSheetByName('Credentials');

    // যদি Credentials শিট না থাকে, ডিফল্ট ভ্যালু রিটার্ন
    if (!credSheet || credSheet.getLastRow() <= 1) {
      return {
        success: true,
        data: {
          tgBotToken:   TG_BOT_TOKEN_DEFAULT,
          tgChatId:     TG_CHAT_ID_DEFAULT,
          ipinfoToken:  IPINFO_TOKEN_DEFAULT,
          weatherApi:   WEATHER_API_BASE
        }
      };
    }

    const rows = credSheet.getDataRange().getValues();
    const creds = {};
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) creds[rows[i][0]] = rows[i][1];
    }

    return {
      success: true,
      data: {
        tgBotToken:  creds['tgBotToken']  || TG_BOT_TOKEN_DEFAULT,
        tgChatId:    creds['tgChatId']    || TG_CHAT_ID_DEFAULT,
        ipinfoToken: creds['ipinfoToken'] || IPINFO_TOKEN_DEFAULT,
        weatherApi:  creds['weatherApi']  || WEATHER_API_BASE
      }
    };
  } catch (error) {
    // fallback to defaults on any error
    return {
      success: true,
      data: {
        tgBotToken:  TG_BOT_TOKEN_DEFAULT,
        tgChatId:    TG_CHAT_ID_DEFAULT,
        ipinfoToken: IPINFO_TOKEN_DEFAULT,
        weatherApi:  WEATHER_API_BASE
      }
    };
  }
}

// ══════════════════════════════════════════════════════
// ✅ updateCredentials — Admin থেকে credentials আপডেট
// ══════════════════════════════════════════════════════
function updateCredentials(creds) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let credSheet = ss.getSheetByName('Credentials');
    if (!credSheet) {
      credSheet = ss.insertSheet('Credentials');
      credSheet.appendRow(['Key', 'Value', 'Description']);
    }

    // শিট পরিষ্কার করে নতুন ডেটা লেখা (header রেখে)
    if (credSheet.getLastRow() > 1) {
      credSheet.getRange(2, 1, credSheet.getLastRow() - 1, 3).clearContent();
    }

    const entries = [
      ['tgBotToken',  creds.tgBotToken  || TG_BOT_TOKEN_DEFAULT,  'Telegram Bot Token'],
      ['tgChatId',    creds.tgChatId    || TG_CHAT_ID_DEFAULT,    'Telegram Chat/Group ID'],
      ['ipinfoToken', creds.ipinfoToken || IPINFO_TOKEN_DEFAULT,  'IPInfo.io API Token'],
      ['weatherApi',  creds.weatherApi  || WEATHER_API_BASE,      'Weather API Base URL']
    ];

    entries.forEach((row, i) => {
      credSheet.getRange(i + 2, 1, 1, 3).setValues([row]);
    });

    return { success: true, message: 'Credentials updated successfully' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ══════════════════════════════════════════════════════
// initDatabase — সব শিট তৈরি করা
// ══════════════════════════════════════════════════════
function initDatabase() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    const sheets = ['Settings', 'Team', 'Products', 'Features', 'Password', 'BusinessHours', 'Credentials'];
    sheets.forEach(name => {
      if (!ss.getSheetByName(name)) ss.insertSheet(name);
    });

    // ── Settings ────────────────────────────────────────
    const settingsSheet = ss.getSheetByName('Settings');
    if (settingsSheet.getLastRow() === 0) {
      settingsSheet.appendRow(['Key', 'Value']);
      const defaults = [
        ['lat', '23.879802280846306'],
        ['lng', '90.30006870639016'],
        ['factoryLat', '23.879802280846306'],
        ['factoryLng', '90.30006870639016'],
        ['facebook', ''],
        ['twitter', ''],
        ['linkedin', ''],
        ['instagram', ''],
        ['youtube', ''],
        ['companyName', 'HM Label & Accessories Ltd.'],
        ['tagline', 'Precision Crafted Brand Essentials'],
        ['email', 'info@hmlabel.com'],
        ['phone', '+8801746828400'],
        ['address', 'House #25, Road 04, Sector 3, Uttara, Dhaka 1230'],
        ['factoryAddress', 'Aukpara, Ashulia, Savar, Dhaka-1341']
      ];
      defaults.forEach(row => settingsSheet.appendRow(row));
    }

    // ── Password ────────────────────────────────────────
    const passwordSheet = ss.getSheetByName('Password');
    if (passwordSheet.getLastRow() === 0) {
      passwordSheet.appendRow(['Password']);
      passwordSheet.appendRow(['#0000']);
    }

    // ── Team (Enhanced) ─────────────────────────────────
    const teamSheet = ss.getSheetByName('Team');
    if (teamSheet.getLastRow() === 0) {
      teamSheet.appendRow(['ID','Name','Role','Phone','Email','Photo','Department','LinkedIn','Facebook','Bio','JoinDate']);
      teamSheet.appendRow([
        'default-md','MD Hafizur Rahman','Managing Director',
        '+8801746828400','hafizur@hmlabel.com','ManagingDirector.png',
        'Executive','','','Founder and Managing Director of HM Label.','2010-01-01'
      ]);
    }

    // ── Products ────────────────────────────────────────
    const productsSheet = ss.getSheetByName('Products');
    if (productsSheet.getLastRow() === 0) {
      productsSheet.appendRow(['ID','Name','Category','Description','Tags','Photo']);
      const products = [
        ['p1','Woven Labels','labels','High-definition weaving for durable brand identity.','Premium,Durable','WovenLabels.png'],
        ['p2','Printed Fabric Labels','labels','High-quality care labels on satin, cotton, nylon.','Satin,Cotton','PFL.png'],
        ['p3','Heat Transfer Labels','labels','Tag-less labeling solutions for comfort.','Tag-less,Comfort','HeatTransfer.png'],
        ['p4','Screen Printed Labels','labels','Vibrant labels with traditional techniques.','Vibrant,Color','ScreenLabels.png'],
        ['p5','Variable Data & Barcode','tech','Precision printing for barcodes and SKU.','SKU,Tracking','Barcode.png'],
        ['p6','Thermal Wax Ribbons','tech','Smudge-resistant ribbons for thermal prints.','Resin,Crisp','WaxRibbons.png'],
        ['p7','RFID & Smart Labeling','tech','Advanced tracking for supply chain.','IoT,Smart','RFID.png'],
        ['p8','Branding Hangtags','packaging','Custom tags with offset and digital printing.','Offset,Digital','Hangtags.png'],
        ['p9','Seal Cords & Strings','packaging','Attachment solutions for hangtags.','Secure,Durable','SealCords.png'],
        ['p10','Apparel Buttons & Hardware','hardware','Functional and decorative buttons.','Metal,Plastic','Buttons.png']
      ];
      products.forEach(p => productsSheet.appendRow(p));
    }

    // ── Features ────────────────────────────────────────
    const featuresSheet = ss.getSheetByName('Features');
    if (featuresSheet.getLastRow() === 0) {
      featuresSheet.appendRow(['ID','Title','Description','Icon']);
      const features = [
        ['f1','Premium Quality','We use only the finest materials for highest standards.','fas fa-award'],
        ['f2','Fast Delivery','Quick turnaround without compromising quality.','fas fa-shipping-fast'],
        ['f3','Custom Designs','Fully customizable products for your brand.','fas fa-paint-brush'],
        ['f4','24/7 Support','Round-the-clock customer support.','fas fa-headset'],
        ['f5','Eco-Friendly','Sustainable practices and eco-friendly materials.','fas fa-leaf'],
        ['f6','Global Shipping','Worldwide delivery network.','fas fa-globe']
      ];
      features.forEach(f => featuresSheet.appendRow(f));
    }

    // ── BusinessHours ───────────────────────────────────
const bhSheet = ss.getSheetByName('BusinessHours');
if (bhSheet.getLastRow() === 0) {
  bhSheet.appendRow(['ID','Day','OpenTime','CloseTime','IsClosed','SortOrder']);
  // ✅ UPDATED: 8:00 AM - 5:00 PM, Friday & Saturday Closed
  const defaultHours = [
    ['bh1','Sunday',   '8:00 AM','5:00 PM','false','1'],
    ['bh2','Monday',   '8:00 AM','5:00 PM','false','2'],
    ['bh3','Tuesday',  '8:00 AM','5:00 PM','false','3'],
    ['bh4','Wednesday','8:00 AM','5:00 PM','false','4'],
    ['bh5','Thursday', '8:00 AM','5:00 PM','false','5'],
    ['bh6','Friday',   '','',              'true', '6'],
    ['bh7','Saturday', '8:00 AM','5:00 PM','false','5'],
  ];
  defaultHours.forEach(h => bhSheet.appendRow(h));
}

    // ── Credentials ─────────────────────────────────────
    const credSheet = ss.getSheetByName('Credentials');
    if (credSheet.getLastRow() === 0) {
      credSheet.appendRow(['Key','Value','Description']);
      credSheet.appendRow(['tgBotToken',  TG_BOT_TOKEN_DEFAULT, 'Telegram Bot Token']);
      credSheet.appendRow(['tgChatId',    TG_CHAT_ID_DEFAULT,   'Telegram Chat/Group ID']);
      credSheet.appendRow(['ipinfoToken', IPINFO_TOKEN_DEFAULT,  'IPInfo.io API Token']);
      credSheet.appendRow(['weatherApi',  WEATHER_API_BASE,      'Weather API Base URL']);
    }

    return { success: true, message: 'Database initialized successfully (v2.0)' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ══════════════════════════════════════════════════════
// getAllData — সব ডেটা একসাথে
// ══════════════════════════════════════════════════════
function getAllData() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);

    // Settings
    const settingsSheet = ss.getSheetByName('Settings');
    const settingsData = settingsSheet.getDataRange().getValues();
    const settings = {};
    for (let i = 1; i < settingsData.length; i++) {
      settings[settingsData[i][0]] = settingsData[i][1];
    }

    // Team
    const teamSheet = ss.getSheetByName('Team');
    const teamData = teamSheet.getDataRange().getValues();
    const team = [];
    for (let i = 1; i < teamData.length; i++) {
      if (teamData[i][0]) {
        team.push({
          id:         teamData[i][0],
          name:       teamData[i][1],
          role:       teamData[i][2],
          phone:      teamData[i][3],
          email:      teamData[i][4],
          photo:      teamData[i][5],
          department: teamData[i][6] || '',
          linkedin:   teamData[i][7] || '',
          facebook:   teamData[i][8] || '',
          bio:        teamData[i][9] || '',
          joinDate:   teamData[i][10] || ''
        });
      }
    }

    // Products
    const productsSheet = ss.getSheetByName('Products');
    const productsData = productsSheet.getDataRange().getValues();
    const products = [];
    for (let i = 1; i < productsData.length; i++) {
      if (productsData[i][0]) {
        products.push({
          id:          productsData[i][0],
          name:        productsData[i][1],
          category:    productsData[i][2],
          description: productsData[i][3],
          tags:        productsData[i][4] ? String(productsData[i][4]).split(',').map(t => t.trim()) : [],
          photo:       productsData[i][5]
        });
      }
    }

    // Features
    const featuresSheet = ss.getSheetByName('Features');
    const featuresData = featuresSheet.getDataRange().getValues();
    const features = [];
    for (let i = 1; i < featuresData.length; i++) {
      if (featuresData[i][0]) {
        features.push({
          id:          featuresData[i][0],
          title:       featuresData[i][1],
          description: featuresData[i][2],
          icon:        featuresData[i][3]
        });
      }
    }

    // BusinessHours
    const businessHours = getBusinessHoursData(ss);

    return {
      success: true,
      data: { settings, team, products, features, businessHours }
    };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ══════════════════════════════════════════════════════
// getBusinessHoursData
// ══════════════════════════════════════════════════════
function getBusinessHoursData(ss) {
  try {
    if (!ss) ss = SpreadsheetApp.openById(SHEET_ID);
    const bhSheet = ss.getSheetByName('BusinessHours');
    if (!bhSheet) return [];
    const data = bhSheet.getDataRange().getValues();
    const hours = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        hours.push({
          id:        data[i][0],
          day:       data[i][1],
          openTime:  data[i][2],
          closeTime: data[i][3],
          isClosed:  data[i][4] === 'true' || data[i][4] === true,
          sortOrder: parseInt(data[i][5]) || i
        });
      }
    }
    hours.sort((a, b) => a.sortOrder - b.sortOrder);
    return hours;
  } catch (e) {
    return [];
  }
}

function getBusinessHours() {
  try {
    return { success: true, data: getBusinessHoursData(null) };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateBusinessHours(hoursArray) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const bhSheet = ss.getSheetByName('BusinessHours');
    if (!bhSheet) return { success: false, message: 'BusinessHours sheet not found' };
    bhSheet.clearContents();
    bhSheet.appendRow(['ID','Day','OpenTime','CloseTime','IsClosed','SortOrder']);
    hoursArray.forEach((h, idx) => {
      bhSheet.appendRow([
        h.id || 'bh_' + Date.now() + '_' + idx,
        h.day || '', h.openTime || '', h.closeTime || '',
        h.isClosed ? 'true' : 'false',
        h.sortOrder || idx + 1
      ]);
    });
    return { success: true, message: 'Business hours updated' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function addBusinessHour(hour) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const bhSheet = ss.getSheetByName('BusinessHours');
    if (!bhSheet) return { success: false, message: 'Sheet not found' };
    bhSheet.appendRow([
      hour.id || 'bh_' + Date.now(),
      hour.day || '', hour.openTime || '', hour.closeTime || '',
      hour.isClosed ? 'true' : 'false',
      hour.sortOrder || bhSheet.getLastRow()
    ]);
    return { success: true, message: 'Business hour added' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteBusinessHour(id) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const bhSheet = ss.getSheetByName('BusinessHours');
    const data = bhSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { bhSheet.deleteRow(i + 1); return { success: true }; }
    }
    return { success: false, message: 'ID not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ══════════════════════════════════════════════════════
// PASSWORD
// ══════════════════════════════════════════════════════
function verifyPassword(password) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const stored = ss.getSheetByName('Password').getRange(2, 1).getValue();
    return { success: password === stored };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function changePassword(currentPassword, newPassword) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Password');
    const stored = sheet.getRange(2, 1).getValue();
    if (currentPassword !== stored) return { success: false, message: 'Current password incorrect' };
    sheet.getRange(2, 1).setValue(newPassword);
    return { success: true, message: 'Password changed' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ══════════════════════════════════════════════════════
// TEAM
// ══════════════════════════════════════════════════════
function addTeamMember(member) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    ss.getSheetByName('Team').appendRow([
      member.id || 'tm_' + Date.now(),
      member.name || '', member.role || '',
      member.phone || '', member.email || '', member.photo || '',
      member.department || '', member.linkedin || '',
      member.facebook || '', member.bio || '', member.joinDate || ''
    ]);
    return { success: true, message: 'Team member added' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function updateTeamMember(member) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Team');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === member.id) {
        sheet.getRange(i + 1, 1, 1, 11).setValues([[
          member.id, member.name || '', member.role || '',
          member.phone || '', member.email || '', member.photo || '',
          member.department || '', member.linkedin || '',
          member.facebook || '', member.bio || '', member.joinDate || ''
        ]]);
        return { success: true, message: 'Team member updated' };
      }
    }
    return { success: false, message: 'Member not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteTeamMember(id) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Team');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.deleteRow(i + 1); return { success: true }; }
    }
    return { success: false, message: 'ID not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ══════════════════════════════════════════════════════
// PRODUCTS
// ══════════════════════════════════════════════════════
function addProduct(product) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Products');
    if (!sheet) return { success: false, message: 'Products sheet not found' };
    const tagsStr = product.tags ? (Array.isArray(product.tags) ? product.tags.join(',') : String(product.tags)) : '';
    sheet.appendRow([
      product.id || 'pd_' + Date.now(),
      product.name || '', product.category || '',
      product.description || '', tagsStr, product.photo || ''
    ]);
    return { success: true, message: 'Product added', id: product.id };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteProduct(id) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Products');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.deleteRow(i + 1); return { success: true }; }
    }
    return { success: false, message: 'ID not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ══════════════════════════════════════════════════════
// FEATURES
// ══════════════════════════════════════════════════════
function addFeature(feature) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    ss.getSheetByName('Features').appendRow([
      feature.id || 'ft_' + Date.now(),
      feature.title, feature.description, feature.icon
    ]);
    return { success: true, message: 'Feature added' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

function deleteFeature(id) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Features');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) { sheet.deleteRow(i + 1); return { success: true }; }
    }
    return { success: false, message: 'ID not found' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// ══════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════
function updateSettings(settings) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('Settings');
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      if (settings[key] !== undefined) sheet.getRange(i + 1, 2).setValue(settings[key]);
    }
    return { success: true, message: 'Settings updated' };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}
