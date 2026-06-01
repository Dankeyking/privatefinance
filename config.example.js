// =============================================================================
//  config.example.js  —  Vorlage für deine GoCardless-/Konto-Konfiguration
// =============================================================================
//
//  ANLEITUNG (Deutsch):
//
//  1. Kopiere diese Datei zu  config.js   (config.js ist in .gitignore und
//     wird NICHT committet – deine IBANs/IDs bleiben privat).
//
//        cp config.example.js config.js
//
//  2. Lege die Zugangsdaten in  .env  an (siehe .env.example):
//        GOCARDLESS_SECRET_ID  und  GOCARDLESS_SECRET_KEY
//     Diese bekommst du nach Registrierung unter
//     https://bankaccountdata.gocardless.com/  ->  "User Secrets".
//
//  3. Verbinde deine C24-Konten (Requisition) – siehe README.md, Schritt 3.
//     Danach liefert  GET /requisitions/  die Account-IDs deiner Konten.
//
//  4. Trage unten je Konto die GoCardless-"account id" ein und ordne sie
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
    // GoCardless account id (UUID aus GET /accounts/ bzw. /requisitions/)
    gocardlessAccountId: 'REPLACE_ME_JOINT_ACCOUNT_ID',
  },
  {
    id: 'p1',
    name: 'Privatkonto Duncan',
    type: 'personal',
    owner: 'Duncan',
    gocardlessAccountId: 'REPLACE_ME_PERSONAL_1_ACCOUNT_ID',
  },
  {
    id: 'p2',
    name: 'Privatkonto Partner',
    type: 'personal',
    owner: 'Partner',
    gocardlessAccountId: 'REPLACE_ME_PERSONAL_2_ACCOUNT_ID',
  },
]

// Land + Institution für die Bank-Verknüpfung (Requisition).
// C24 Bank: Institution-ID über GET /institutions/?country=de ermitteln.
export const INSTITUTION = {
  country: 'DE',
  // Beispiel-Platzhalter – echte ID via /institutions/?country=de suchen:
  institutionId: 'C24_XXXXXXXX',
}
