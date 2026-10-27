const fs = require('fs');

async function test() {
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

  const csvUrlB = 'https://docs.google.com/spreadsheets/d/1Fg3aNLsdkwXthNGxIsFJ9gbHy6Va6DokNV8IVpTnXDA/gviz/tq?tqx=out:csv&sheet=INTEGRASI%20DATA%20DHP%20BLEND';
  const textB = await (await fetch(csvUrlB)).text();
  const linesB = textB.split(/\r?\n/);
  console.log('DHP Blend lines count:', linesB.length);
  for (let idx = 0; idx < linesB.length; idx++) {
    const cols = parseCSVLine(linesB[idx]);
    if (cols.length >= 9 && cols[8] && cols[8].trim() !== '0,0') {
      console.log(`Line ${idx}: Tgl="${cols[2]}", Molen="${cols[3]}", Merk="${cols[4]}", Hasil="${cols[8]}"`);
    }
  }
}

test().catch(console.error);
