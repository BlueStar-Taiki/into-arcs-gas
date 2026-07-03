/**
 * 星空撮影イベント申し込み管理の固定値。
 * シート名、ヘッダー名、ステータス名、固定文言はこのファイルに集約する。
 */
var APP_CONFIG = Object.freeze({
  TIME_ZONE: 'Asia/Tokyo',
  MENU_NAME: 'INTO-ARCS管理',
  MENU_ITEMS: Object.freeze({
    SETUP: '初期設定を実行',
    UPDATE_FORM_CHOICES: 'フォーム候補日を更新',
    REGISTER_CALENDAR: '開催枠をカレンダー登録',
    NOTIFY_DISCORD: '開催枠Discord通知を確認・送信',
    RESEND_MAIL: '選択行に確認メール再送'
  }),
  SHEETS: Object.freeze({
    RESPONSES: 'フォームの回答 1',
    APPLICATIONS: '申込管理',
    EVENT_DATES: '開催日管理',
    MAIL_TEMPLATES: 'メールテンプレート',
    SETTINGS: '設定',
    LOGS: 'ログ'
  }),
  FORM_ITEMS: Object.freeze({
    APPLICATION_DATE: '申し込み日時'
  }),
  RESPONSE_HEADERS: Object.freeze({
    TIMESTAMP: 'タイムスタンプ',
    NAME: 'お名前',
    PARTICIPANTS: '参加人数',
    EMERGENCY_PHONE: '緊急連絡先電話番号',
    EMAIL: 'メールアドレス',
    APPLICATION_DATE: '申し込み日時',
    TITLE: 'タイトル',
    EVENT_SLOT_KEY: '開催枠キー'
  }),
  RESPONSE_HEADER_ORDER: Object.freeze([
    'タイムスタンプ',
    'お名前',
    '参加人数',
    '緊急連絡先電話番号',
    'メールアドレス',
    '申し込み日時',
    'タイトル',
    '開催枠キー'
  ]),
  APPLICATION_HEADERS: Object.freeze({
    APPLICATION_ID: '申込ID',
    RECEIVED_AT: '受付日時',
    NAME: 'お名前',
    PARTICIPANTS: '参加人数',
    EMERGENCY_PHONE: '緊急連絡先電話番号',
    EMAIL: 'メールアドレス',
    STATUS: 'ステータス',
    MAIL_STATUS: 'メール送信状況',
    INTERNAL_NOTE: '内部メモ',
    UPDATED_AT: '最終更新日時',
    APPLICATION_DATE: '申し込み日時',
    TITLE: 'タイトル',
    EVENT_SLOT_KEY: '開催枠キー'
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
    '内部メモ',
    '最終更新日時',
    '申し込み日時',
    'タイトル',
    '開催枠キー'
  ]),
  SETTINGS_HEADERS: Object.freeze({
    KEY: 'キー',
    VALUE: '値',
    DESCRIPTION: '説明'
  }),
  SETTINGS_HEADER_ORDER: Object.freeze(['キー', '値', '説明']),
  EVENT_DATE_HEADERS: Object.freeze({
    APPLICATION_DATE: '申し込み日時',
    TITLE: 'タイトル',
    CAPACITY: '定員',
    MINIMUM_PARTICIPANTS: '最小催行人数',
    WAITLIST_CAPACITY: 'キャンセル待ち上限',
    PRICE_PER_PERSON: '一人当たりの料金',
    RECEPTION_START_TIME: '受付開始時間',
    EVENT_MAIL_STATUS: '開催メール',
    RECRUITMENT_STATUS: '募集状況',
    EXECUTION_STATUS: '実施状況',
    FINAL_PARTICIPANTS: '最終参加人数',
    GUIDE_FEE: 'ガイド謝金',
    ASSIGNEE: '担当',
    PARTICIPATING: '参加',
    WAITLISTED: 'キャンセル待ち',
    CANCELED: 'キャンセル',
    DECLINED: 'お断り',
    TOTAL_APPLICATION_PARTICIPANTS: '申し込み人数',
    EVENT_ID: 'イベントID',
    ATTENDANCE_STATUS: '勤怠登録状況',
    ATTENDANCE_KEY: '勤怠登録キー',
    DISCORD_STATUS: 'Discord通知状況',
    CALENDAR_STATUS: 'カレンダー登録状況',
    INTERNAL_NOTE: '内部メモ'
  }),
  EVENT_DATE_HEADER_ORDER: Object.freeze([
    '申し込み日時',
    'タイトル',
    '定員',
    '最小催行人数',
    'キャンセル待ち上限',
    '一人当たりの料金',
    '受付開始時間',
    '開催メール',
    '募集状況',
    '実施状況',
    '最終参加人数',
    'ガイド謝金',
    '担当',
    '参加',
    'キャンセル待ち',
    'キャンセル',
    'お断り',
    '申し込み人数',
    'Discord通知状況',
    'カレンダー登録状況',
    'イベントID',
    '内部メモ',
    '勤怠登録状況',
    '勤怠登録キー'
  ]),
  MAIL_TEMPLATE_HEADERS: Object.freeze({
    KEY: 'キー',
    VALUE: '値',
    DESCRIPTION: '説明'
  }),
  MAIL_TEMPLATE_HEADER_ORDER: Object.freeze(['キー', '値', '説明']),
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
  EVENT_APPLICATION_STATUS: Object.freeze({
    PARTICIPATING: '参加',
    WAITLISTED: 'キャンセル待ち',
    CANCELED: 'キャンセル',
    DECLINED: 'お断り'
  }),
  EVENT_APPLICATION_STATUS_OPTIONS: Object.freeze([
    '参加',
    'キャンセル待ち',
    'キャンセル',
    'お断り'
  ]),
  RECRUITMENT_STATUS: Object.freeze({
    OPEN: '募集中',
    CLOSED: '募集終了',
    CANCELED: 'キャンセル'
  }),
  RECRUITMENT_STATUS_OPTIONS: Object.freeze([
    '募集中',
    '募集終了',
    'キャンセル'
  ]),
  EXECUTION_STATUS: Object.freeze({
    RAIN_CANCELED: '雨天中止',
    INSUFFICIENT_CANCELED: '人数不足で中止',
    CONFIRMED: '開催決定',
    COMPLETED: '開催済み'
  }),
  EXECUTION_STATUS_OPTIONS: Object.freeze([
    '雨天中止',
    '人数不足で中止',
    '開催決定',
    '開催済み'
  ]),
  EVENT_MAIL_STATUS: Object.freeze({
    UNSENT: '未送信',
    SENT: '送信済み',
    ERROR: '送信エラー'
  }),
  EVENT_MAIL_STATUS_OPTIONS: Object.freeze([
    '未送信',
    '送信済み',
    '送信エラー'
  ]),
  MAIL_STATUS: Object.freeze({
    UNSENT: '未送信',
    SENT: '送信済み',
    ERROR: '送信エラー'
  }),
  MAIL_STATUS_OPTIONS: Object.freeze(['未送信', '送信済み', '送信エラー']),
  DISCORD_STATUS: Object.freeze({
    UNNOTIFIED: '未通知',
    MINIMUM_NOTIFIED: '最小催行人数到達通知済み',
    WAITLIST_NOTIFIED: 'キャンセル待ち発生通知済み',
    BOTH_NOTIFIED: '両方通知済み',
    ERROR: '通知エラー'
  }),
  DISCORD_STATUS_OPTIONS: Object.freeze([
    '未通知',
    '最小催行人数到達通知済み',
    'キャンセル待ち発生通知済み',
    '両方通知済み',
    '通知エラー'
  ]),
  DISCORD_NOTIFICATION_TYPE: Object.freeze({
    MINIMUM: 'minimum',
    WAITLIST: 'waitlist'
  }),
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
    SYSTEM_SETUP: 'setupApplicationFormSystem',
    SETUP_CHECK: 'checkApplicationFormSetup',
    TRIGGER_INSTALL: 'installApplicationFormTriggers',
    TRIGGER_CLEANUP: 'removeDuplicateApplicationFormTriggers',
    SETUP_MIGRATION: 'removeDeprecatedApplicationColumns',
    CALENDAR_REGISTER: 'registerEventSlotsToCalendar',
    DISCORD_MILESTONES: 'notifyEventMilestones',
    EVENT_AGGREGATION: 'recalculateEventDateAggregates',
    FORM_CHOICES: 'updateApplicationFormChoices',
    FORM_SUBMIT: 'onFormSubmit',
    SEND_MAIL: 'sendConfirmationMail',
    RESEND_MAIL: 'resendConfirmationMailForActiveRow'
  }),
  SCRIPT_PROPERTIES: Object.freeze({
    DISCORD_WEBHOOK_URL: 'DISCORD_WEBHOOK_URL',
    APPLICATION_FORM_ID: 'APPLICATION_FORM_ID',
    CALENDAR_ID: 'CALENDAR_ID'
  }),
  REQUIRED_SCRIPT_PROPERTIES: Object.freeze([
    'DISCORD_WEBHOOK_URL',
    'APPLICATION_FORM_ID'
  ]),
  TRIGGERS: Object.freeze({
    FORM_SUBMIT_HANDLER: 'onFormSubmit'
  }),
  SETTING_KEYS: Object.freeze({
    EVENT_NAME: 'EVENT_NAME',
    CONTACT_NAME: 'CONTACT_NAME',
    REPLY_TO_EMAIL: 'REPLY_TO_EMAIL',
    DISCORD_MENTION: 'DISCORD_MENTION',
    CAPACITY_OVERBOOK_ALLOWANCE: 'CAPACITY_OVERBOOK_ALLOWANCE',
    LOW_REMAINING_THRESHOLD: 'LOW_REMAINING_THRESHOLD'
  }),
  INITIAL_SETTINGS: Object.freeze([
    Object.freeze(['EVENT_NAME', '星空撮影イベント', 'メール・通知に表示するイベント名']),
    Object.freeze(['CONTACT_NAME', 'INTO-ARCS', '確認メールに表示する主催者名']),
    Object.freeze(['REPLY_TO_EMAIL', '', '確認メールの返信先（空欄の場合は指定しない）']),
    Object.freeze(['DISCORD_MENTION', '', 'Discord通知の先頭に付けるメンション（任意）']),
    Object.freeze(['CAPACITY_OVERBOOK_ALLOWANCE', '2', '新規申込を参加扱いにできる定員超過の許容人数']),
    Object.freeze(['LOW_REMAINING_THRESHOLD', '4', 'フォーム候補で「残りわずか」と表示する残席数のしきい値'])
  ]),
  MAIL_TEMPLATE_KEYS: Object.freeze({
    APPLICATION_PARTICIPATION_SUBJECT: 'application_participation_subject',
    APPLICATION_PARTICIPATION_BODY: 'application_participation_body',
    APPLICATION_WAITLIST_SUBJECT: 'application_waitlist_subject',
    APPLICATION_WAITLIST_BODY: 'application_waitlist_body',
    APPLICATION_DECLINED_SUBJECT: 'application_declined_subject',
    APPLICATION_DECLINED_BODY: 'application_declined_body',
    EVENT_CONFIRMED_SUBJECT: 'event_confirmed_subject',
    EVENT_CONFIRMED_BODY: 'event_confirmed_body',
    EVENT_RAIN_CANCEL_SUBJECT: 'event_rain_cancel_subject',
    EVENT_RAIN_CANCEL_BODY: 'event_rain_cancel_body',
    EVENT_INSUFFICIENT_CANCEL_SUBJECT: 'event_insufficient_cancel_subject',
    EVENT_INSUFFICIENT_CANCEL_BODY: 'event_insufficient_cancel_body',
    EVENT_COMPLETED_SUBJECT: 'event_completed_subject',
    EVENT_COMPLETED_BODY: 'event_completed_body'
  }),
  MAIL_PLACEHOLDERS: Object.freeze({
    NAME: 'お名前',
    APPLICATION_DATE: '申し込み日時',
    TITLE: 'タイトル',
    PARTICIPANTS: '参加人数',
    PRICE_PER_PERSON: '一人当たりの料金',
    TOTAL_PRICE: '合計料金',
    RECEPTION_START_TIME: '受付開始時間',
    STATUS: 'ステータス',
    CONTACT_NAME: '主催者名',
    REPLY_TO_EMAIL: '返信先メール'
  }),
  INITIAL_MAIL_TEMPLATES: Object.freeze([
    Object.freeze(['application_participation_subject', '【{{タイトル}}】参加受付のお知らせ', '参加受付メール件名']),
    Object.freeze(['application_participation_body', '{{お名前}} 様\n\n{{申し込み日時}}の{{タイトル}}を「参加」で受け付けました。\n参加人数: {{参加人数}}名\n合計料金: {{合計料金}}円\n受付開始時間: {{受付開始時間}}\n\n{{主催者名}}', '参加受付メール本文']),
    Object.freeze(['application_waitlist_subject', '【{{タイトル}}】キャンセル待ち受付のお知らせ', 'キャンセル待ち受付メール件名']),
    Object.freeze(['application_waitlist_body', '{{お名前}} 様\n\n{{申し込み日時}}の{{タイトル}}を「キャンセル待ち」で受け付けました。\n参加人数: {{参加人数}}名\n\n空きが出た場合にご案内します。\n{{主催者名}}', 'キャンセル待ち受付メール本文']),
    Object.freeze(['application_declined_subject', '【{{タイトル}}】お申し込みについて', 'お断りメール件名']),
    Object.freeze(['application_declined_body', '{{お名前}} 様\n\n{{申し込み日時}}の{{タイトル}}は定員およびキャンセル待ち上限に達したため、今回はお受けできませんでした。\n\n{{主催者名}}', 'お断りメール本文']),
    Object.freeze(['event_confirmed_subject', '【{{タイトル}}】開催決定のお知らせ', '開催決定メール件名']),
    Object.freeze(['event_confirmed_body', '{{お名前}} 様\n\n{{申し込み日時}}の{{タイトル}}は開催決定となりました。\n受付開始時間: {{受付開始時間}}\n\n{{主催者名}}', '開催決定メール本文']),
    Object.freeze(['event_rain_cancel_subject', '【{{タイトル}}】雨天中止のお知らせ', '雨天中止メール件名']),
    Object.freeze(['event_rain_cancel_body', '{{お名前}} 様\n\n{{申し込み日時}}の{{タイトル}}は雨天のため中止となりました。\n\n{{主催者名}}', '雨天中止メール本文']),
    Object.freeze(['event_insufficient_cancel_subject', '【{{タイトル}}】開催中止のお知らせ', '人数不足中止メール件名']),
    Object.freeze(['event_insufficient_cancel_body', '{{お名前}} 様\n\n{{申し込み日時}}の{{タイトル}}は最小催行人数に達しなかったため中止となりました。\n\n{{主催者名}}', '人数不足中止メール本文']),
    Object.freeze(['event_completed_subject', '【{{タイトル}}】開催終了のお知らせ', '開催済みメール件名']),
    Object.freeze(['event_completed_body', '{{お名前}} 様\n\n{{タイトル}}へご参加いただきありがとうございました。\n\n{{主催者名}}', '開催済みメール本文'])
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
  DISCORD_EVENT: Object.freeze({
    LABEL_TITLE: 'タイトル',
    LABEL_APPLICATION_DATE: '申し込み日時',
    LABEL_PARTICIPATING: '参加人数',
    LABEL_MINIMUM_PARTICIPANTS: '最小催行人数',
    LABEL_WAITLISTED: 'キャンセル待ち人数',
    LABEL_CAPACITY: '定員',
    LABEL_RECRUITMENT_STATUS: '募集状況',
    PEOPLE_SUFFIX: '人'
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
    REQUIRED_PROPERTIES_MISSING_PREFIX: '必須の Script Properties が不足しています: ',
    SYSTEM_SETUP_COMPLETE: '初回セットアップが完了しました。',
    SYSTEM_SETUP_FAILED: '初回セットアップに失敗しました。',
    TRIGGER_CREATED: 'onFormSubmit のフォーム送信トリガーを作成しました。',
    TRIGGER_EXISTS: 'onFormSubmit のフォーム送信トリガーは既に存在します。',
    TRIGGER_CLEANUP_NONE: '重複する onFormSubmit トリガーはありません。',
    TRIGGER_CLEANUP_COMPLETE_PREFIX: '重複する onFormSubmit トリガーを削除しました。削除数: ',
    SETUP_CHECK_OK: 'セットアップ点検に問題はありません。',
    SETUP_CHECK_NG: 'セットアップ点検で不足または不整合が見つかりました。',
    SETUP_CHECK_WARNING: 'セットアップ点検に警告があります。',
    EVENT_SLOT_NOT_FOUND_PREFIX: '開催日管理に一致する開催枠がありません: ',
    EVENT_SLOT_DUPLICATE_PREFIX: '開催日管理に同じ日時・タイトルの開催枠が複数あります: ',
    EVENT_SLOT_INVALID: '開催枠の日時、タイトル、定員、キャンセル待ち上限を確認してください。',
    PARTICIPANTS_INVALID: '参加人数は1以上の整数で入力してください。',
    MAIL_TEMPLATE_MISSING_PREFIX: 'メールテンプレートがありません: ',
    MAIL_TEMPLATE_DUPLICATE_PREFIX: 'メールテンプレートのキーが重複しています: ',
    MAIL_TEMPLATE_UNRESOLVED_PREFIX: 'メールテンプレートに未解決の差し込みがあります: ',
    FORM_ITEM_MISSING_PREFIX: 'Googleフォームに対象のプルダウン項目がありません: ',
    FORM_ITEM_DUPLICATE_PREFIX: 'Googleフォームに同名のプルダウン項目が複数あります: ',
    FORM_CHOICES_EMPTY: '募集中の開催枠がないため、フォーム候補は更新しませんでした。',
    FORM_CHOICES_UPDATED: 'Googleフォームの申し込み日時候補を更新しました。',
    EVENT_AGGREGATION_COMPLETE: '開催日管理の人数集計を更新しました。',
    RESPONSE_APPLICATION_DATE_REQUIRED: 'Googleフォームに「申し込み日時」プルダウンを追加し、回答シートに同名ヘッダーが作成されてからsetupを再実行してください。',
    APPLICATION_MAIL_STATUS_UNSUPPORTED_PREFIX: '申込時メールの対象外ステータスです: ',
    SETTING_NON_NEGATIVE_INTEGER_PREFIX: '設定値は0以上の整数で入力してください: ',
    DEPRECATED_APPLICATION_COLUMNS_REMOVED_PREFIX: '申込管理から廃止列を削除しました: ',
    OPTIONAL_CALENDAR_ID_MISSING: '任意機能の Script Properties が未設定です: CALENDAR_ID',
    CALENDAR_NOT_FOUND: 'CALENDAR_ID に対応するGoogleカレンダーを取得できません。',
    CALENDAR_EVENT_INVALID_PREFIX: 'カレンダー登録に必要な日時またはタイトルが不正です。行: ',
    CALENDAR_REGISTERED_PREFIX: '開催枠をカレンダーへ登録しました。行: ',
    CALENDAR_REGISTER_ERROR_PREFIX: '開催枠のカレンダー登録に失敗しました。行: ',
    CALENDAR_DELETED_PREFIX: 'キャンセルされた開催枠をカレンダーから削除しました。行: ',
    CALENDAR_DELETE_ERROR_PREFIX: 'キャンセルされた開催枠のカレンダー削除に失敗しました。行: ',
    CALENDAR_REGISTER_COMPLETE: '開催枠のカレンダー登録処理が完了しました。',
    DISCORD_MINIMUM_TITLE: '星空撮影イベントが最小催行人数に到達しました',
    DISCORD_WAITLIST_TITLE: '星空撮影イベントの申し込みフォームがキャンセル待ちになりました',
    DISCORD_MILESTONE_COMPLETE: '開催枠のDiscord通知判定が完了しました。',
    DISCORD_MILESTONE_ERROR_PREFIX: '開催枠のDiscord通知に失敗しました。行: '
  }),
  FORM_CHOICE: Object.freeze({
    DATE_FORMAT: 'yyyy/MM/dd HH:mm',
    REMAINING_PREFIX: '【残り',
    REMAINING_SUFFIX: '人】',
    LOW_REMAINING_LABEL: '【残りわずか】',
    WAITLIST_LABEL: '【キャンセル待ち】',
    REMAINING_SUFFIX_PATTERN: '(?:【残り\\d+人(?:・キャンセル待ち)?】|【残りわずか】|【キャンセル待ち】)$'
  }),
  FORMULA_GUARD_PREFIXES: Object.freeze(['=', '+', '-', '@']),
  DEPRECATED_APPLICATION_HEADERS: Object.freeze([
    'Discord通知状況',
    'カレンダー登録状況',
    'イベントID'
  ]),
  APPLICATION_ID_PREFIX: 'STAR',
  DATE_FORMAT: 'yyyy/MM/dd HH:mm:ss',
  TIME_FORMAT: 'HH:mm',
  CALENDAR_EVENT_DURATION_HOURS: 2,
  HEADER_ROW: 1,
  FIRST_COLUMN: 1,
  DATA_START_ROW: 2,
  VALIDATION_ROW_COUNT: 1000
});
