#!/usr/bin/env node
// Generates a small but valid PDF containing extractable text, so RAG tests
// exercise a real retrieval path (the previous minimal PDF had no text and
// produced zero chunks, which sent the agent into a tool-calling loop).
// Usage: node make-test-pdf.mjs <output-path>
import { writeFileSync } from "node:fs";

const out = process.argv[2];
if (!out) {
  console.error("usage: node make-test-pdf.mjs <output-path>");
  process.exit(1);
}

const text =
  "Project Codename Briefing. The project codename is BLUEFIN-42. " +
  "The deployment window is Monday at 09:00 UTC. " +
  "The contact for this project is the platform team.";

const stream = `BT /F1 12 Tf 72 720 Td (${text.replace(/[()\\]/g, "\\$&")}) Tj ET`;

const objects = [
  "<</Type/Catalog/Pages 2 0 R>>",
  "<</Type/Pages/Kids[3 0 R]/Count 1>>",
  "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>",
  "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
];

let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(pdf.length);
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});

const xrefStart = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;

writeFileSync(out, pdf, "latin1");
console.log(`wrote ${out} (${pdf.length} bytes)`);
