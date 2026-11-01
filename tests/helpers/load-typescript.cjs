const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
function load(file, mocks = {}, env = {}) {
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process: { env, cwd: () => root }, URL, URLSearchParams,
    AbortSignal, fetch, File, Blob, FormData, console, require(name) {
      if (name in mocks) return mocks[name];
      if (name === 'server-only') return {};
      const base = name.startsWith('@/') ? name.slice(2) : name.startsWith('./') ? path.join(path.dirname(file), name) : null;
      if (!base) return require(name);
      return load(path.extname(base) ? base : base + (fs.existsSync(path.join(root, base + '.ts')) ? '.ts' : '.tsx'), mocks, env);
    } });
  return module.exports;
}
module.exports = { load };
