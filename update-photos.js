#!/usr/bin/env node
/**
 * Script to dynamically generate photos.json from files in the data/ folder
 * Run this whenever you add new photos: node update-photos.js
 */

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const outputFile = path.join(dataDir, 'photos.json');

// Supported image extensions
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.heic'];

try {
  // Read all files in data directory
  const files = fs.readdirSync(dataDir);
  
  // Filter for image files and sort alphabetically
  const photos = files
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    })
    .sort()
    .map(file => `data/${file}`);
  
  // Write to photos.json
  fs.writeFileSync(outputFile, JSON.stringify(photos, null, 2));
  
  console.log(`✅ Generated photos.json with ${photos.length} photos:`);
  photos.forEach(photo => console.log(`   - ${photo}`));
} catch (error) {
  console.error('❌ Error generating photos.json:', error.message);
  process.exit(1);
}

