const fs = require('fs');
const path = require('path');
const potrace = require('potrace');

const root = process.cwd();
const inputs = [
  {
    src: path.join(root, 'images.png'),
    out: path.join(root, 'src/assets/usm-mark.svg'),
  },
  {
    src: path.join(root, 'usm.png'),
    out: path.join(root, 'src/assets/usm-wordmark.svg'),
  },
];

const BRAND_BLUE = '#0B2A78';
const BRAND_WHITE = '#FFFFFF';

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

const luminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
};

const remapFills = (svg) => {
  const fillRegex = /fill=\"(#[0-9a-fA-F]{6})\"/g;
  const fills = new Set();
  let match;
  while ((match = fillRegex.exec(svg)) !== null) {
    fills.add(match[1].toUpperCase());
  }

  if (fills.size === 0) return svg;

  const fillList = Array.from(fills).sort((a, b) => luminance(a) - luminance(b));
  const darkest = fillList[0];
  const lightest = fillList[fillList.length - 1];

  let updated = svg;
  const replacements = new Map();
  replacements.set(darkest, BRAND_BLUE);
  replacements.set(lightest, BRAND_WHITE);

  replacements.forEach((value, key) => {
    const regex = new RegExp(`fill=\\\"${key}\\\"`, 'g');
    updated = updated.replace(regex, `fill=\"${value}\"`);
  });

  return updated;
};

const traceOne = (input) => {
  return new Promise((resolve, reject) => {
    potrace.posterize(
      input.src,
      {
        steps: 2,
        background: 'transparent',
        blackOnWhite: true,
      },
      (err, svg) => {
        if (err) {
          reject(err);
          return;
        }
        const branded = remapFills(svg);
        fs.mkdirSync(path.dirname(input.out), { recursive: true });
        fs.writeFileSync(input.out, branded, 'utf8');
        resolve();
      }
    );
  });
};

const run = async () => {
  for (const input of inputs) {
    if (!fs.existsSync(input.src)) {
      console.error(`Missing input file: ${input.src}`);
      process.exitCode = 1;
      continue;
    }
    await traceOne(input);
    console.log(`Generated ${input.out}`);
  }
};

run().catch((err) => {
  console.error('Tracing failed:', err);
  process.exit(1);
});
