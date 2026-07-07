function sendConfirmationMail_(application) {
  var headers = APP_CONFIG.APPLICATION_HEADERS;
  var status = application[headers.STATUS];
  if (APP_CONFIG.EVENT_APPLICATION_STATUS_OPTIONS.indexOf(status) !== -1) {
    if (status === APP_CONFIG.EVENT_APPLICATION_STATUS.CANCELED) {
      throw new Error(
        APP_CONFIG.TEXT.APPLICATION_MAIL_STATUS_UNSUPPORTED_PREFIX + status
      );
    }
    sendTemplatedApplicationMail_(application);
    return;
  }

  // 第2段階より前の既存申込を手動再送できるよう、旧テンプレートを残す。
  var settings = getSettings_();
  var eventName =
    settings[APP_CONFIG.SETTING_KEYS.EVENT_NAME] ||
    APP_CONFIG.INITIAL_SETTINGS[0][1];
  var contactName =
    settings[APP_CONFIG.SETTING_KEYS.CONTACT_NAME] ||
    APP_CONFIG.INITIAL_SETTINGS[1][1];
  var recipient = String(application[headers.EMAIL] || '').trim();
  if (!recipient) {
    throw new Error(APP_CONFIG.TEXT.EMAIL_EMPTY);
  }

  var subject =
    APP_CONFIG.MAIL.SUBJECT_PREFIX +
    eventName +
    APP_CONFIG.MAIL.SUBJECT_SUFFIX;
  var lines = [
    application[headers.NAME] + APP_CONFIG.MAIL.GREETING_SUFFIX,
    '',
    APP_CONFIG.MAIL.BODY_INTRO,
    '',
    APP_CONFIG.MAIL.LABEL_APPLICATION_ID +
      ': ' +
      application[headers.APPLICATION_ID],
    APP_CONFIG.MAIL.LABEL_EVENT_NAME + ': ' + eventName,
    APP_CONFIG.MAIL.LABEL_PARTICIPANTS +
      ': ' +
      application[headers.PARTICIPANTS] +
      APP_CONFIG.MAIL.PARTICIPANTS_SUFFIX,
    '',
    APP_CONFIG.MAIL.BODY_NOTICE,
    '',
    contactName
  ];
  var htmlBody =
    '<p>' +
    escapeHtml_(application[headers.NAME]) +
    escapeHtml_(APP_CONFIG.MAIL.GREETING_SUFFIX) +
    '</p><p>' +
    escapeHtml_(APP_CONFIG.MAIL.BODY_INTRO) +
    '</p><dl>' +
    '<dt>' +
    escapeHtml_(APP_CONFIG.MAIL.LABEL_APPLICATION_ID) +
    '</dt><dd>' +
    escapeHtml_(application[headers.APPLICATION_ID]) +
    '</dd><dt>' +
    escapeHtml_(APP_CONFIG.MAIL.LABEL_EVENT_NAME) +
    '</dt><dd>' +
    escapeHtml_(eventName) +
    '</dd><dt>' +
    escapeHtml_(APP_CONFIG.MAIL.LABEL_PARTICIPANTS) +
    '</dt><dd>' +
    escapeHtml_(application[headers.PARTICIPANTS]) +
    escapeHtml_(APP_CONFIG.MAIL.PARTICIPANTS_SUFFIX) +
    '</dd></dl><p>' +
    escapeHtml_(APP_CONFIG.MAIL.BODY_NOTICE) +
    '</p><p>' +
    escapeHtml_(contactName) +
    '</p>';

  var options = {
    to: recipient,
    subject: subject,
    body: lines.join('\n'),
    htmlBody: htmlBody,
    name: contactName
  };
  var replyTo = settings[APP_CONFIG.SETTING_KEYS.REPLY_TO_EMAIL];
  if (replyTo) {
    options.replyTo = replyTo;
  }
  sendMail_(options, settings);
}

function sendTemplatedApplicationMail_(application) {
  var headers = APP_CONFIG.APPLICATION_HEADERS;
  var recipient = String(application[headers.EMAIL] || '').trim();
  if (!recipient) {
    throw new Error(APP_CONFIG.TEXT.EMAIL_EMPTY);
  }
  var templateKeys = getApplicationTemplateKeys_(
    application[headers.STATUS]
  );
  var templates = getMailTemplates_();
  var subjectTemplate = requireMailTemplate_(
    templates,
    templateKeys.subject
  );
  var bodyTemplate = requireMailTemplate_(templates, templateKeys.body);
  var settings = getSettings_();
  var eventSlot = getEventSlots_().filter(function (slot) {
    return slot.key === application[headers.EVENT_SLOT_KEY];
  })[0];
  if (!eventSlot) {
    throw new Error(
      APP_CONFIG.TEXT.EVENT_SLOT_NOT_FOUND_PREFIX +
        application[headers.EVENT_SLOT_KEY]
    );
  }
  var placeholders = APP_CONFIG.MAIL_PLACEHOLDERS;
  var context = buildApplicationEventMailContext_(
    application,
    eventSlot,
    settings
  );

  var subject = renderMailTemplate_(subjectTemplate, context);
  var body = appendPaymentInstructionIfNeeded_(
    renderMailTemplate_(bodyTemplate, context),
    application[headers.STATUS],
    context
  );
  var options = {
    to: recipient,
    subject: subject,
    body: body,
    name: context[placeholders.CONTACT_NAME]
  };
  if (context[placeholders.REPLY_TO_EMAIL]) {
    options.replyTo = context[placeholders.REPLY_TO_EMAIL];
  }
  sendMail_(options, settings);
}

function appendPaymentInstructionIfNeeded_(body, status, context) {
  var paymentLink = context[APP_CONFIG.MAIL_PLACEHOLDERS.PAYMENT_LINK];
  if (
    status !== APP_CONFIG.EVENT_APPLICATION_STATUS.PARTICIPATING ||
    !paymentLink ||
    String(body).indexOf(paymentLink) !== -1
  ) {
    return body;
  }
  return (
    body +
    '\n\n参加費はクレジットカードによる事前払い制です。' +
    '\n以下のお支払いリンクを開き、金額欄に' +
    context[APP_CONFIG.MAIL_PLACEHOLDERS.TOTAL_PRICE] +
    '円と入力してお支払いください。' +
    '\n' +
    paymentLink
  );
}

function getApplicationTemplateKeys_(status) {
  var statuses = APP_CONFIG.EVENT_APPLICATION_STATUS;
  var keys = APP_CONFIG.MAIL_TEMPLATE_KEYS;
  if (status === statuses.PARTICIPATING) {
    return {
      subject: keys.APPLICATION_PARTICIPATION_SUBJECT,
      body: keys.APPLICATION_PARTICIPATION_BODY
    };
  }
  if (status === statuses.WAITLISTED) {
    return {
      subject: keys.APPLICATION_WAITLIST_SUBJECT,
      body: keys.APPLICATION_WAITLIST_BODY
    };
  }
  if (status === statuses.DECLINED) {
    return {
      subject: keys.APPLICATION_DECLINED_SUBJECT,
      body: keys.APPLICATION_DECLINED_BODY
    };
  }
  throw new Error(
    APP_CONFIG.TEXT.APPLICATION_MAIL_STATUS_UNSUPPORTED_PREFIX + status
  );
}

function getPaymentConfirmedTemplateKeys_() {
  var keys = APP_CONFIG.MAIL_TEMPLATE_KEYS;
  return {
    subject: keys.PAYMENT_CONFIRMED_SUBJECT,
    body: keys.PAYMENT_CONFIRMED_BODY
  };
}

function sendPaymentConfirmationMail_(application) {
  var headers = APP_CONFIG.APPLICATION_HEADERS;
  var recipient = String(application[headers.EMAIL] || '').trim();
  if (!recipient) {
    throw new Error(APP_CONFIG.TEXT.EMAIL_EMPTY);
  }
  var eventSlot = getEventSlots_().filter(function (slot) {
    return slot.key === application[headers.EVENT_SLOT_KEY];
  })[0];
  if (!eventSlot) {
    throw new Error(
      APP_CONFIG.TEXT.EVENT_SLOT_NOT_FOUND_PREFIX +
        application[headers.EVENT_SLOT_KEY]
    );
  }
  var templates = getMailTemplates_();
  var templateKeys = getPaymentConfirmedTemplateKeys_();
  var subjectTemplate = requireMailTemplate_(templates, templateKeys.subject);
  var bodyTemplate = requireMailTemplate_(templates, templateKeys.body);
  var settings = getSettings_();
  var context = buildApplicationEventMailContext_(
    application,
    eventSlot,
    settings
  );
  var options = {
    to: recipient,
    subject: renderMailTemplate_(subjectTemplate, context),
    body: renderMailTemplate_(bodyTemplate, context),
    name: context[APP_CONFIG.MAIL_PLACEHOLDERS.CONTACT_NAME]
  };
  if (context[APP_CONFIG.MAIL_PLACEHOLDERS.REPLY_TO_EMAIL]) {
    options.replyTo = context[APP_CONFIG.MAIL_PLACEHOLDERS.REPLY_TO_EMAIL];
  }
  sendMail_(options, settings);
}

function sendMail_(options, settings) {
  var mailSettings = settings || getSettings_();
  var from = String(
    mailSettings[APP_CONFIG.SETTING_KEYS.SEND_FROM_EMAIL] || ''
  ).trim();
  var mailOptions = Object.assign({}, options);
  var to = mailOptions.to;
  var subject = mailOptions.subject;
  var body = mailOptions.body;
  delete mailOptions.to;
  delete mailOptions.subject;
  delete mailOptions.body;
  if (from) {
    mailOptions.from = from;
  }
  GmailApp.sendEmail(to, subject, body, mailOptions);
}

function buildApplicationEventMailContext_(application, eventSlot, settings) {
  var headers = APP_CONFIG.APPLICATION_HEADERS;
  var placeholders = APP_CONFIG.MAIL_PLACEHOLDERS;
  var participantCount = Number(application[headers.PARTICIPANTS]) || 0;
  var context = {};
  context[placeholders.NAME] = application[headers.NAME];
  context[placeholders.APPLICATION_DATE] = formatDateTime_(
    application[headers.APPLICATION_DATE]
  );
  context[placeholders.TITLE] = application[headers.TITLE];
  context[placeholders.PARTICIPANTS] = participantCount;
  context[placeholders.PRICE_PER_PERSON] = eventSlot.pricePerPerson;
  context[placeholders.TOTAL_PRICE] =
    eventSlot.pricePerPerson * participantCount;
  context[placeholders.PAYMENT_LINK] =
    settings[APP_CONFIG.SETTING_KEYS.PAYMENT_LINK] || '';
  context[placeholders.RECEPTION_START_TIME] =
    formatReceptionTime_(eventSlot.receptionStartTime);
  context[placeholders.STATUS] = application[headers.STATUS];
  context[placeholders.CONTACT_NAME] =
    settings[APP_CONFIG.SETTING_KEYS.CONTACT_NAME] ||
    APP_CONFIG.INITIAL_SETTINGS[1][1];
  context[placeholders.REPLY_TO_EMAIL] =
    settings[APP_CONFIG.SETTING_KEYS.REPLY_TO_EMAIL] || '';
  return context;
}

function getMailTemplates_() {
  var sheet = getRequiredSheet_(APP_CONFIG.SHEETS.MAIL_TEMPLATES);
  var headerMap = getHeaderMap_(sheet);
  assertHeaders_(
    headerMap,
    APP_CONFIG.MAIL_TEMPLATE_HEADER_ORDER,
    APP_CONFIG.SHEETS.MAIL_TEMPLATES
  );
  var templates = {};
  if (sheet.getLastRow() < APP_CONFIG.DATA_START_ROW) {
    return templates;
  }
  var values = sheet
    .getRange(
      APP_CONFIG.DATA_START_ROW,
      APP_CONFIG.FIRST_COLUMN,
      sheet.getLastRow() - APP_CONFIG.HEADER_ROW,
      sheet.getLastColumn()
    )
    .getDisplayValues();
  values.forEach(function (row) {
    var key = String(
      row[headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.KEY] - 1] || ''
    ).trim();
    if (!key) {
      return;
    }
    if (Object.prototype.hasOwnProperty.call(templates, key)) {
      throw new Error(APP_CONFIG.TEXT.MAIL_TEMPLATE_DUPLICATE_PREFIX + key);
    }
    templates[key] =
      row[headerMap[APP_CONFIG.MAIL_TEMPLATE_HEADERS.VALUE] - 1];
  });
  return templates;
}

function requireMailTemplate_(templates, key) {
  if (
    !Object.prototype.hasOwnProperty.call(templates, key) ||
    !String(templates[key]).trim()
  ) {
    throw new Error(APP_CONFIG.TEXT.MAIL_TEMPLATE_MISSING_PREFIX + key);
  }
  return templates[key];
}

function renderMailTemplate_(template, context) {
  var rendered = String(template);
  Object.keys(context).forEach(function (name) {
    rendered = rendered.split('{{' + name + '}}').join(String(context[name]));
  });
  var unresolved = rendered.match(/{{[^{}]+}}/g);
  if (unresolved) {
    throw new Error(
      APP_CONFIG.TEXT.MAIL_TEMPLATE_UNRESOLVED_PREFIX +
        unresolved.join(', ')
    );
  }
  return rendered;
}

function formatReceptionTime_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(
      value,
      APP_CONFIG.TIME_ZONE,
      APP_CONFIG.TIME_FORMAT
    );
  }
  return String(value || '');
}

function isPaymentStatusPaidEdit_(e) {
  if (!e || !e.range || e.range.getNumRows() !== 1 ||
      e.range.getNumColumns() !== 1) {
    return false;
  }
  var sheet = e.range.getSheet();
  if (
    sheet.getName() !== APP_CONFIG.SHEETS.APPLICATIONS ||
    e.range.getRow() < APP_CONFIG.DATA_START_ROW
  ) {
    return false;
  }
  var headerMap = getHeaderMap_(sheet);
  return (
    e.range.getColumn() ===
      headerMap[APP_CONFIG.APPLICATION_HEADERS.PAYMENT_STATUS] &&
    String(e.value || '') === APP_CONFIG.PAYMENT_STATUS.PAID &&
    String(e.value || '') !== String(e.oldValue || '')
  );
}

function handlePaymentStatusPaidEdit_(e) {
  var rowNumber = e.range.getRow();
  var application = getApplicationByRow_(rowNumber);
  try {
    sendPaymentConfirmationMail_(application);
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.PAYMENT_CONFIRMATION_MAIL,
      application[APP_CONFIG.APPLICATION_HEADERS.APPLICATION_ID],
      APP_CONFIG.TEXT.PAYMENT_CONFIRMATION_MAIL_SENT,
      ''
    );
  } catch (error) {
    var normalized = normalizeError_(error);
    appendLog_(
      APP_CONFIG.LOG_LEVEL.ERROR,
      APP_CONFIG.PROCESS.PAYMENT_CONFIRMATION_MAIL,
      application[APP_CONFIG.APPLICATION_HEADERS.APPLICATION_ID],
      APP_CONFIG.TEXT.PAYMENT_CONFIRMATION_MAIL_FAILED,
      normalized.detail || normalized.message
    );
    showUiAlert_(
      APP_CONFIG.TEXT.PAYMENT_CONFIRMATION_MAIL_FAILED +
        ' ' +
        normalized.message
    );
    throw error;
  }
}

function resendConfirmationMailForActiveRow() {
  try {
    var rowNumber = getActiveApplicationRow_();
    var application = getApplicationByRow_(rowNumber);
    sendConfirmationMail_(application);
    updateApplicationFields_(rowNumber, (function () {
      var updates = {};
      updates[APP_CONFIG.APPLICATION_HEADERS.MAIL_STATUS] =
        APP_CONFIG.MAIL_STATUS.SENT;
      return updates;
    })());
    appendLog_(
      APP_CONFIG.LOG_LEVEL.INFO,
      APP_CONFIG.PROCESS.RESEND_MAIL,
      application[APP_CONFIG.APPLICATION_HEADERS.APPLICATION_ID],
      APP_CONFIG.TEXT.MAIL_RESEND_LOG,
      ''
    );
    showUiAlert_(APP_CONFIG.UI_MESSAGES.MAIL_RESENT);
  } catch (error) {
    handleManualActionError_(
      error,
      APP_CONFIG.PROCESS.RESEND_MAIL,
      APP_CONFIG.APPLICATION_HEADERS.MAIL_STATUS,
      APP_CONFIG.MAIL_STATUS.ERROR
    );
  }
}
