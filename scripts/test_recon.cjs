const fs = require('fs');

async function main() {
  const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

  function parseCSVLine(line) {
    const values = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i+1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        values.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    values.push(cur);
    return values;
  }

  // 1. DHP KROSOK
  console.log('--- TESTING DHP KROSOK ---');
  const resKrosok = await fetch('https://docs.google.com/spreadsheets/d/1tyE6QWZOPhjLCsjvesU82QePF5RqEBToJsp1m0qQY_w/gviz/tq?tqx=out:csv&sheet=INTEGRASI%20DATA');
  const textKrosok = await resKrosok.text();
  const linesK = textKrosok.split(/\r?\n/);
  console.log('Krosok lines:', linesK.length);
  for (let idx = 0; idx < linesK.length; idx++) {
    const cols = parseCSVLine(linesK[idx]);
    if (cols.length < 9) continue;
    const rawTanggal = cols[2]?.trim() || '';
    const rawNama = cols[3]?.trim() || '';
    const rawHasil = cols[8]?.trim() || '';
    if (rawHasil && rawHasil !== '-' && rawHasil.toUpperCase() !== 'FALSE') {
      console.log(`Line ${idx}: Tgl="${rawTanggal}" Nama="${rawNama}" Hasil="${rawHasil}"`);
    }
  }

  // 2. DHP TEMBAKAU
  console.log('\n--- TESTING DHP TEMBAKAU ---');
  const resTbk = await fetch('https://docs.google.com/spreadsheets/d/1NDS55VchAgNAeJJbY12ANA8HyJDeNNhAZ33zbojpH5I/gviz/tq?tqx=out:csv&sheet=INTEGRASI%20DATA');
  const textTbk = await resTbk.text();
  const linesT = textTbk.split(/\r?\n/);
  console.log('Tembakau lines:', linesT.length);
  for (let idx = 0; idx < linesT.length; idx++) {
    const cols = parseCSVLine(linesT[idx]);
    if (cols.length < 9) continue;
    const rawTanggal = cols[2]?.trim() || '';
    const rawNama = cols[3]?.trim() || '';
    const rawHasil = cols[8]?.trim() || '';
    if (rawHasil && rawHasil !== '-' && rawHasil.toUpperCase() !== 'FALSE') {
      console.log(`Line ${idx}: Tgl="${rawTanggal}" Nama="${rawNama}" Hasil="${rawHasil}"`);
    }
  }

  // 3. DHP BLEND
  console.log('\n--- TESTING DHP BLEND ---');
  const resBlend = await fetch('https://docs.google.com/spreadsheets/d/1Fg3aNLsdkwXthNGxIsFJ9gbHy6Va6DokNV8IVpTnXDA/gviz/tq?tqx=out:csv&sheet=INTEGRASI%20DATA%20DHP%20BLEND');
  const textBlend = await resBlend.text();
  const linesB = textBlend.split(/\r?\n/);
  console.log('Blend lines:', linesB.length);
  for (let idx = 0; idx < linesB.length; idx++) {
    const cols = parseCSVLine(linesB[idx]);
    if (cols.length < 9) continue;
    const rawTanggal = cols[2]?.trim() || '';
    const rawMolen = cols[3]?.trim() || '';
    const rawMerk = cols[4]?.trim() || '';
    const rawHasil = cols[8]?.trim() || '';
    console.log(`Blend Line ${idx}: Tgl="${rawTanggal}" Molen="${rawMolen}" Merk="${rawMerk}" Hasil="${rawHasil}"`);
  }
}

main().catch(console.error);
