function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(APP_CONFIG.MENU_NAME)
    .addItem(APP_CONFIG.MENU_ITEMS.SETUP, 'runSetupFromMenu')
    .addItem(
      APP_CONFIG.MENU_ITEMS.UPDATE_FORM_CHOICES,
      'updateApplicationFormChoices'
    )
    .addSeparator()
    .addItem(
      APP_CONFIG.MENU_ITEMS.RESEND_MAIL,
      'resendConfirmationMailForActiveRow'
    )
    .addToUi();
}

function runSetupFromMenu() {
  try {
    setupApplicationFormSystem();
    showUiAlert_(APP_CONFIG.UI_MESSAGES.SETUP_COMPLETE);
  } catch (error) {
    showUiAlert_(
      APP_CONFIG.UI_MESSAGES.ERROR_PREFIX + normalizeError_(error).message
    );
    throw error;
  }
}

function handleManualActionError_(error, processName, statusHeader, errorStatus) {
  var applicationId = '';
  try {
    var rowNumber = getActiveApplicationRow_();
    var application = getApplicationByRow_(rowNumber);
    applicationId =
      application[APP_CONFIG.APPLICATION_HEADERS.APPLICATION_ID] || '';
    var updates = {};
    updates[statusHeader] = errorStatus;
    updateApplicationFields_(rowNumber, updates);
  } catch (selectionError) {
    // 選択行を特定できない場合は、元のエラーを優先してログ・表示する。
  }
  var normalized = normalizeError_(error);
  try {
    appendLog_(
      APP_CONFIG.LOG_LEVEL.ERROR,
      processName,
      applicationId,
      normalized.message,
      normalized.detail
    );
  } catch (logError) {
    console.error(logError);
  }
  showUiAlert_(APP_CONFIG.UI_MESSAGES.ERROR_PREFIX + normalized.message);
}
