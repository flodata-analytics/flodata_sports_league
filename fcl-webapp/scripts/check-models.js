/**
 * Simple script to check for expected model files under public/models
 * Run from the repo root with: node ./scripts/check-models.js
 */
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'public', 'models');
const expected = ['Ayush.glb', 'Shubhankit.glb'];

expected.forEach(name => {
  const p = path.join(modelsDir, name);
  if (fs.existsSync(p)) {
    console.log(`OK: ${name} exists`);
  } else {
    console.warn(`MISSING: ${name} - place it at ${p}`);
  }
});
