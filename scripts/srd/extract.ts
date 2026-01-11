#!/usr/bin/env node
/**
 * Extract text from PDF pages using pdfjs-dist
 */

import * as fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface PageText {
  pageNum: number;
  text: string;
  lines: string[];
}

export async function extractPdfText(pdfPath: string): Promise<PageText[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  const pages: PageText[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    // Group text items into lines based on y-position
    const items = content.items as Array<{
      str: string;
      transform: number[];
    }>;

    const lineMap = new Map<number, string[]>();
    for (const item of items) {
      const y = Math.round(item.transform[5]); // y position
      if (!lineMap.has(y)) {
        lineMap.set(y, []);
      }
      lineMap.get(y)!.push(item.str);
    }

    // Sort by y descending (top to bottom) and join
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const lines = sortedYs.map((y) => lineMap.get(y)!.join(" ").trim());
    const text = lines.join("\n");

    pages.push({ pageNum: i, text, lines });
  }

  return pages;
}
