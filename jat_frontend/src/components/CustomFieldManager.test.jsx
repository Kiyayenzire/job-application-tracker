import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CustomFieldManager } from "./CustomFieldManager";

describe("CustomFieldManager", () => {
  it("creates fields scoped to the page being customized", async () => {
    const user = userEvent.setup();
    const onCreateField = vi.fn();
    render(
      <CustomFieldManager
        fields={[]}
        onCreateField={onCreateField}
        onDeleteField={vi.fn()}
        scope="company"
      />,
    );

    await user.type(screen.getByLabelText("Field name"), "Practice Area");
    await user.click(screen.getByRole("button", { name: "Add custom field" }));

    expect(onCreateField).toHaveBeenCalledWith({
      name: "Practice Area",
      field_type: "tags",
      options: [],
      scope: "company",
    });
  });
});
