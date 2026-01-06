function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toFilename(value: string, fallback: string, extension: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = slug || fallback;
  return `${base}.${extension}`;
}

export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function openPrintWindow(title: string, content: string): void {
  const escapedTitle = escapeHtml(title);
  const escapedContent = escapeHtml(content);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapedTitle}</title>
<style>
body { font-family: "Georgia", serif; padding: 24px; color: #1e1a16; }
h1 { font-size: 24px; margin-bottom: 12px; }
pre { white-space: pre-wrap; font-family: "Georgia", serif; line-height: 1.6; }
</style>
</head>
<body>
<h1>${escapedTitle}</h1>
<pre>${escapedContent}</pre>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
