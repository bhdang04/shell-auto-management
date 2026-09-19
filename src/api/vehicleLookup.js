const BASE = "https://vpic.nhtsa.dot.gov/api/vehicles";

let makesCache = null; // fetched once — ~9,000 makes, rarely changes

/** Every vehicle make NHTSA knows about, cached in memory for the page's
 *  lifetime since it's needed on every keystroke of the vehicle search. */
export async function getAllMakes() {
  if (makesCache) return makesCache;
  const res = await fetch(`${BASE}/getallmakes?format=json`);
  if (!res.ok) throw new Error("Failed to load vehicle makes");
  const data = await res.json();
  makesCache = (data.Results || [])
    .map((r) => r.Make_Name)
    .filter(Boolean)
    .sort();
  return makesCache;
}

const modelsCache = new Map(); // "make|year" -> model names, cached per combo

/** Models for one make, optionally narrowed to a specific year (more
 *  precise — only models that actually existed that year). Cached since a
 *  tech often narrows within the same make across several keystrokes. */
export async function getModelsForMake(make, year) {
  const key = `${make.toUpperCase()}|${year || ""}`;
  if (modelsCache.has(key)) return modelsCache.get(key);
  const url = year
    ? `${BASE}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${encodeURIComponent(year)}?format=json`
    : `${BASE}/GetModelsForMake/${encodeURIComponent(make)}?format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load models for " + make);
  const data = await res.json();
  const models = (data.Results || []).map((r) => r.Model_Name).filter(Boolean);
  modelsCache.set(key, models);
  return models;
}

/** Decodes a full 17-character VIN into real specs — engine, transmission,
 *  drivetrain, make/model/year. Free, no API key, official NHTSA data. */
export async function decodeVin(vin) {
  const res = await fetch(`${BASE}/DecodeVinValues/${encodeURIComponent(vin)}?format=json`);
  if (!res.ok) throw new Error("VIN decode failed");
  const data = await res.json();
  const r = (data.Results && data.Results[0]) || {};
  return {
    year: r.ModelYear || "",
    make: r.Make || "",
    model: r.Model || "",
    trim: r.Trim || "",
    cylinders: r.EngineCylinders || "",
    displacement: r.DisplacementL || "",
    driveType: r.DriveType || "",
    transmission: r.TransmissionStyle || "",
    fuelType: r.FuelTypePrimary || "",
  };
}

/** Builds the "Engine · Drivetrain" text for the engine_specs field, from a decoded VIN. */
export function vinResultToSpecs(r) {
  const engine = [
    r.cylinders && `${r.cylinders}-cyl`,
    r.displacement && `${r.displacement}L`,
    r.fuelType,
  ]
    .filter(Boolean)
    .join(" ");
  const parts = [engine, r.transmission, r.driveType].filter(Boolean);
  return parts.join(" · ");
}