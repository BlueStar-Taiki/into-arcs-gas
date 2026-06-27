/**
 * 星空撮影イベント申し込み管理の固定値。
 * シート名、ヘッダー名、ステータス名、固定文言はこのファイルに集約する。
 */
var APP_CONFIG = Object.freeze({
  TIME_ZONE: 'Asia/Tokyo',
  MENU_NAME: 'INTO-ARCS管理',
  MENU_ITEMS: Object.freeze({
    SETUP: '初期設定を実行',
    RESEND_MAIL: '選択行に確認メール再送',
    RENOTIFY_DISCORD: '選択行をDiscord再通知'
  }),
  SHEETS: Object.freeze({
    RESPONSES: 'フォームの回答 1',
    APPLICATIONS: '申込管理',
    SETTINGS: '設定',
    LOGS: 'ログ'
  }),
  RESPONSE_HEADERS: Object.freeze({
    TIMESTAMP: 'タイムスタンプ',
    NAME: 'お名前',
    PARTICIPANTS: '参加人数',
    EMERGENCY_PHONE: '緊急連絡先電話番号',
    EMAIL: 'メールアドレス'
  }),
  APPLICATION_HEADERS: Object.freeze({
    APPLICATION_ID: '申込ID',
    RECEIVED_AT: '受付日時',
    NAME: 'お名前',
    PARTICIPANTS: '参加人数',
    EMERGENCY_PHONE: '緊急連絡先電話番号',
    EMAIL: 'メールアドレス',
    STATUS: 'ステータス',
    MAIL_STATUS: 'メール送信状況',
    DISCORD_STATUS: 'Discord通知状況',
    CALENDAR_STATUS: 'カレンダー登録状況',
    EVENT_ID: 'イベントID',
    INTERNAL_NOTE: '内部メモ',
    UPDATED_AT: '最終更新日時'
  }),
  APPLICATION_HEADER_ORDER: Object.freeze([
    '申込ID',
    '受付日時',
    'お名前',
    '参加人数',
    '緊急連絡先電話番号',
    'メールアドレス',
    'ステータス',
    'メール送信状況',
    'Discord通知状況',
    'カレンダー登録状況',
    'イベントID',
    '内部メモ',
    '最終更新日時'
  ]),
  SETTINGS_HEADERS: Object.freeze({
    KEY: 'キー',
    VALUE: '値',
    DESCRIPTION: '説明'
  }),
  SETTINGS_HEADER_ORDER: Object.freeze(['キー', '値', '説明']),
  LOG_HEADERS: Object.freeze({
    AT: '日時',
    LEVEL: 'レベル',
    PROCESS: '処理名',
    APPLICATION_ID: '申込ID',
    MESSAGE: 'メッセージ',
    DETAIL: '詳細'
  }),
  LOG_HEADER_ORDER: Object.freeze([
    '日時',
    'レベル',
    '処理名',
    '申込ID',
    'メッセージ',
    '詳細'
  ]),
  STATUS: Object.freeze({
    NEW: '新規受付',
    CHECKING: '確認中',
    CONFIRMED: '予約確定',
    CANCELED: 'キャンセル',
    NO_ACTION: '対応不要'
  }),
  STATUS_OPTIONS: Object.freeze([
    '新規受付',
    '確認中',
    '予約確定',
    'キャンセル',
    '対応不要'
  ]),
  MAIL_STATUS: Object.freeze({
    UNSENT: '未送信',
    SENT: '送信済み',
    ERROR: '送信エラー'
  }),
  MAIL_STATUS_OPTIONS: Object.freeze(['未送信', '送信済み', '送信エラー']),
  DISCORD_STATUS: Object.freeze({
    UNNOTIFIED: '未通知',
    NOTIFIED: '通知済み',
    ERROR: '通知エラー'
  }),
  DISCORD_STATUS_OPTIONS: Object.freeze(['未通知', '通知済み', '通知エラー']),
  CALENDAR_STATUS: Object.freeze({
    UNREGISTERED: '未登録',
    REGISTERED: '登録済み',
    ERROR: '登録エラー',
    DELETED: '削除済み'
  }),
  CALENDAR_STATUS_OPTIONS: Object.freeze([
    '未登録',
    '登録済み',
    '登録エラー',
    '削除済み'
  ]),
  LOG_LEVEL: Object.freeze({
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
  }),
  PROCESS: Object.freeze({
    SETUP: 'setupApplicationFormSheet',
    FORM_SUBMIT: 'onFormSubmit',
    SEND_MAIL: 'sendConfirmationMail',
    RESEND_MAIL: 'resendConfirmationMailForActiveRow',
    DISCORD: 'notifyDiscord',
    RENOTIFY_DISCORD: 'notifyDiscordForActiveRow'
  }),
  SCRIPT_PROPERTIES: Object.freeze({
    DISCORD_WEBHOOK_URL: 'DISCORD_WEBHOOK_URL'
  }),
  SETTING_KEYS: Object.freeze({
    EVENT_NAME: 'EVENT_NAME',
    CONTACT_NAME: 'CONTACT_NAME',
    REPLY_TO_EMAIL: 'REPLY_TO_EMAIL',
    DISCORD_MENTION: 'DISCORD_MENTION'
  }),
  INITIAL_SETTINGS: Object.freeze([
    Object.freeze(['EVENT_NAME', '星空撮影イベント', 'メール・通知に表示するイベント名']),
    Object.freeze(['CONTACT_NAME', 'INTO-ARCS', '確認メールに表示する主催者名']),
    Object.freeze(['REPLY_TO_EMAIL', '', '確認メールの返信先（空欄の場合は指定しない）']),
    Object.freeze(['DISCORD_MENTION', '', 'Discord通知の先頭に付けるメンション（任意）'])
  ]),
  MAIL: Object.freeze({
    SUBJECT_PREFIX: '【INTO-ARCS】',
    SUBJECT_SUFFIX: ' お申し込み受付のお知らせ',
    GREETING_SUFFIX: ' 様',
    BODY_INTRO: 'お申し込みありがとうございます。以下の内容で受け付けました。',
    BODY_NOTICE: '内容を確認後、担当者よりご案内いたします。',
    LABEL_APPLICATION_ID: '申込ID',
    LABEL_EVENT_NAME: 'イベント',
    LABEL_PARTICIPANTS: '参加人数',
    PARTICIPANTS_SUFFIX: '名'
  }),
  DISCORD: Object.freeze({
    TITLE: '星空撮影イベントに新しい申し込みがありました',
    COLOR: 3447003,
    LABEL_APPLICATION_ID: '申込ID',
    LABEL_RECEIVED_AT: '受付日時',
    LABEL_NAME: 'お名前',
    LABEL_PARTICIPANTS: '参加人数',
    PARTICIPANTS_SUFFIX: '名',
    FOOTER: 'INTO-ARCS 申込管理'
  }),
  UI_MESSAGES: Object.freeze({
    SETUP_COMPLETE: '初期設定が完了しました。',
    SELECT_APPLICATION_ROW: '申込管理シートのデータ行を1行選択してください。',
    MAIL_RESENT: '確認メールを再送しました。',
    DISCORD_RENOTIFIED: 'Discordへ再通知しました。',
    ERROR_PREFIX: 'エラー: '
  }),
  TEXT: Object.freeze({
    NO_SPREADSHEET: '対象スプレッドシートを取得できません。コンテナバインド型GASとして実行してください。',
    SHEET_MISSING_PREFIX: '必要なシートがありません: ',
    HEADER_MISSING_PREFIX: 'ヘッダーがありません: ',
    HEADER_DUPLICATE_PREFIX: 'ヘッダーが重複しています: ',
    REQUIRED_HEADERS_INFIX: ' に必要なヘッダーがありません: ',
    FORM_VALUE_MISSING_PREFIX: 'フォーム回答に項目がありません: ',
    UNKNOWN_ERROR: '不明なエラー',
    NO_FORM_EVENT: 'フォーム送信イベントがありません。手動実行はできません。',
    UNEXPECTED_EVENT_SHEET: '想定外のシートからフォーム送信イベントを受信しました。',
    FORM_PROCESS_COMPLETE: 'フォーム申込の転記と通知処理が完了しました。',
    SETUP_LOG_COMPLETE: 'シート初期設定が完了しました。',
    RESPONSE_SHEET_NOT_LINKED: 'フォーム回答シートがありません。フォームとの回答先連携を先に行ってください: ',
    UNSAFE_EXISTING_SHEET_INFIX: ' の既存データ構成を安全に更新できません。ヘッダーを確認してください。',
    APPLICATION_TARGET_MISSING_PREFIX: '申込管理シートに転記先ヘッダーがありません: ',
    UPDATE_TARGET_MISSING_PREFIX: '更新対象ヘッダーがありません: ',
    EMAIL_EMPTY: 'メールアドレスが空です。',
    MAIL_RESEND_LOG: '確認メールを再送しました。',
    SCRIPT_PROPERTY_MISSING_PREFIX: 'Script Properties に ',
    SCRIPT_PROPERTY_MISSING_SUFFIX: ' が設定されていません。',
    DISCORD_HTTP_ERROR_PREFIX: 'Discord通知に失敗しました。HTTP ',
    DISCORD_RENOTIFY_LOG: 'Discordへ再通知しました。'
  }),
  FORMULA_GUARD_PREFIXES: Object.freeze(['=', '+', '-', '@']),
  APPLICATION_ID_PREFIX: 'STAR',
  DATE_FORMAT: 'yyyy/MM/dd HH:mm:ss',
  HEADER_ROW: 1,
  FIRST_COLUMN: 1,
  DATA_START_ROW: 2,
  VALIDATION_ROW_COUNT: 1000
});
