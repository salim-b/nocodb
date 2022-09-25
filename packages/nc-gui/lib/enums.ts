export enum Role {
  Super = 'super',
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

export enum ProjectRole {
  Owner = 'owner',
  Creator = 'creator',
  Editor = 'editor',
  Commenter = 'commenter',
  Viewer = 'viewer',
}

export enum ClientType {
  MYSQL = 'mysql2',
  MSSQL = 'mssql',
  PG = 'pg',
  SQLITE = 'sqlite3',
  VITESS = 'vitess',
}

export enum Language {
  ar = 'العربية',
  bn_IN = 'বাংলা',
  da = 'Dansk',
  de = 'Deutsch',
  en = 'English',
  es = 'Español',
  fa = 'فارسی',
  fi = 'Suomalainen',
  fr = 'Français',
  he = 'עִברִית',
  hi = 'हिन्दी',
  hr = 'Hrvatski',
  id = 'Bahasa Indonesia',
  it = 'Italiano',
  ja = '日本語',
  ko = '한국인',
  lv = 'Latviešu',
  nl = 'Nederlandse',
  no = 'Norsk',
  pl = 'Polski',
  pt = 'Português',
  pt_BR = 'Português (Brasil)',
  ru = 'Pусский',
  sl = 'Slovenščina',
  sv = 'Svenska',
  th = 'ไทย',
  tr = 'Türk',
  uk = 'Українська',
  vi = 'Tiếng Việt',
  'zh-Hans' = '简体中文',
  'zh-Hant' = '繁體中文',
}

export enum NavigateDir {
  NEXT,
  PREV,
}

export enum LockType {
  Personal = 'personal',
  Locked = 'locked',
  Collaborative = 'collaborative',
}

export enum DataSourcesSubTab {
  New = 'New',
  Metadata = 'Metadata',
  ERD = 'ERD',
  UIAcl = 'UI ACL',
  Misc = 'Misc',
  Edit = 'Edit',
}
