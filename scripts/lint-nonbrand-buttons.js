const fs = require('fs');
const path = require('path');

const walk = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      filelist = walk(filepath, filelist);
    } else if (filepath.endsWith('.tsx')) {
      filelist.push(filepath);
    }
  });
  return filelist;
};

const BUTTON_REGEX = /<Button[^>]*className=["'`]([^"'`]*)(?!btn-primary|btn-secondary)[^"'`]*["'`][^>]*>/g;

const files = walk(path.join(__dirname, '../src'));
let hasError = false;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = BUTTON_REGEX.exec(content)) !== null) {
    if (!/btn-primary|btn-secondary/.test(match[1])) {
      console.warn(`Non-brand <Button> class found in ${file}:\n  ${match[0]}`);
      hasError = true;
    }
  }
});

if (hasError) {
  process.exit(1);
} else {
  console.log('All <Button> components use only .btn-primary or .btn-secondary.');
} 