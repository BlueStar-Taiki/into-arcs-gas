function sendConfirmationMail_(application) {
  var headers = APP_CONFIG.APPLICATION_HEADERS;
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
  MailApp.sendEmail(options);
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
