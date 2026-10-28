// =============================================================================
//  palettes.js — fertige Farbpaletten für Oberfläche UND Diagramme
// =============================================================================
//  Warum es diese Datei gibt: die Oberfläche hing schon an CSS-Variablen, die
//  Diagramme aber an festen Hex-Werten in `components/charts/*.jsx`. Eine
//  Designänderung ging damit an den Diagrammen vorbei — eine fest
//  einprogrammierte helle Gitterfarbe leuchtete im dunklen Design weiß über
//  den Balken. Chart.js kann keine CSS-Variablen lesen, und
//  `getComputedStyle(...).getPropertyValue('--x')` gibt einen `color-mix()`
//  unaufgelöst als Text zurück. Deshalb ist hier das JS die Quelle der
//  Wahrheit: `applyPalette()` schreibt die Werte als CSS-Variablen für die
//  Oberfläche, und `tokens()` gibt dieselben Werte an die Diagramme.
//
//  Woher die Farben kommen: aus etablierten, aufeinander abgestimmten
//  Sammlungen, nicht geraten.
//    Everforest  https://github.com/sainnhe/everforest/blob/master/palette.md
//    Gruvbox     https://github.com/morhetz/gruvbox (colors/gruvbox.vim)
//    Nord        https://www.nordtheme.com/docs/colors-and-palettes
//    Catppuccin  https://github.com/catppuccin/palette (palette.json)
//    Melange     https://github.com/savq/melange-nvim (lua/melange/palettes/)
//    Flexoki     https://stephango.com/flexoki
//  Diese Vorlagen bringen sieben bis acht Farbtöne mit, die Oberfläche braucht
//  siebzehn Plätze (acht Kontofarben, neun Kategorien). Fehlende Zwischentöne
//  sind aus zwei Nachbartönen der jeweiligen Vorlage gemischt.
//
//  Flexoki ist die Ausnahme: sie bringt statt einzelner Töne eine
//  durchgehende Reihe von 100 bis 950 je Farbton mit. Dort ist nichts
//  gemischt — wo ein Wert die 4,5:1 verfehlte, steht die nächste Stufe
//  derselben Reihe (Ocker 600 → 800 im Hellen, Rot 400 → 200 im Dunklen).
//  Melange hat nur vier Stufen und keine hellere Rotvariante, deshalb ist
//  sein Rot im dunklen Design in der Helligkeit nachgezogen — dasselbe, was
//  bei Everforest und Gruvbox schon nötig war.
//
//  Jeder Wert, der als Text auf einer Fläche steht, ist auf mindestens 4,5:1
//  gegen Karte, Seitenhintergrund und Chipfläche gerechnet (WCGA 2.1, geprüft,
//  nicht geschätzt); Kontofarben und Kategorien sind Flächen und erreichen
//  mindestens 3:1. Was dabei herauskam, steht unten als fester Wert — es wird
//  zur Laufzeit nichts mehr nachgerechnet.
//
//  Grenzen, die keine Palette verschieben darf:
//    --neg = Ausgaben, immer rot
//    --pos = positive Beträge, immer grün — und damit auch die Kategorie
//            „Sparen“, die ihr Grün über categoryColor() bekommt
//    --info = der dritte Datenton, bewusst weder grün noch rot. Er trägt im
//            Balkendiagramm die Einnahmen (siehe IncomeExpenseBar: Sparen hat
//            dort das Grün bekommen, Einnahmen sind auf diesen Ton gewechselt)
//            und die Hinweisflächen.
//  Sparen ist in keiner Palette rot.
//
//  Die Palette „standard“ ist die gewohnte Ansicht. Ihre Flächen-, Rahmen- und
//  Textwerte stehen weiterhin in `index.css` und werden hier NICHT überschrieben
//  (`ui: null`); nur die Datenwerte kommen von hier. Ihre Töne sind dieselben
//  wie vorher, einige davon so weit nachgedunkelt bzw. aufgehellt, dass sie die
//  4,5:1 erreichen — Farbton und Sättigung sind geblieben.
//  Die Datenwerte (Kontofarben, Kategorien, Diagramm-Grundfarben) kommen für
//  jede Palette aus dieser Datei, damit sie nur an einer Stelle stehen.
// =============================================================================

export const PALETTE_PREF_KEY = 'theme:palette'
export const DEFAULT_PALETTE = 'standard'

// Reihenfolge der Kategorien wie in categories.js.
const CAT_IDS = ['Wohnen', 'Mobilität', 'Gesundheit', 'Versicherung', 'Freizeit', 'Technik', 'Sparen', 'Bargeld', 'Sonstiges']

const DATA = {
  // ---------- Standard — der Stand von vorher
  standard: {
    label: 'Standard',
    note: 'Indigo auf Weiß, wie bisher',
    ui: null,
    light: {
      card: '#ffffff',
      pos: '#117d39', neg: '#d32222', warn: '#a35a05', info: '#2462eb',
      series: ['#3b82f6', '#ec4899', '#0e9d6e', '#c07b08', '#8b5cf6', '#119b8b', '#ef4444', '#64748b'],
      cat: {
        Wohnen: '#2563eb', 'Mobilität': '#0891b2', Gesundheit: '#0d9488', Versicherung: '#7c3aed',
        Freizeit: '#db2777', Technik: '#6366f1', Sparen: '#169f48', Bargeld: '#b97e04',
        Sonstiges: '#64748b',
      },
      chart: {
        grid: 'rgba(148, 163, 184, 0.25)', tick: '#5e6d83', tooltipBg: '#0f172a',
        tooltipFg: '#ffffff', muted: 'rgba(148, 163, 184, 0.3)',
        defaultBorder: 'rgba(15, 23, 42, 0.08)',
      },
    },
    dark: {
      card: '#121c32',
      pos: '#34d399', neg: '#f87171', warn: '#fbbf24', info: '#6591f1',
      series: ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6', '#ef4444', '#66778e'],
      cat: {
        Wohnen: '#346eec', 'Mobilität': '#0891b2', Gesundheit: '#0d9488', Versicherung: '#8c52ef',
        Freizeit: '#db2777', Technik: '#6366f1', Sparen: '#16a34a', Bargeld: '#ca8a04',
        Sonstiges: '#66778e',
      },
      chart: {
        grid: 'rgba(148, 163, 184, 0.25)', tick: '#94a3b8', tooltipBg: '#0f172a',
        tooltipFg: '#ffffff', muted: 'rgba(148, 163, 184, 0.3)',
        defaultBorder: 'rgba(148, 163, 184, 0.15)',
      },
    },
  },
  // ---------- Everforest — Braun, Beige, Olivgrün
  everforest: {
    label: 'Everforest',
    note: 'Braun, Beige, Olivgrün',
    ui: {
      light: {
        content: '#EFEBD4', card: '#FDF6E3', surface2: '#F4F0D9', surfaceHover: '#f7f1dc',
        border: '#E0DCC7', borderStrong: '#BDC3AF', inputBg: '#FDF6E3', menuBg: '#FDF6E3',
        sidebarBg: '#2D353B', sidebarBg2: '#343F44', sidebarText: '#A6B0A0',
        sidebarTextActive: '#FDF6E3', text: '#4F585E', muted: '#5f6c5f', accent: '#616f01',
        accent2: '#257557', accentSoft: '#eae6c8', accentFg: '#ffffff', chipPosFg: '#5a6701',
        chipNegFg: '#bd0b07', pillFix: '#2b6f94', pillFixFg: '#28678a', pillSub: '#bb288d',
        pillSubFg: '#ab2581', pillUmb: '#734bd9', pillUmbFg: '#6b41d7', pillEnded: '#606c5e',
        pillEndedFg: '#5a6558',
      },
      dark: {
        content: '#232A2E', card: '#2D353B', surface2: '#3D484D', surfaceHover: '#293035',
        border: '#475258', borderStrong: '#56635F', inputBg: '#272e33', menuBg: '#333d42',
        sidebarBg: '#1E2427', sidebarBg2: '#232A2E', sidebarText: '#9DA9A0',
        sidebarTextActive: '#D3C6AA', text: '#D3C6AA', muted: '#aeb8b0', accent: '#A7C080',
        accent2: '#88c396', accentSoft: '#414b46', accentFg: '#232A2E', chipPosFg: '#a9c283',
        chipNegFg: '#eea5a7', pillFix: '#88c0b8', pillFixFg: '#8dc3bb', pillSub: '#dca7c0',
        pillSubFg: '#ddaac2', pillUmb: '#bfaede', pillUmbFg: '#c1b1df', pillEnded: '#afb8b2',
        pillEndedFg: '#b3bbb5',
      },
    },
    light: {
      pos: '#616f01', neg: '#d10c08', warn: '#886200', info: '#2b6f94',
      series: ['#388ebd', '#da52af', '#7d8f01', '#b07e00', '#b662de', '#309770', '#f7423f', '#7c8a79'],
      cat: {
        Wohnen: '#388ebd', 'Mobilität': '#2e939d', Gesundheit: '#309770', Versicherung: '#b662de',
        Freizeit: '#da52af', Technik: '#8a69df', Sparen: '#7d8f01', Bargeld: '#dc630a',
        Sonstiges: '#7c8a79',
      },
      chart: {
        grid: '#e3dfca', tick: '#5f6c5f', tooltipBg: '#2D353B', tooltipFg: '#FDF6E3', muted: '#b6b8a8',
      },
    },
    dark: {
      pos: '#A7C080', neg: '#eda2a4', warn: '#DBBC7F', info: '#88c0b8',
      series: ['#7FBBB3', '#D699B6', '#A7C080', '#DBBC7F', '#cb99d6', '#83C092', '#E67E80', '#88958c'],
      cat: {
        Wohnen: '#7FBBB3', 'Mobilität': '#7fb3bb', Gesundheit: '#83C092', Versicherung: '#cb99d6',
        Freizeit: '#D699B6', Technik: '#af99d6', Sparen: '#A7C080', Bargeld: '#E69875',
        Sonstiges: '#88958c',
      },
      chart: {
        grid: '#434e54', tick: '#aeb8b0', tooltipBg: '#1E2427', tooltipFg: '#D3C6AA', muted: '#677070',
      },
    },
  },
  // ---------- Gruvbox — Warmes Braun, Senf, Terrakotta
  gruvbox: {
    label: 'Gruvbox',
    note: 'Warmes Braun, Senf, Terrakotta',
    ui: {
      light: {
        content: '#EBDBB2', card: '#FBF1C7', surface2: '#F2E5BC', surfaceHover: '#f4e7be',
        border: '#D5C4A1', borderStrong: '#BDAE93', inputBg: '#FBF1C7', menuBg: '#FBF1C7',
        sidebarBg: '#282828', sidebarBg2: '#3C3836', sidebarText: '#BDAE93',
        sidebarTextActive: '#FBF1C7', text: '#3C3836', muted: '#665C54', accent: '#ab3903',
        accent2: '#84560f', accentSoft: '#f1dbaf', accentFg: '#ffffff', chipPosFg: '#64600c',
        chipNegFg: '#9D0006', pillFix: '#076678', pillFixFg: '#076678', pillSub: '#904869',
        pillSubFg: '#8c4666', pillUmb: '#683f8f', pillUmbFg: '#683f8f', pillEnded: '#685d54',
        pillEndedFg: '#665c53',
      },
      dark: {
        content: '#282828', card: '#32302F', surface2: '#3C3836', surfaceHover: '#2e2c2c',
        border: '#504945', borderStrong: '#665C54', inputBg: '#2c2b2b', menuBg: '#363332',
        sidebarBg: '#1D2021', sidebarBg2: '#282828', sidebarText: '#A89984',
        sidebarTextActive: '#FBF1C7', text: '#EBDBB2', muted: '#afa28e', accent: '#fe811a',
        accent2: '#FABD2F', accentSoft: '#533d2c', accentFg: '#282828', chipPosFg: '#B8BB26',
        chipNegFg: '#fc9184', pillFix: '#8bab9f', pillFixFg: '#9bb7ac', pillSub: '#d790a3',
        pillSubFg: '#dda0b0', pillUmb: '#b796d9', pillUmbFg: '#c1a5de', pillEnded: '#afa28e',
        pillEndedFg: '#baaf9d',
      },
    },
    light: {
      pos: '#66620c', neg: '#9D0006', warn: '#84560f', info: '#076678',
      series: ['#076678', '#B16286', '#79740E', '#ac7013', '#8F3F71', '#427B58', '#9D0006', '#7C6F64'],
      cat: {
        Wohnen: '#076678', 'Mobilität': '#458588', Gesundheit: '#427B58', Versicherung: '#8F3F71',
        Freizeit: '#B16286', Technik: '#683f8f', Sparen: '#79740E', Bargeld: '#AF3A03',
        Sonstiges: '#7C6F64',
      },
      chart: {
        grid: '#d9c9a5', tick: '#665C54', tooltipBg: '#282828', tooltipFg: '#FBF1C7', muted: '#b8ae93',
      },
    },
    dark: {
      pos: '#B8BB26', neg: '#fc7e6f', warn: '#FABD2F', info: '#8bab9f',
      series: ['#83A598', '#D3869B', '#B8BB26', '#FABD2F', '#d086d3', '#8EC07C', '#FB4934', '#A89984'],
      cat: {
        Wohnen: '#83A598', 'Mobilität': '#83a5a4', Gesundheit: '#8EC07C', Versicherung: '#d086d3',
        Freizeit: '#D3869B', Technik: '#ac86d3', Sparen: '#B8BB26', Bargeld: '#FE8019',
        Sonstiges: '#A89984',
      },
      chart: {
        grid: '#4c4542', tick: '#afa28e', tooltipBg: '#1D2021', tooltipFg: '#FBF1C7', muted: '#6a635a',
      },
    },
  },
  // ---------- Nord — Kühles Blaugrau, arktisch
  nord: {
    label: 'Nord',
    note: 'Kühles Blaugrau, arktisch',
    ui: {
      light: {
        content: '#E5E9F0', card: '#ECEFF4', surface2: '#DFE4EC', surfaceHover: '#e9ecf2',
        border: '#D8DEE9', borderStrong: '#C2CBDA', inputBg: '#ECEFF4', menuBg: '#ECEFF4',
        sidebarBg: '#2E3440', sidebarBg2: '#3B4252', sidebarText: '#C3CCDA',
        sidebarTextActive: '#ECEFF4', text: '#2E3440', muted: '#4C566A', accent: '#48668c',
        accent2: '#44678a', accentSoft: '#d8dfe8', accentFg: '#ffffff', chipPosFg: '#4c6439',
        chipNegFg: '#9a3e48', pillFix: '#48668c', pillFixFg: '#435f83', pillSub: '#84576b',
        pillSubFg: '#7b5164', pillUmb: '#44678a', pillUmbFg: '#3f6080', pillEnded: '#4C566A',
        pillEndedFg: '#4C566A',
      },
      dark: {
        content: '#2E3440', card: '#3B4252', surface2: '#434C5E', surfaceHover: '#353c4a',
        border: '#4C566A', borderStrong: '#5C6880', inputBg: '#333a47', menuBg: '#3e4657',
        sidebarBg: '#272B35', sidebarBg2: '#2E3440', sidebarText: '#AEB9CC',
        sidebarTextActive: '#ECEFF4', text: '#ECEFF4', muted: '#b4bed0', accent: '#93c6d4',
        accent2: '#9ec5c4', accentSoft: '#495767', accentFg: '#2E3440', chipPosFg: '#bfd2af',
        chipNegFg: '#e7c4c7', pillFix: '#aac0d5', pillFixFg: '#becedf', pillSub: '#cfb7c2',
        pillSubFg: '#dac8d0', pillUmb: '#aebfd5', pillUmbFg: '#c1cedf', pillEnded: '#b4bed0',
        pillEndedFg: '#c5cddb',
      },
    },
    light: {
      pos: '#526c3d', neg: '#a6434d', warn: '#9e4d34', info: '#48668c',
      series: ['#5E81AC', '#a3758a', '#6a8b4f', '#a7791d', '#a27399', '#538b8a', '#BF616A', '#4C566A'],
      cat: {
        Wohnen: '#5E81AC', 'Mobilität': '#3f8ba0', Gesundheit: '#538b8a', Versicherung: '#a27399',
        Freizeit: '#a3758a', Technik: '#5b85ae', Sparen: '#6a8b4f', Bargeld: '#c4694c',
        Sonstiges: '#4C566A',
      },
      chart: {
        grid: '#dae0ea', tick: '#4C566A', tooltipBg: '#2E3440', tooltipFg: '#ECEFF4', muted: '#a4aab6',
      },
    },
    dark: {
      pos: '#adc598', neg: '#e0b2b6', warn: '#EBCB8B', info: '#aac0d5',
      series: ['#81A1C1', '#b48e9f', '#A3BE8C', '#EBCB8B', '#B48EAD', '#8FBCBB', '#cd858c', '#AEB9CC'],
      cat: {
        Wohnen: '#81A1C1', 'Mobilität': '#88C0D0', Gesundheit: '#8FBCBB', Versicherung: '#B48EAD',
        Freizeit: '#b48e9f', Technik: '#7f9bbd', Sparen: '#A3BE8C', Bargeld: '#D08770',
        Sonstiges: '#AEB9CC',
      },
      chart: {
        grid: '#495366', tick: '#b4bed0', tooltipBg: '#272B35', tooltipFg: '#ECEFF4', muted: '#717a8b',
      },
    },
  },
  // ---------- Catppuccin — Weiche Pastelltöne, Lavendel
  catppuccin: {
    label: 'Catppuccin',
    note: 'Weiche Pastelltöne, Lavendel',
    ui: {
      light: {
        content: '#E6E9EF', card: '#EFF1F5', surface2: '#DCE0E8', surfaceHover: '#ebedf2',
        border: '#CCD0DA', borderStrong: '#BCC0CC', inputBg: '#EFF1F5', menuBg: '#EFF1F5',
        sidebarBg: '#4C4F69', sidebarBg2: '#5C5F77', sidebarText: '#CCD0DA',
        sidebarTextActive: '#EFF1F5', text: '#4C4F69', muted: '#5e6174', accent: '#7e29ee',
        accent2: '#2848fc', accentSoft: '#e1d9f4', accentFg: '#ffffff', chipPosFg: '#2b6b1d',
        chipNegFg: '#b50d31', pillFix: '#0a54e8', pillFixFg: '#094fdb', pillSub: '#b31b8a',
        pillSubFg: '#a71981', pillUmb: '#2848fc', pillUmbFg: '#1e3ffc', pillEnded: '#5e6174',
        pillEndedFg: '#5a5d6f',
      },
      dark: {
        content: '#181825', card: '#1E1E2E', surface2: '#313244', surfaceHover: '#1b1b2a',
        border: '#45475A', borderStrong: '#585B70', inputBg: '#1a1a29', menuBg: '#262637',
        sidebarBg: '#11111B', sidebarBg2: '#181825', sidebarText: '#A6ADC8',
        sidebarTextActive: '#CDD6F4', text: '#CDD6F4', muted: '#A6ADC8', accent: '#CBA6F7',
        accent2: '#B4BEFE', accentSoft: '#3a344e', accentFg: '#181825', chipPosFg: '#A6E3A1',
        chipNegFg: '#F38BA8', pillFix: '#89B4FA', pillFixFg: '#89B4FA', pillSub: '#F5C2E7',
        pillSubFg: '#F5C2E7', pillUmb: '#B4BEFE', pillUmbFg: '#B4BEFE', pillEnded: '#A6ADC8',
        pillEndedFg: '#A6ADC8',
      },
    },
    light: {
      pos: '#2d701e', neg: '#c30e35', warn: '#895712', info: '#0a54e8',
      series: ['#1E66F5', '#e033b2', '#3a9127', '#b17117', '#8839EF', '#168d94', '#D20F39', '#6C6F85'],
      cat: {
        Wohnen: '#1E66F5', 'Mobilität': '#0388bd', Gesundheit: '#168d94', Versicherung: '#8839EF',
        Freizeit: '#e033b2', Technik: '#5971fd', Sparen: '#3a9127', Bargeld: '#dc5101',
        Sonstiges: '#6C6F85',
      },
      chart: {
        grid: '#d0d3dd', tick: '#5e6174', tooltipBg: '#4C4F69', tooltipFg: '#EFF1F5', muted: '#aeb0bb',
      },
    },
    dark: {
      pos: '#A6E3A1', neg: '#F38BA8', warn: '#F9E2AF', info: '#89B4FA',
      series: ['#89B4FA', '#F5C2E7', '#A6E3A1', '#F9E2AF', '#CBA6F7', '#94E2D5', '#F38BA8', '#A6ADC8'],
      cat: {
        Wohnen: '#89B4FA', 'Mobilität': '#89DCEB', Gesundheit: '#94E2D5', Versicherung: '#CBA6F7',
        Freizeit: '#F5C2E7', Technik: '#B4BEFE', Sparen: '#A6E3A1', Bargeld: '#FAB387',
        Sonstiges: '#A6ADC8',
      },
      chart: {
        grid: '#3f4153', tick: '#A6ADC8', tooltipBg: '#11111B', tooltipFg: '#CDD6F4', muted: '#5b5e73',
      },
    },
  },
  // ---------- Melange — Dunkelbraun, Creme, Ocker
  melange: {
    label: 'Melange',
    note: 'Dunkelbraun, Creme, Ocker',
    ui: {
      light: {
        content: '#E4DCD6', card: '#F2ECE7', surface2: '#EAE3DD', surfaceHover: '#EDE6E1',
        border: '#DCD4CE', borderStrong: '#C6BBB2', inputBg: '#F2ECE7', menuBg: '#F2ECE7',
        sidebarBg: '#292522', sidebarBg2: '#34302C', sidebarText: '#B9A593',
        sidebarTextActive: '#F2ECE7', text: '#54433A', muted: '#715C50', accent: '#815800',
        accent2: '#9A4B00', accentSoft: '#e2d7c7', accentFg: '#ffffff', chipPosFg: '#386548',
        chipNegFg: '#B0001E', pillFix: '#3D6568', pillFixFg: '#3B6265', pillSub: '#904180',
        pillSubFg: '#8C3F7D', pillUmb: '#465AA4', pillUmbFg: '#4458A0', pillEnded: '#7D6658',
        pillEndedFg: '#6E5A4D',
      },
      dark: {
        content: '#292522', card: '#34302C', surface2: '#403A36', surfaceHover: '#2F2B28',
        border: '#403A36', borderStrong: '#4D4641', inputBg: '#2B2724', menuBg: '#34302C',
        sidebarBg: '#201D1B', sidebarBg2: '#292522', sidebarText: '#C1A78E',
        sidebarTextActive: '#ECE1D7', text: '#ECE1D7', muted: '#C1A78E', accent: '#EBC06D',
        accent2: '#C1A78E', accentSoft: '#554a38', accentFg: '#292522', chipPosFg: '#8FBC9D',
        chipNegFg: '#E1A196', pillFix: '#89B3B6', pillFixFg: '#92B9BC', pillSub: '#CF9BC2',
        pillSubFg: '#D2A2C6', pillUmb: '#A3A9CE', pillUmbFg: '#AAAFD2', pillEnded: '#A9937C',
        pillEndedFg: '#BBAA98',
      },
    },
    light: {
      pos: '#3A684A', neg: '#BF0021', warn: '#7C5800', info: '#3D6568',
      series: ['#465AA4', '#904180', '#3A684A', '#8B6300', '#6A4D92', '#3D6568', '#BF0021', '#7D6658'],
      cat: {
        Wohnen: '#465AA4', 'Mobilität': '#3F6286', Gesundheit: '#3A684A', Versicherung: '#7A4A8E',
        Freizeit: '#904180', Technik: '#5A58A0', Sparen: '#5C6B22', Bargeld: '#9A4B00',
        Sonstiges: '#7D6658',
      },
      chart: {
        grid: '#DCD4CE', tick: '#7D6658', tooltipBg: '#292522', tooltipFg: '#ECE1D7', muted: '#B8ABA1',
      },
    },
    dark: {
      pos: '#85B695', neg: '#DD9386', warn: '#EBC06D', info: '#89B3B6',
      series: ['#A3A9CE', '#CF9BC2', '#85B695', '#EBC06D', '#B9A2C8', '#89B3B6', '#D47766', '#A9937C'],
      cat: {
        Wohnen: '#8FB0C2', 'Mobilität': '#89B3B6', Gesundheit: '#85B695', Versicherung: '#C49BCB',
        Freizeit: '#CF9BC2', Technik: '#AAA2CF', Sparen: '#B3BB83', Bargeld: '#E49B5D',
        Sonstiges: '#A9937C',
      },
      chart: {
        grid: '#3A352F', tick: '#C1A78E', tooltipBg: '#201D1B', tooltipFg: '#ECE1D7', muted: '#6E635A',
      },
    },
  },
  // ---------- Flexoki — Papier und Tinte, warme Graustufen
  flexoki: {
    label: 'Flexoki',
    note: 'Papier und Tinte, warme Graustufen',
    ui: {
      light: {
        content: '#F2F0E5', card: '#FFFCF0', surface2: '#E6E4D9', surfaceHover: '#F7F4E9',
        border: '#DAD8CE', borderStrong: '#CECDC3', inputBg: '#FFFCF0', menuBg: '#FFFCF0',
        sidebarBg: '#1C1B1A', sidebarBg2: '#282726', sidebarText: '#B7B5AC',
        sidebarTextActive: '#FFFCF0', text: '#100F0F', muted: '#575653', accent: '#AF3029',
        accent2: '#9D4310', accentSoft: '#f4dfd4', accentFg: '#FFFCF0', chipPosFg: '#536907',
        chipNegFg: '#AF3029', pillFix: '#205EA6', pillFixFg: '#205EA6', pillSub: '#A02F6F',
        pillSubFg: '#A02F6F', pillUmb: '#5E409D', pillUmbFg: '#5E409D', pillEnded: '#6F6E69',
        pillEndedFg: '#575653',
      },
      dark: {
        content: '#1C1B1A', card: '#282726', surface2: '#343331', surfaceHover: '#211F1F',
        border: '#403E3C', borderStrong: '#575653', inputBg: '#1F1E1D', menuBg: '#2B2A29',
        sidebarBg: '#100F0F', sidebarBg2: '#1C1B1A', sidebarText: '#9F9D96',
        sidebarTextActive: '#CECDC3', text: '#CECDC3', muted: '#9F9D96', accent: '#EC8B49',
        accent2: '#D0A215', accentSoft: '#4b392c', accentFg: '#100F0F', chipPosFg: '#A0AF54',
        chipNegFg: '#FFCABB', pillFix: '#4385BE', pillFixFg: '#92BFDB', pillSub: '#CE5D97',
        pillSubFg: '#E47DA8', pillUmb: '#8B7EC8', pillUmbFg: '#A699D0', pillEnded: '#9F9D96',
        pillEndedFg: '#B7B5AC',
      },
    },
    light: {
      pos: '#536907', neg: '#AF3029', warn: '#664D01', info: '#205EA6',
      series: ['#205EA6', '#A02F6F', '#536907', '#8E6B01', '#5E409D', '#24837B', '#AF3029', '#6F6E69'],
      cat: {
        Wohnen: '#205EA6', 'Mobilität': '#2F968D', Gesundheit: '#1C6C66', Versicherung: '#5E409D',
        Freizeit: '#A02F6F', Technik: '#735EB5', Sparen: '#66800B', Bargeld: '#BC5215',
        Sonstiges: '#6F6E69',
      },
      chart: {
        grid: '#E6E4D9', tick: '#6F6E69', tooltipBg: '#1C1B1A', tooltipFg: '#FFFCF0', muted: '#B7B5AC',
      },
    },
    dark: {
      pos: '#A0AF54', neg: '#F89A8A', warn: '#D0A215', info: '#5ABDAC',
      series: ['#4385BE', '#CE5D97', '#879A39', '#D0A215', '#8B7EC8', '#3AA99F', '#D14D41', '#9F9D96'],
      cat: {
        Wohnen: '#4385BE', 'Mobilität': '#5ABDAC', Gesundheit: '#3AA99F', Versicherung: '#8B7EC8',
        Freizeit: '#CE5D97', Technik: '#A699D0', Sparen: '#879A39', Bargeld: '#DA702C',
        Sonstiges: '#9F9D96',
      },
      chart: {
        grid: '#343331', tick: '#9F9D96', tooltipBg: '#100F0F', tooltipFg: '#CECDC3', muted: '#575653',
      },
    },
  },
}

// --- Mischen (sRGB) --------------------------------------------------------
//  Chips, Hinweisflächen und Rahmen sind Tönungen der Bedeutungsfarbe auf der
//  Kartenfläche. Sie stehen nicht als Wert in der Tabelle oben, sondern werden
//  hier nach einem Rezept gemischt — ein Platz, an dem man die Stärke ändert.
function mix(a, b, t) {
  const rgb = (hex) => {
    const h = hex.replace('#', '')
    const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
  }
  const A = rgb(a)
  const B = rgb(b)
  return '#' + [0, 1, 2]
    .map((i) => Math.round(A[i] + (B[i] - A[i]) * t).toString(16).padStart(2, '0'))
    .join('')
}

// Anteil `a` der Farbe auf der Fläche `bg`.
const tint = (color, bg, a) => mix(bg, color, a)

// Dasselbe für Aufrufer außerhalb: eine Tönung als deckender Wert. Deckend und
// nicht rgba(), weil auf einer Canvas-Fläche sonst nicht feststeht, was
// dahinterliegt — und damit auch nicht, ob die Schrift darauf lesbar ist.
export function tintOn(color, bg, amount) {
  return tint(color, bg, amount)
}

// Schrift auf einer Datenfarbe (Treemap-Kachel): hell oder dunkel, je nachdem
// welches von beiden auf dieser Farbe tatsächlich besser lesbar ist. Ein
// fester Wert ginge hier nicht: im dunklen Design sind die Kategoriefarben die
// helleren Varianten, auf denen weiße Schrift untergeht — und auch im hellen
// Design war weiß auf Gelb (#ca8a04) mit 2,9:1 zu wenig.
const INK = '#17202a'

function luminance(hex) {
  const h = String(hex || '').replace('#', '')
  if (h.length < 3) return 1
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const lin = (c) => {
    const v = parseInt(c, 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * lin(s.slice(0, 2)) + 0.7152 * lin(s.slice(2, 4)) + 0.0722 * lin(s.slice(4, 6))
}

function ratio(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

export function readableOn(hex) {
  return ratio('#ffffff', hex) >= ratio(INK, hex) ? '#ffffff' : INK
}

// Eine Farbe so weit aufhellen oder abdunkeln, bis sie auf `bg` lesbar ist —
// in die Richtung, die auf dieser Fläche ohnehin lesbar wäre. Für Schrift, die
// auf einer eingefärbten Fläche steht und trotzdem ihre Bedeutung behalten
// soll (die Überschrift „Sparen" auf der grün getönten Blockkachel).
export function legibleOn(color, bg, target = 4.5) {
  if (ratio(color, bg) >= target) return color
  const ziel = readableOn(bg)
  for (let i = 1; i <= 20; i++) {
    const c = mix(color, ziel, i / 20)
    if (ratio(c, bg) >= target) return c
  }
  return ziel
}

// Eine Bedeutungsfarbe auf eine dunkle Fläche heben: so weit Richtung `light`
// mischen, bis sie dort 4,5:1 erreicht. Nötig, weil die Sidebar und die
// Hero-Kachel in jeder Palette dunkel sind, der Akzent einer hellen Palette
// aber selbst dunkel ist — Everforests Oliv #616f01 auf #2D353B wäre nicht zu
// sehen. Ein fester Mischanteil reichte nicht für jede Palette, deshalb wird
// hier gerechnet (einmal beim Wechsel, nicht beim Zeichnen).
function liftOnto(color, bg, light, target = 4.5) {
  for (let i = 0; i <= 20; i++) {
    const c = mix(color, light, i / 20)
    if (ratio(c, bg) >= target) return c
  }
  return light
}


// --- Auswahl für die Einstellungen ----------------------------------------
export const PALETTES = Object.entries(DATA).map(([id, p]) => ({
  id,
  label: p.label,
  note: p.note,
  // Vier Tupfer für die Vorschau: Fläche, Akzent, Einnahmen, Ausgaben.
  swatch: {
    light: [p.ui?.light.card || '#ffffff', p.ui?.light.accent || '#4c6ef5', p.light.pos, p.light.neg],
    dark: [p.ui?.dark.card || '#121c32', p.ui?.dark.accent || '#6d8bff', p.dark.pos, p.dark.neg],
  },
}))

export function isPalette(id) {
  return Object.prototype.hasOwnProperty.call(DATA, id)
}

// --- Aktiver Stand ---------------------------------------------------------
//  Modulzustand wie in categoryStore.js: applyPalette() wird beim Rendern
//  gesetzt, bevor die Diagramme lesen, und tokens() liest synchron.
let activeId = DEFAULT_PALETTE
let activeMode = 'light'

export function tokens() {
  const p = DATA[activeId] || DATA[DEFAULT_PALETTE]
  const t = p[activeMode] || p.light
  // `card` brauchen auch die Diagramme (Rand der Donut-Segmente, Schrift auf
  // einer Treemap-Kachel). Bei Paletten mit eigenen Flächen steht die
  // Kartenfarbe dort, beim Standard im Datenteil.
  const fromUi = p.ui?.[activeMode]?.card
  return fromUi ? { ...t, card: fromUi } : t
}

export function paletteId() {
  return activeId
}

// Kontofarbe nach Platz in der Reihe (0-basiert, läuft um).
export function seriesColor(i) {
  const s = tokens().series
  return s[((i % s.length) + s.length) % s.length]
}

export function seriesPalette() {
  return tokens().series
}

// Standardfarbe einer Kategorie; eigene Farben der Benutzer gewinnen davor
// (siehe categoryStore.js).
export function categoryPaletteColor(id) {
  return tokens().cat[id] || null
}

// Welche CSS-Variable gehört zu welchem Wert der Oberfläche.
const UI_VARS = {
  content: '--content-bg', card: '--card-bg', surface2: '--surface-2',
  surfaceHover: '--surface-hover', border: '--border', borderStrong: '--border-strong',
  inputBg: '--input-bg', menuBg: '--menu-bg',
  sidebarBg: '--sidebar-bg', sidebarBg2: '--sidebar-bg-2',
  sidebarText: '--sidebar-text', sidebarTextActive: '--sidebar-text-active',
  text: '--text', muted: '--text-muted',
  accent: '--accent', accent2: '--accent-2', accentSoft: '--accent-soft', accentFg: '--accent-fg',
  chipPosFg: '--chip-pos-fg', chipNegFg: '--chip-neg-fg',
  pillFixFg: '--pill-fix-fg', pillSubFg: '--pill-sub-fg',
  pillUmbFg: '--pill-umb-fg', pillEndedFg: '--pill-ended-fg',
}

// Alle Variablen, die diese Datei je setzt — beim Wechsel wird zuerst alles
// davon entfernt, damit "zurück auf Standard" wirklich wieder index.css gilt.
const MANAGED = [
  ...Object.values(UI_VARS),
  '--pos', '--neg', '--warn',
  '--chip-pos-bg', '--chip-neg-bg', '--pill-fix-bg', '--pill-sub-bg', '--pill-umb-bg',
  '--pill-ended-bg', '--warn-soft', '--warn-soft-strong',
  '--ok-soft', '--ok-border', '--warnbox-soft', '--warnbox-border',
  '--risk-soft', '--risk-border', '--info-soft', '--info-border', '--info-text',
  '--info', '--neg-fg',
  '--on-dark', '--sidebar-accent', '--on-dark-neg',
  '--hero-warn-bg', '--hero-warn-text', '--hero-warn-value',
  '--series-1', '--series-2', '--series-3', '--series-4',
  '--series-5', '--series-6', '--series-7', '--series-8',
  '--cat-sparen', '--cat-freizeit', '--cat-bargeld',
  '--chart-grid', '--chart-tick', '--chart-tooltip-bg', '--chart-tooltip-fg', '--chart-muted',
]

// Setzt Palette + hell/dunkel. Wird in App.jsx beim Rendern aufgerufen (nicht
// in einem Effekt): die Diagramme lesen tokens() während ihres Renderns, und
// Effekte laufen erst danach — sie würden sonst einen Takt lang die alten
// Farben zeichnen.
export function applyPalette(id, mode) {
  activeId = isPalette(id) ? id : DEFAULT_PALETTE
  activeMode = mode === 'dark' ? 'dark' : 'light'

  const p = DATA[activeId]
  const t = p[activeMode]
  const ui = p.ui?.[activeMode] || null
  const s = document.documentElement.style

  MANAGED.forEach((v) => s.removeProperty(v))

  // Datenwerte gelten für jede Palette — auch für "standard", damit sie nur
  // hier stehen und nicht zusätzlich in index.css. Einnahmen bleiben grün,
  // Ausgaben rot, Sparen eine eigene, nicht rote Farbe.
  s.setProperty('--pos', t.pos)
  s.setProperty('--neg', t.neg)
  s.setProperty('--warn', t.warn)
  s.setProperty('--info', t.info)
  // Schrift auf einer Bedeutungsfarbe als Fläche (der rote Tag im
  // Zeitstrahl): hell oder dunkel, je nachdem was darauf lesbar ist.
  s.setProperty('--neg-fg', readableOn(t.neg))
  t.series.forEach((c, i) => s.setProperty('--series-' + (i + 1), c))
  s.setProperty('--cat-sparen', t.cat.Sparen)
  s.setProperty('--cat-freizeit', t.cat.Freizeit)
  s.setProperty('--cat-bargeld', t.cat.Bargeld)
  s.setProperty('--chart-grid', t.chart.grid)
  s.setProperty('--chart-tick', t.chart.tick)
  s.setProperty('--chart-tooltip-bg', t.chart.tooltipBg)
  s.setProperty('--chart-tooltip-fg', t.chart.tooltipFg)
  s.setProperty('--chart-muted', t.chart.muted)

  // Flächen und Rahmen nur, wenn die Palette eigene mitbringt. "standard"
  // bringt keine — dann bleibt index.css unangetastet.
  if (!ui) return
  Object.entries(UI_VARS).forEach(([key, varName]) => {
    if (ui[key]) s.setProperty(varName, ui[key])
  })
  const card = ui.card
  s.setProperty('--chip-pos-bg', tint(t.pos, card, 0.16))
  s.setProperty('--chip-neg-bg', tint(t.neg, card, 0.16))
  s.setProperty('--pill-fix-bg', tint(ui.pillFix, card, 0.16))
  s.setProperty('--pill-sub-bg', tint(ui.pillSub, card, 0.16))
  s.setProperty('--pill-umb-bg', tint(ui.pillUmb, card, 0.16))
  s.setProperty('--pill-ended-bg', tint(ui.pillEnded, card, 0.16))
  s.setProperty('--warn-soft', tint(t.warn, card, 0.14))
  s.setProperty('--warn-soft-strong', tint(t.warn, card, 0.26))
  s.setProperty('--ok-soft', tint(t.pos, card, 0.08))
  s.setProperty('--ok-border', tint(t.pos, card, 0.3))
  s.setProperty('--warnbox-soft', tint(t.warn, card, 0.08))
  s.setProperty('--warnbox-border', tint(t.warn, card, 0.3))
  s.setProperty('--risk-soft', tint(t.neg, card, 0.08))
  s.setProperty('--risk-border', tint(t.neg, card, 0.3))
  s.setProperty('--info-soft', tint(t.info, card, 0.08))
  s.setProperty('--info-border', tint(t.info, card, 0.3))
  s.setProperty('--info-text', t.info)

  // Sidebar und Hero-Kachel sind in jeder Palette dunkel. Der Akzent einer
  // hellen Palette ist dafür zu dunkel (olives #616f01 auf #2D353B wäre nicht
  // zu sehen), deshalb hier aufgehellte Varianten.
  const light = ui.sidebarTextActive
  const heroWarnBg = tint(t.warn, ui.sidebarBg, 0.17)
  s.setProperty('--on-dark', light)
  s.setProperty('--sidebar-accent', liftOnto(ui.accent, ui.sidebarBg, light))
  s.setProperty('--on-dark-neg', liftOnto(t.neg, ui.sidebarBg, light))
  s.setProperty('--hero-warn-bg', heroWarnBg)
  s.setProperty('--hero-warn-text', liftOnto(t.warn, heroWarnBg, light))
  s.setProperty('--hero-warn-value', liftOnto(t.warn, heroWarnBg, light, 5.5))
}

export { CAT_IDS }
