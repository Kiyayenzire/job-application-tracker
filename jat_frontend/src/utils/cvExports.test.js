import { afterEach, describe, expect, it, vi } from "vitest";

import { exportCVAsPDF, exportCVAsWord } from "./cvExports";

const pdfSave = vi.hoisted(() => vi.fn());

vi.mock("jspdf", () => ({
  jsPDF: class {
    internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
    };
    setFont() {}
    setFontSize() {}
    splitTextToSize(text) { return [text]; }
    text() {}
    addPage() {}
    save = pdfSave;
  },
}));

describe("CV exports", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("creates a downloadable Word document", async () => {
    const createObjectURL = vi.fn(() => "blob:cv");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });

    await exportCVAsWord(
      {
        professional_summary: "Experienced lawyer.",
        experience: ["Associate Attorney"],
        education: ["LLB"],
        skills: ["Legal research"],
      },
      { first_name: "Alex", last_name: "Morgan" },
    );

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.contexts[0].download).toBe("candidate-cv.docx");
  });

  it("saves the PDF with the expected filename", () => {
    exportCVAsPDF(
      {
        professional_summary: "Experienced lawyer.",
        experience: ["Associate Attorney"],
        education: ["LLB"],
        skills: ["Legal research"],
      },
      { first_name: "Alex", last_name: "Morgan" },
    );

    expect(pdfSave).toHaveBeenCalledWith("candidate-cv.pdf");
  });
});
