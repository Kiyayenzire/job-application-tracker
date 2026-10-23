import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { jsPDF } from "jspdf";

function displayName(profile) {
  return [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    || profile.username
    || "Candidate";
}

function cvSections(cv) {
  return [
    ["Professional Summary", cv.professional_summary],
    ["Experience", cv.experience],
    ["Education", cv.education],
    ["Skills", cv.skills],
  ].filter(([, content]) => Array.isArray(content) ? content.length > 0 : Boolean(content));
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportCVAsWord(cv, profile = {}) {
  const paragraphs = [
    new Paragraph({
      text: displayName(profile),
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph(
      [profile.email, profile.location, profile.profession_template]
        .filter(Boolean)
        .join(" | "),
    ),
  ];

  for (const [heading, content] of cvSections(cv)) {
    paragraphs.push(new Paragraph({ text: heading, heading: HeadingLevel.HEADING_1 }));
    const lines = Array.isArray(content) ? content : content.split(/\r?\n/);
    paragraphs.push(...lines.filter(Boolean).map((line) => new Paragraph({
      children: [new TextRun(line)],
      bullet: heading === "Skills" ? { indent: 360 } : undefined,
    })));
  }

  const document = new Document({
    sections: [{ children: paragraphs }],
  });
  const blob = await Packer.toBlob(document);
  downloadBlob(blob, "candidate-cv.docx");
}

export function exportCVAsPDF(cv, profile = {}) {
  const pdf = new jsPDF();
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let y = margin;

  function write(text, { size = 11, bold = false, after = 6 } = {}) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(String(text), pageWidth - margin * 2);
    const lineHeight = size * 0.45;
    if (y + lines.length * lineHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(lines, margin, y);
    y += lines.length * lineHeight + after;
  }

  write(displayName(profile), { size: 20, bold: true, after: 4 });
  const contact = [profile.email, profile.location, profile.profession_template]
    .filter(Boolean)
    .join(" | ");
  if (contact) write(contact, { size: 10, after: 12 });

  for (const [heading, content] of cvSections(cv)) {
    write(heading, { size: 14, bold: true, after: 5 });
    const lines = Array.isArray(content) ? content : content.split(/\r?\n/);
    for (const line of lines.filter(Boolean)) write(line, { after: 4 });
    y += 4;
  }

  pdf.save("candidate-cv.pdf");
}
