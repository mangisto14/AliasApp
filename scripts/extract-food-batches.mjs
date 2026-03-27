import fs from "fs";
import path from "path";

const p =
  "C:/Users/Media/.cursor/projects/c-Users-repo-Claude-AliasApp/agent-transcripts/a4dd577e-6428-4b67-987c-612c46bcced5/a4dd577e-6428-4b67-987c-612c46bcced5.jsonl";
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean);

function extract(line) {
  const o = JSON.parse(line);
  const t = o.message.content[0].text;
  const m = t.match(/```json\n([\s\S]*?)\n```/);
  return m ? JSON.parse(m[1]) : null;
}

const b1 = extract(lines[31]);
const b2 = extract(lines[34]);
const out = path.join(process.cwd(), "scripts", "food-batches-1-2.json");
fs.writeFileSync(out, JSON.stringify({ batch1: b1, batch2: b2 }, null, 2) + "\n");
console.log("batch1", b1.length, "batch2", b2.length, "->", out);
