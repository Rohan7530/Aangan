// One-time setup for the Python AI service: creates ai/.venv with Python 3.14
// and installs ai/requirements.txt (+ dev requirements for the tests).
// Usage: npm run setup:ai
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const win = process.platform === 'win32';
const venvPy = win ? 'ai/.venv/Scripts/python.exe' : 'ai/.venv/bin/python';

function run(cmd, args) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit' });
}

function findPython() {
  const candidates = win ? [['py', ['-3.14']], ['python', []]] : [['python3.14', []], ['python3', []]];
  for (const [cmd, pre] of candidates) {
    try {
      const v = execFileSync(cmd, [...pre, '-c', 'import sys; print(sys.version_info[:2] >= (3, 12))']).toString().trim();
      if (v === 'True') return [cmd, pre];
    } catch {
      // try the next one
    }
  }
  throw new Error('Python 3.12+ not found (3.14 recommended). Install it from python.org.');
}

if (!existsSync(venvPy)) {
  const [cmd, pre] = findPython();
  run(cmd, [...pre, '-m', 'venv', 'ai/.venv']);
}
run(venvPy, ['-m', 'pip', 'install', '--disable-pip-version-check', '-q', '-r', 'ai/requirements.txt', '-r', 'ai/requirements-dev.txt']);
console.log('AI service ready. `npm run dev` starts it automatically.');
