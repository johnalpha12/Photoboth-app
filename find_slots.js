const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function getSlotBounds(imagePath) {
  const image = sharp(imagePath);
  const {width, height} = await image.metadata();
  const rawData = await image.ensureAlpha().raw().toBuffer();
  
  const rowTrans = new Int32Array(height);
  const colTrans = new Int32Array(width);
  
  for (let i = 0; i < rawData.length; i += 4) {
    if (rawData[i + 3] < 128) { // semi or fully transparent
      const idx = i / 4;
      const x = idx % width;
      const y = Math.floor(idx / width);
      rowTrans[y]++;
      colTrans[x]++;
    }
  }

  const yRanges = [];
  let inRange = false;
  let start = 0;
  for (let y = 0; y < height; y++) {
    if (rowTrans[y] > width * 0.1) {
      if (!inRange) { inRange = true; start = y; }
    } else {
      if (inRange) {
        yRanges.push({ start, end: y, size: y - start });
        inRange = false;
      }
    }
  }
  if (inRange) yRanges.push({ start, end: height-1, size: height-1 - start });

  const xRanges = [];
  inRange = false;
  start = 0;
  for (let x = 0; x < width; x++) {
    if (colTrans[x] > height * 0.05) {
      if (!inRange) { inRange = true; start = x; }
    } else {
      if (inRange) {
        xRanges.push({ start, end: x, size: x - start });
        inRange = false;
      }
    }
  }
  if (inRange) xRanges.push({ start, end: width-1, size: width-1 - start });

  const slots = [];
  for (const yr of yRanges) {
    if (yr.size < height * 0.05) continue; 
    for (const xr of xRanges) {
      if (xr.size < width * 0.1) continue;
      slots.push({
        x: xr.start,
        y: yr.start,
        w: xr.size,
        h: yr.size
      });
    }
  }
  return { width, height, slots };
}

async function run() {
  const dir = path.join(__dirname, 'public', 'templates');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  const config = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const {width, height, slots} = await getSlotBounds(path.join(dir, file));
    config.push({
      id: `template-${i + 1}`,
      name: `Template ${i + 1}`,
      image: `/templates/${file}`,
      width, height, slots
    });
  }
  console.log(JSON.stringify(config, null, 2));
}
run();
