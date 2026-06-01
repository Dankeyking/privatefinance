// =============================================================================
//  config.example.js  —  Vorlage für deine Enable-Banking-/Konto-Konfiguration
// =============================================================================
//
//  ANLEITUNG (Deutsch):
//
//  1. Kopiere diese Datei zu  config.js   (config.js ist in .gitignore und
//     wird NICHT committet – deine IBANs/UIDs bleiben privat).
//
//        cp config.example.js config.js
//
//  2. Lege die Zugangsdaten in  .env  an (siehe .env.example):
//        ENABLEBANKING_APP_ID  und  ENABLEBANKING_KEY_PATH
//     Diese bekommst du nach Registrierung einer Anwendung unter
//     https://enablebanking.com/  ->  "Applications" (inkl. .pem-Schlüssel).
//
//  3. Verbinde deine C24-Konten (Session) – siehe README.md, Schritt 3.
//     Danach liefert  POST /sessions  die Konto-UIDs deiner Konten.
//
//  4. Trage unten je Konto die Enable-Banking-"account uid" ein und ordne sie
//     der Rolle im Haushalt zu:
//        type: "joint"     -> Gemeinschaftskonto
//        type: "personal"  -> Privatkonto
//
//  Das Fetch-Skript (scripts/fetch-data.js) liest diese Datei und holt
//  Salden + Transaktionen je hinterlegtem Konto.
// =============================================================================

export const ACCOUNTS = [
  {
    id: 'joint',
    name: 'Gemeinschaftskonto',
    type: 'joint',
    owner: 'Duncan & Partner',
    // Enable-Banking account uid (aus POST /sessions bzw. setup-enablebanking.js)
    enableBankingAccountUid: 'REPLACE_ME_JOINT_ACCOUNT_UID',
  },
  {
    id: 'p1',
    name: 'Privatkonto Duncan',
    type: 'personal',
    owner: 'Duncan',
    enableBankingAccountUid: 'REPLACE_ME_PERSONAL_1_ACCOUNT_UID',
  },
  {
    id: 'p2',
    name: 'Privatkonto Partner',
    type: 'personal',
    owner: 'Partner',
    enableBankingAccountUid: 'REPLACE_ME_PERSONAL_2_ACCOUNT_UID',
  },
]

// Land + Bank (ASPSP) für die Verknüpfung (Session).
// C24: exakten Namen über  node scripts/setup-enablebanking.js aspsps  ermitteln.
export const ASPSP = {
  country: 'DE',
  // Beispiel-Platzhalter – echten Namen via "aspsps"-Befehl suchen:
  name: 'C24',
}
