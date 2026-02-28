import { createReadStream } from 'fs';
import path from 'path';
import readline from 'readline';
import csv from 'csv-parser';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ROOT = path.join(__dirname, '..');
const PLANES_PATH = path.join(ROOT, 'planes.dat');
const FLEET_CSV_PATH = path.join(ROOT, 'Fleet Data.csv');

async function loadAircraftTypes() {
  console.log('Loading aircraft types from planes.dat...');

  const aircraftTypes: { name: string; iataCode: string | null; icaoCode: string | null }[] = [];

  const rl = readline.createInterface({
    input: createReadStream(PLANES_PATH),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    // Lines look like: "Airbus A320","320","A320"  or \N for missing
    const match = line.match(/^"([^"]+)",([^,]+),([^,]+)$/);
    if (!match) {
      console.warn('Could not parse line in planes.dat:', line);
      continue;
    }
    const [, name, iataRaw, icaoRaw] = match;
    const iata = iataRaw === '\\N' ? null : iataRaw.replace(/"/g, '');
    const icao = icaoRaw === '\\N' ? null : icaoRaw.replace(/"/g, '');

    aircraftTypes.push({ name, iataCode: iata, icaoCode: icao });
  }

  // Upsert each aircraft type by name
  for (const t of aircraftTypes) {
    await prisma.aircraftType.upsert({
      where: { name: t.name },
      update: { iataCode: t.iataCode ?? undefined, icaoCode: t.icaoCode ?? undefined },
      create: t,
    });
  }

  console.log(`Saved ${aircraftTypes.length} aircraft types.`);
}

async function loadFleetData() {
  console.log('Loading fleet data from Fleet Data.csv...');

  type FleetRow = {
    'Parent Airline': string;
    Airline: string;
    'Aircraft Type': string;
    Current: string;
    Future: string;
    Historic: string;
    Total: string;
    Orders: string;
    'Unit Cost': string;
    'Total Cost (Current)': string;
    'Average Age': string;
  };

  const rows: FleetRow[] = [];

  await new Promise<void>((resolve, reject) => {
    createReadStream(FLEET_CSV_PATH)
      .pipe(csv())
      .on('data', (data) => rows.push(data as FleetRow))
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });

  console.log(`Read ${rows.length} fleet rows.`);

  // Cache for quick lookup
  const aircraftTypes = await prisma.aircraftType.findMany();

  const findAircraftTypeId = (raw: string): number | null => {
    const txt = (raw || '').trim();
    if (!txt) return null;

    // Exact name match
    let found = aircraftTypes.find((t) => t.name === txt);
    if (found) return found.id;

    // If type has variant, e.g. "Airbus A320-251N" -> "Airbus A320"
    const family = txt.split('-')[0].trim();
    if (family && family !== txt) {
      found = aircraftTypes.find((t) => t.name === family);
      if (found) return found.id;
    }

    return null;
  };

  // Create airlines first
  const airlineCache = new Map<string, number>();

  for (const row of rows) {
    const name = row.Airline?.trim();
    if (!name) continue;
    if (airlineCache.has(name)) continue;

    const parentName = row['Parent Airline']?.trim() || null;

    const airline = await prisma.airline.upsert({
      where: { name },
      update: { parentName: parentName ?? undefined },
      create: { name, parentName },
    });

    airlineCache.set(name, airline.id);
  }

  console.log(`Upserted ${airlineCache.size} airlines.`);

  // Now create AirlineFleet rows
  let created = 0;

  for (const row of rows) {
    const airlineName = row.Airline?.trim();
    if (!airlineName) continue;

    const airlineId = airlineCache.get(airlineName);
    if (!airlineId) continue;

    const aircraftTypeRaw = row['Aircraft Type']?.trim() || '';
    if (!aircraftTypeRaw) continue;

    const aircraftTypeId = findAircraftTypeId(aircraftTypeRaw);

    const num = (v: string) => {
      const n = parseFloat((v || '').replace(/[^0-9.\-]/g, ''));
      return isNaN(n) ? null : n;
    };

    await prisma.airlineFleet.create({
      data: {
        airlineId,
        aircraftTypeId: aircraftTypeId ?? undefined,
        aircraftTypeRaw,
        current: num(row.Current) ?? undefined,
        future: num(row.Future) ?? undefined,
        historic: num(row.Historic) ?? undefined,
        total: num(row.Total) ?? undefined,
        orders: num(row.Orders) ?? undefined,
        unitCost: num(row['Unit Cost']) ?? undefined,
        totalCostCurrent: num(row['Total Cost (Current)']) ?? undefined,
        averageAge: num(row['Average Age']) ?? undefined,
      },
    });

    created++;
  }

  console.log(`Inserted ${created} airline_fleet rows.`);
}

async function main() {
  try {
    await loadAircraftTypes();
    await loadFleetData();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

