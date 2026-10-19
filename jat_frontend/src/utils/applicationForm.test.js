import { describe, expect, it } from "vitest";

import {
  buildApplicationPayload,
  buildCustomData,
  canSubmitApplication,
  getNextStep,
  isVacancyDetailsComplete,
  parseKeywords,
} from "./applicationForm";

describe("application form rules", () => {
  it("parses comma-separated keywords and ignores empty entries", () => {
    expect(parseKeywords(" python, , django ,react ")).toEqual([
      "python",
      "django",
      "react",
    ]);
  });

  it("allows submission only within both selection limits", () => {
    expect(
      canSubmitApplication({
        keywords: Array(5).fill("skill"),
        otherRequirements: Array(7).fill("requirement"),
      }),
    ).toBe(true);
    expect(
      canSubmitApplication({
        keywords: Array(18).fill("skill"),
        otherRequirements: Array(7).fill("requirement"),
      }),
    ).toBe(false);
    expect(
      canSubmitApplication({
        keywords: Array(5).fill("skill"),
        otherRequirements: Array(6).fill("requirement"),
      }),
    ).toBe(false);
  });

  it("builds a clean payload and clears levels unless the requirement is yes", () => {
    expect(
      buildApplicationPayload({
        keywords: "python, django, react, mysql, docker",
        vacancy_status: "current",
        outside_eu_response: "",
        hiring_pattern: "",
        english_requirement: "Yes",
        english_level: "Advanced",
        german_requirement: "No",
        german_level: "Beginner",
        custom_requirement: "unused form state",
      }),
    ).toEqual({
      keywords: ["python", "django", "react", "mysql", "docker"],
      vacancy_status: "current",
      outside_eu_response: "",
      hiring_pattern: "",
      english_requirement: "Yes",
      english_level: "Advanced",
      german_requirement: "No",
      german_level: "",
    });
  });

  it("maps vacancy and outside-EU answers to their next steps", () => {
    expect(getNextStep("current", "")).toBe("Apply now");
    expect(getNextStep("none", "yes_open")).toBe("Target");
    expect(getNextStep("none", "maybe")).toBe("Re-contact later");
    expect(getNextStep("none", "no")).toBe("Remove for now");
  });

  it("requires the decision and hiring pattern when applicable", () => {
    expect(isVacancyDetailsComplete({
      vacancyStatus: "current",
      outsideEUResponse: "",
      hiringPattern: "",
    })).toBe(true);
    expect(isVacancyDetailsComplete({
      vacancyStatus: "none",
      outsideEUResponse: "",
      hiringPattern: "",
    })).toBe(false);
    expect(isVacancyDetailsComplete({
      vacancyStatus: "none",
      outsideEUResponse: "yes_open",
      hiringPattern: "",
    })).toBe(false);
    expect(isVacancyDetailsComplete({
      vacancyStatus: "none",
      outsideEUResponse: "maybe",
      hiringPattern: "",
    })).toBe(true);
  });

  it("normalizes tags and numeric dynamic fields while preserving booleans", () => {
    expect(
      buildApplicationPayload(
        {
          custom_data: {
            tech_stack: "Kubernetes, AWS",
            salary_floor: "85000",
            clearance: false,
          },
        },
        [
          { key: "tech_stack", field_type: "tags" },
          { key: "salary_floor", field_type: "number" },
          { key: "clearance", field_type: "boolean" },
        ],
      ).custom_data,
    ).toEqual({
      tech_stack: ["Kubernetes", "AWS"],
      salary_floor: 85000,
      clearance: false,
    });
  });

  it("omits blank optional custom fields", () => {
    expect(buildCustomData(
      { practice_area: "", tech_stack: "" },
      [
        { key: "practice_area", field_type: "text" },
        { key: "tech_stack", field_type: "tags" },
      ],
    )).toEqual({});
  });

  it("preserves historical values after a custom field definition is removed", () => {
    expect(buildCustomData(
      { retired_field: ["legacy value"] },
      [],
    )).toEqual({ retired_field: ["legacy value"] });
  });
});
