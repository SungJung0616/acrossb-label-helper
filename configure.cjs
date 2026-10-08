'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let settings;
  try {
    const source = new URL((await rl.question('AcrossB JOB_READY URL (HTTPS): ')).trim());
    const sheet = new URL((await rl.question('Google Sheets URL including gid: ')).trim());
    if (source.protocol !== 'https:' || source.username || source.password || source.port || source.hostname === 'docs.google.com') throw new Error('Enter a valid HTTPS AcrossB URL.');
    const match = /^\/spreadsheets\/d\/([A-Za-z0-9_-]+)\/edit\/?$/.exec(sheet.pathname);
    const gid = new URLSearchParams(sheet.hash.slice(1)).get('gid') || sheet.searchParams.get('gid');
    if (sheet.origin !== 'https://docs.google.com' || !match || !/^\d+$/.test(gid || '')) throw new Error('Enter a Google Sheets edit URL with a numeric gid.');
    settings = {sourceOrigin:source.origin, spreadsheetId:match[1], sheetId:gid, sheetName:'Label'};
  } finally { rl.close(); }
  const dest = path.join(__dirname, 'dist');
  fs.mkdirSync(dest, {recursive:true});
  for (const name of fs.readdirSync(path.join(__dirname,'src'))) fs.copyFileSync(path.join(__dirname,'src',name),path.join(dest,name));
  fs.writeFileSync(path.join(dest,'settings.js'),'globalThis.LabelSettings = '+JSON.stringify(settings,null,2)+';\n');
  const manifestPath = path.join(dest,'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  manifest.host_permissions = [settings.sourceOrigin+'/*','https://docs.google.com/spreadsheets/d/'+settings.spreadsheetId+'/*'];
  manifest.content_scripts[0].matches = [settings.sourceOrigin+'/flow/*'];
  manifest.content_scripts[0].js.unshift('settings.js');
  fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
  const bg = path.join(dest,'background.js');
  fs.writeFileSync(bg,fs.readFileSync(bg,'utf8').replace("importScripts('core.js'", "importScripts('settings.js', 'core.js'"));
  console.log('Ready: load the dist folder as an unpacked extension. Keep dist private.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
