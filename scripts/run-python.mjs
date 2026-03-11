import { spawnSync } from "node:child_process";
import { delimiter } from "node:path";

const args = process.argv.slice(2);
const candidates = [
  process.env.PYTHON_BIN,
  process.env.PYTHON,
  "python",
  "py",
  "python3",
].filter(Boolean);

const env = {
  ...process.env,
  PYTHONPATH: process.env.PYTHONPATH
    ? `${process.env.PYTHONPATH}${delimiter}pipeline/src`
    : "pipeline/src",
};

for (const candidate of candidates) {
  const result = spawnSync(candidate, args, {
    stdio: "inherit",
    env,
    shell: false,
  });

  if (result.error) {
    continue;
  }

  process.exit(result.status ?? 1);
}

console.error(
  "No se encontro un interprete de Python. Define PYTHON_BIN o instala Python antes de ejecutar el pipeline."
);
process.exit(1);
