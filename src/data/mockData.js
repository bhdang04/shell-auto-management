// Stand-in for a real customers/vehicles/invoices API.
// Swap this file for a fetch() call or a DB query later —
// nothing else in the app needs to change as long as the shape stays the same.

export const customers = [
  {
    id: 1,
    name: "Richard Brooks",
    addr: "1135 Hester Ave",
    cityzip: "San Jose, CA 95126",
    phone1: "(408) 293-9966",
    phone2: "(408) 569-0237",
    vehicles: [
      {
        label: "2007 Ford F-150 XLT",
        specs: "V6 4.2L · 4Spd/TA · RWD",
        plate: "8N39921",
        vin: "RF12267KC41876",
        odo: "142,596",
      },
    ],
    history: [
      {
        num: "13839",
        date: "8/25/2026",
        status: "In Bay",
        desc: "Check engine light — coolant system repair",
        total: 723.5,
        labor: 300,
        parts: 385,
        tax: 38.5,
        items: [
          { tag: "LABOR", desc: "Diagnose check engine light", sub: "Code P1299 — cylinder head overheat temp", qty: "0.5", price: 150, total: 75 },
          { tag: "LABOR", desc: "R&R temp sensor & expansion tank", sub: "Includes coolant top-off", qty: "0.8", price: 150, total: 120 },
          { tag: "PART", desc: "Engine temp sensor", sub: "SI TX · IMC(N)", qty: "1", price: 104, total: 104 },
          { tag: "PART", desc: "Expansion tank w/ cap", sub: "API · IMC(N)", qty: "1", price: 161, total: 161 },
          { tag: "PART", desc: "Coolant", sub: "", qty: "1", price: 20, total: 20 },
          { tag: "LABOR", desc: "R&R P/S pulley", sub: "", qty: "0.7", price: 150, total: 105 },
          { tag: "PART", desc: "P/S pulley", sub: "DOR RB · IMC(N)", qty: "1", price: 100, total: 100 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Maria Lopez",
    addr: "482 Willow Glen Rd",
    cityzip: "San Jose, CA 95125",
    phone1: "(408) 555-2231",
    phone2: "",
    vehicles: [
      {
        label: "2016 Honda Civic LX",
        specs: "I4 2.0L · FWD",
        plate: "7GHT210",
        vin: "2HGFC2F59GH123456",
        odo: "88,204",
      },
    ],
    history: [
      {
        num: "13840",
        date: "8/25/2026",
        status: "Waiting on Parts",
        desc: "Front brake pads & rotors",
        total: 412,
        labor: 180,
        parts: 214,
        tax: 18,
        items: [
          { tag: "LABOR", desc: "R&R front brake pads & rotors", sub: "", qty: "1.2", price: 150, total: 180 },
          { tag: "PART", desc: "Front brake pads", sub: "Wagner ThermoQuiet", qty: "1", price: 96, total: 96 },
          { tag: "PART", desc: "Front rotors (pair)", sub: "On order", qty: "1", price: 118, total: 118 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "James Ortiz",
    addr: "902 Lincoln Ave",
    cityzip: "San Jose, CA 95126",
    phone1: "(408) 555-7710",
    phone2: "",
    vehicles: [
      {
        label: "2019 Toyota Tacoma SR5",
        specs: "V6 3.5L · 4WD",
        plate: "9KLM442",
        vin: "3TMCZ5AN5KM123456",
        odo: "41,880",
      },
    ],
    history: [
      {
        num: "13836",
        date: "8/25/2026",
        status: "Ready",
        desc: "Oil change, tire rotation, inspection",
        total: 89,
        labor: 63,
        parts: 26,
        tax: 0,
        items: [
          { tag: "LABOR", desc: "Oil & filter change", sub: "Full synthetic 5W-30", qty: "0.4", price: 90, total: 36 },
          { tag: "LABOR", desc: "Tire rotation & multi-point inspection", sub: "", qty: "0.3", price: 90, total: 27 },
          { tag: "PART", desc: "Oil filter", sub: "", qty: "1", price: 12, total: 12 },
          { tag: "PART", desc: "Full synthetic oil (5 qt)", sub: "", qty: "1", price: 14, total: 14 },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "Kevin Park",
    addr: "",
    cityzip: "",
    phone1: "(408) 555-4090",
    phone2: "",
    vehicles: [
      {
        label: "2014 Subaru Outback",
        specs: "H4 2.5L · AWD",
        plate: "6DFT581",
        vin: "",
        odo: "",
      },
    ],
    history: [],
  },
];
