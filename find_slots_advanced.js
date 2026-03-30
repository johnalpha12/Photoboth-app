const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function getAdvancedSlots(imagePath) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;
  const rawData = await image.ensureAlpha().raw().toBuffer();
  
  const visited = new Uint8Array(width * height);
  const slots = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      
      const alpha = rawData[idx * 4 + 3];
      if (alpha < 60) {
        let minX = x, maxX = x, minY = y, maxY = y;
        let count = 0;
        const queue = [idx];
        visited[idx] = 1;
        
        let qIdx = 0;
        while(qIdx < queue.length) {
          const curr = queue[qIdx++];
          const cx = curr % width;
          const cy = Math.floor(curr / width);
          
          if(cx < minX) minX = cx;
          if(cx > maxX) maxX = cx;
          if(cy < minY) minY = cy;
          if(cy > maxY) maxY = cy;
          count++;
          
          if (cx > 0) {
            const n = curr - 1;
            if (!visited[n] && rawData[n * 4 + 3] < 60) {
              visited[n] = 1;
              queue.push(n);
            }
          }
          if (cx < width - 1) {
            const n = curr + 1;
            if (!visited[n] && rawData[n * 4 + 3] < 60) {
              visited[n] = 1;
              queue.push(n);
            }
          }
          if (cy > 0) {
            const n = curr - width;
            if (!visited[n] && rawData[n * 4 + 3] < 60) {
              visited[n] = 1;
              queue.push(n);
            }
          }
          if (cy < height - 1) {
            const n = curr + width;
            if (!visited[n] && rawData[n * 4 + 3] < 60) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }
        
        if (count > (width * height * 0.005)) {
          slots.push({
            x: minX,
            y: minY,
            w: maxX - minX + 1,
            h: maxY - minY + 1
          });
        }
      }
    }
  }
  return { width, height, slots: slots.sort((a,b) => {
    // Sort primarily by Y, then by X
    if (Math.abs(a.y - b.y) > 20) return a.y - b.y;
    return a.x - b.x;
  }) };
}

async function run() {
  const dir = path.join(__dirname, 'public', 'templates');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  const config = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log('Processing', file);
    const {width, height, slots} = await getAdvancedSlots(path.join(dir, file));
    config.push({
      id: `template-${i + 1}`,
      name: `Template ${i + 1}`,
      image: `/templates/${file}`,
      width, height, slots
    });
  }
  
  const tsHeader = `export interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Template {
  id: string;
  name: string;
  image: string;
  width: number;
  height: number;
  slots: Slot[];
}

export const templates: Template[] = ` + JSON.stringify(config, null, 2) + `;\n`;

  fs.writeFileSync('src/config/templates.ts', tsHeader);
  console.log('Successfully updated src/config/templates.ts');
}

run().catch(console.error);
