import fs from 'fs';

const filepath = 'node_modules/lucide-react-taro/dist/esm/index.js';
const content = fs.readFileSync(filepath, 'utf8');

if (content.includes('// H5端: 用原生img渲染SVG')) {
  console.log('lucide-react-taro already patched');
  process.exit(0);
}

// Revert any previous patch first
const prevPatched = `    // H5端: 用CSS background-image渲染SVG (Taro Image组件不支持data:image/svg+xml)
    if (typeof window !== "undefined" && !(typeof tt !== "undefined") && !(typeof wx !== "undefined")) {
      return /* @__PURE__ */ jsx2(
        "div",
        {
          className,
          style: {
            width: sizeValue,
            height: sizeValue,
            display: "inline-block",
            verticalAlign: "middle",
            backgroundImage: \`url("\${src}")\`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            ...style
          },
          ...props
        }
      );
    }
    // 小程序端: 保留Taro Image组件
    return /* @__PURE__ */ jsx2(
      Image,
      {
        src,
        className,
        style: {
          width: sizeValue,
          height: sizeValue,
          ...style
        },
        ...props
      }
    );`;

const originalCode = `    return /* @__PURE__ */ jsx2(
      Image,
      {
        src,
        className,
        style: {
          width: sizeValue,
          height: sizeValue,
          ...style
        },
        ...props
      }
    );`;

let target = content;
// Try to revert previous patch first
if (target.includes(prevPatched)) {
  target = target.replace(prevPatched, originalCode);
}

const newCode = `    // H5端: 用原生img渲染SVG (Taro Image组件在H5端对data:image/svg+xml支持不完善)
    if (typeof window !== "undefined" && !(typeof tt !== "undefined") && !(typeof wx !== "undefined")) {
      return /* @__PURE__ */ jsx2(
        "img",
        {
          src,
          className,
          style: {
            width: sizeValue,
            height: sizeValue,
            display: "inline-block",
            verticalAlign: "middle",
            ...style
          },
          ...props
        }
      );
    }
    // 小程序端: 保留Taro Image组件
    return /* @__PURE__ */ jsx2(
      Image,
      {
        src,
        className,
        style: {
          width: sizeValue,
          height: sizeValue,
          ...style
        },
        ...props
      }
    );`;

if (target.includes(originalCode)) {
  fs.writeFileSync(filepath, target.replace(originalCode, newCode));
  console.log('lucide-react-taro patched successfully');
} else {
  console.warn('Warning: Could not patch lucide-react-taro (pattern not found)');
}
