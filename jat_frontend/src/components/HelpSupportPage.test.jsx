import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HelpSupportPage } from "./HelpSupportPage";

describe("HelpSupportPage", () => {
  it("shows the requested support email", () => {
    render(<HelpSupportPage />);

    expect(screen.getByRole("link", { name: "zoelewis.58@gmail.com" })).toHaveAttribute(
      "href",
      "mailto:zoelewis.58@gmail.com",
    );
  });
});
