const fs = require('fs');
const path = require('path');

const cwd = process.cwd();

const iconMap = {
  'calculator': 'calculator',
  'calendar': 'calendar',
  'clipboard': 'clipboard',
  'file-text': 'file-text',
  'message-square': 'message-square',
  'palette': 'palette',
  'qr-code': 'qr-code',
  'settings': 'settings',
  'pipette': 'pipette',
  'clock': 'clock',
  'search': 'search',
  'trash-2': 'trash-2',
  'plus': 'plus',
  'copy': 'copy',
  'check': 'check',
  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'pencil': 'pencil',
  'eye': 'eye',
  'eye-off': 'eye-off',
  'folder': 'folder',
  'folder-plus': 'folder-plus',
  'image': 'image',
  'package': 'package',
  'star': 'star',
  'sun': 'sun',
  'moon': 'moon',
  'monitor': 'monitor',
  'rotate-ccw': 'rotate-ccw',
  'arrow-left': 'arrow-left',
  'pin': 'pin',
  'layout-grid': 'layout-grid',
  'x': 'x',
  'send': 'send',
  'check-circle': 'circle-check',
  'x-circle': 'circle-x',
  'info': 'info',
  'alert-circle': 'circle-alert',
  'x-octagon': 'octagon-x'
};

// Icons base directory
const iconsBase = path.join(cwd, 'node_modules/lucide-vue-next/dist/esm/icons');

function parseIconArray(iconArrayStr) {
  const elements = [];

  // Match elements like ["rect", { width: "16", height: "20", ... }] or ["path", { d: "..." }]
  const elemRegex = /\[\s*"(\w+)"\s*,\s*\{([^}]*)\}\s*\]/g;

  let elemMatch;
  while ((elemMatch = elemRegex.exec(iconArrayStr)) !== null) {
    const type = elemMatch[1];
    const attrsStr = elemMatch[2];

    // Parse attributes from the object
    const attrs = {};
    const attrRegex = /(\w+)\s*:\s*"([^"]*)"/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrsStr)) !== null) {
      attrs[attrMatch[1]] = attrMatch[2];
    }

    if (type === 'path') {
      elements.push({ tag: 'path', attrs: { d: attrs.d } });
    } else if (type === 'line') {
      elements.push({ tag: 'line', attrs: { x1: attrs.x1, y1: attrs.y1, x2: attrs.x2, y2: attrs.y2 } });
    } else if (type === 'rect') {
      const rectAttrs = { width: attrs.width, height: attrs.height, x: attrs.x, y: attrs.y };
      if (attrs.rx) rectAttrs.rx = attrs.rx;
      if (attrs.ry) rectAttrs.ry = attrs.ry;
      elements.push({ tag: 'rect', attrs: rectAttrs });
    } else if (type === 'circle') {
      elements.push({ tag: 'circle', attrs: { cx: attrs.cx, cy: attrs.cy, r: attrs.r } });
    } else if (type === 'polyline') {
      elements.push({ tag: 'polyline', attrs: { points: attrs.points } });
    } else if (type === 'polygon') {
      elements.push({ tag: 'polygon', attrs: { points: attrs.points } });
    } else if (type === 'ellipse') {
      elements.push({ tag: 'ellipse', attrs: { cx: attrs.cx, cy: attrs.cy, rx: attrs.rx, ry: attrs.ry } });
    }
  }

  return elements;
}

function createSvg(name, iconArray) {
  let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';

  iconArray.forEach(el => {
    const attrsStr = Object.entries(el.attrs)
      .filter(([k, v]) => v !== undefined)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');
    svg += `<${el.tag} ${attrsStr}></${el.tag}>`;
  });

  svg += '</svg>';
  return svg;
}

Object.entries(iconMap).forEach(([name, fileName]) => {
  const iconPath = path.join(iconsBase, fileName + '.js');

  if (!fs.existsSync(iconPath)) {
    console.log(`${name}: FILE NOT FOUND (${fileName})`);
    return;
  }

  const content = fs.readFileSync(iconPath, 'utf8');

  // Extract the icon definition array
  const match = content.match(/createLucideIcon\([^,]+,\s*(\[[\s\S]*?\])\)/);
  if (!match) {
    console.log(`${name}: PARSE ERROR`);
    return;
  }

  const iconArrayStr = match[1];
  const elements = parseIconArray(iconArrayStr);

  if (elements.length === 0) {
    console.log(`${name}: NO ELEMENTS`);
    return;
  }

  const svg = createSvg(name, elements);

  // Find the plugin directory
  const pluginDir = path.join(cwd, 'packages');
  const plugins = fs.readdirSync(pluginDir);

  let saved = false;
  for (const plugin of plugins) {
    const pluginPath = path.join(pluginDir, plugin);
    const iconsDir = path.join(pluginPath, 'src/assets/icons');

    if (fs.existsSync(iconsDir)) {
      const existingFile = path.join(iconsDir, name + '.svg');
      if (fs.existsSync(existingFile)) {
        fs.writeFileSync(existingFile, svg);
        console.log(`${name}: OK (in ${plugin})`);
        saved = true;
        break;
      }
    }
  }

  if (!saved) {
    console.log(`${name}: NO PLUGIN FOUND`);
  }
});

console.log('Done!');
