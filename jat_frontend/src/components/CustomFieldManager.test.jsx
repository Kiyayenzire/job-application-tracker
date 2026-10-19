import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CustomFieldManager } from "./CustomFieldManager";

describe("CustomFieldManager", () => {
  it("saves a profession template and creates a searchable tags field", async () => {
    const onSaveProfile = vi.fn();
    const onCreateField = vi.fn();
    render(
      <CustomFieldManager
        fields={[]}
        onCreateField={onCreateField}
        onDeleteField={vi.fn()}
        onSaveProfile={onSaveProfile}
        profile={{ profession_template: "Software / DevOps" }}
      />,
    );

    await userEvent.clear(screen.getByLabelText("Profession template"));
    await userEvent.type(screen.getByLabelText("Profession template"), "Cybersecurity");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => {
      expect(onSaveProfile).toHaveBeenCalledWith({
        profession_template: "Cybersecurity",
      });
    });

    await userEvent.type(screen.getByLabelText("Field name"), "Tech Stack");
    await userEvent.selectOptions(screen.getByLabelText("Field type"), "tags");
    await userEvent.click(screen.getByRole("button", { name: "Add custom field" }));

    await waitFor(() => {
      expect(onCreateField).toHaveBeenCalledWith({
        name: "Tech Stack",
        field_type: "tags",
        is_filterable: true,
        options: [],
      });
    });
  });
});
