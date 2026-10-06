// Agripath_Backend-main Groq/data/fairsRegulatoryRegistry.js

export const FAIRS_REGULATORY_DATA = {
  "Ethiopia": {
    country: "Ethiopia",
    isHub: true,
    managedCountries: ["South Sudan", "Somalia", "Eritrea", "Djibouti", "Sudan"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2025",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/0311520251222153633182.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2025",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/031152025122215374515.pdf"
      }
    ]
  },
  "Kenya": {
    country: "Kenya",
    isHub: true,
    managedCountries: ["Uganda", "Rwanda", "Burundi", "DR Congo", "Republic of Congo"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/01213202662212855582.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/0121320266221294411.pdf"
      }
    ]
  },
  "Tanzania": {
    country: "Tanzania",
    isHub: false,
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/013952026312155724577.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/013952026312155811907.pdf"
      }
    ]
  },
  "Nigeria": {
    country: "Nigeria",
    isHub: true,
    managedCountries: ["Benin", "Cameroon", "Chad", "Central African Republic", "Gabon"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/032912026421153433184.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/032912026421153334125.pdf"
      }
    ]
  },
  "Ghana": {
    country: "Ghana",
    isHub: true,
    managedCountries: ["Burkina Faso", "Niger", "Guinea", "Sierra Leone", "Liberia", "Cape Verde", "Equatorial Guinea", "São Tomé & Príncipe"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/031492026622114117505.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/031492026622114211434.pdf"
      }
    ]
  },
  "Senegal": {
    country: "Senegal",
    isHub: true,
    managedCountries: ["Mali", "Guinea-Bissau", "Gambia", "Mauritania", "Mauritius"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/02353202566161057330.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/02353202566161219359.pdf"
      }
    ]
  },
  "South Africa": {
    country: "South Africa",
    isHub: true,
    managedCountries: ["Zambia", "Zimbabwe", "Malawi", "Botswana", "Namibia", "Lesotho", "Eswatini", "Madagascar", "Seychelles", "Comoros"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/0436520267216271559.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/043652026622114414377.pdf"
      }
    ]
  },
  "Egypt": {
    country: "Egypt",
    isHub: true,
    managedCountries: ["Iraq", "Syria"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2025",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/041112025122215542371.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2025",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/0411120251222155512876.pdf"
      }
    ]
  },
  "Morocco": {
    country: "Morocco",
    isHub: true,
    managedCountries: ["Libya"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2025",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/04265202542314731581.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2025",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/042652025423141412115.pdf"
      }
    ]
  },
  "India": {
    country: "India",
    isHub: true,
    managedCountries: ["Nepal", "Maldives", "Bhutan"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2025",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/1002720258416395111.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2025",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/10027202584163413155.pdf"
      }
    ]
  },
  "Indonesia": {
    country: "Indonesia",
    isHub: true,
    managedCountries: ["Timor-Leste"],
    reports: [
      {
        reportType: "FAIRS Export Certificate Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/101872026312155636728.pdf"
      },
      {
        reportType: "FAIRS Country Report Annual",
        year: "2026",
        link: "https://agriexchange.apeda.gov.in/ImportRegulations/101872026312155558273.pdf"
      }
    ]
  }
};

const MANAGED_MAPPING = {
  "South Sudan": "Ethiopia",
  "Somalia": "Ethiopia",
  "Eritrea": "Ethiopia",
  "Djibouti": "Ethiopia",
  "Sudan": "Ethiopia",
  "Uganda": "Kenya",
  "Rwanda": "Kenya",
  "Burundi": "Kenya",
  "DR Congo": "Kenya",
  "Republic of Congo": "Kenya",
  "Zambia": "South Africa",
  "Zimbabwe": "South Africa",
  "Malawi": "South Africa",
  "Botswana": "South Africa",
  "Namibia": "South Africa",
  "Lesotho": "South Africa",
  "Eswatini": "South Africa",
  "Madagascar": "South Africa",
  "Seychelles": "South Africa",
  "Comoros": "South Africa",
  "Burkina Faso": "Ghana",
  "Niger": "Ghana",
  "Guinea": "Ghana",
  "Sierra Leone": "Ghana",
  "Liberia": "Ghana",
  "Cape Verde": "Ghana",
  "Equatorial Guinea": "Ghana",
  "São Tomé & Príncipe": "Ghana",
  "Benin": "Nigeria",
  "Cameroon": "Nigeria",
  "Chad": "Nigeria",
  "Central African Republic": "Nigeria",
  "Gabon": "Nigeria",
  "Mali": "Senegal",
  "Guinea-Bissau": "Senegal",
  "Gambia": "Senegal",
  "Mauritania": "Senegal",
  "Mauritius": "Senegal",
  "Libya": "Morocco",
  "Nepal": "India",
  "Maldives": "India",
  "Bhutan": "India",
  "Iraq": "Egypt",
  "Syria": "Egypt",
  "Laos": "Thailand",
  "Timor-Leste": "Indonesia",
  "Papua New Guinea": "Malaysia",
  "Yemen": "Saudi Arabia",
  "Afghanistan": "United Arab Emirates (UAE)",
  "Kyrgyzstan": "Uzbekistan",
  "Tajikistan": "Uzbekistan",
  "Turkmenistan": "Uzbekistan",
  "Armenia": "Uzbekistan"
};

export function getSimilarRegulatoryInfo(selectedCountry) {
  if (!selectedCountry) return null;
  const norm = selectedCountry.trim();

  // 1. Agar country direct Hub hai
  if (FAIRS_REGULATORY_DATA[norm]) {
    const hub = FAIRS_REGULATORY_DATA[norm];
    const managedList = hub.managedCountries || [];
    return {
      selectedCountry: norm,
      isHub: true,
      governingCountry: norm,
      reports: hub.reports || [],
      similarCountries: managedList,
      description: `Similar regulations, export certifications, and bilateral trade compliance protocols governing ${norm} also apply to the following ${managedList.length} managed markets.`
    };
  }

  // 2. Agar country "Managed Through" hai
  const governingHub = MANAGED_MAPPING[norm];
  if (governingHub && FAIRS_REGULATORY_DATA[governingHub]) {
    const hub = FAIRS_REGULATORY_DATA[governingHub];
    const peerCountries = (hub.managedCountries || []).filter(c => c.toLowerCase() !== norm.toLowerCase());
    return {
      selectedCountry: norm,
      isHub: false,
      governingCountry: governingHub,
      reports: hub.reports || [],
      similarCountries: [governingHub, ...peerCountries],
      description: `${norm} follows trade, export certification, and regulatory protocols managed through ${governingHub}. Similar regulations apply to ${governingHub} and its regional network.`
    };
  }

  return null;
}