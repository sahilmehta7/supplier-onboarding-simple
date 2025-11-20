import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FieldInputCheckbox } from "@/components/forms/field-input-checkbox";
import { FieldInputRadio } from "@/components/forms/field-input-radio";
import type { FormField } from "@prisma/client";

// Mock form field data
const createMockField = (overrides?: Partial<FormField>): FormField => ({
  id: "test-field-1",
  key: "test_field",
  label: "Test Field",
  type: "checkbox",
  required: false,
  placeholder: null,
  helpText: null,
  validation: null,
  options: null,
  order: 0,
  formConfigId: "test-config",
  sectionId: "test-section",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("Field Components - Shadcn Migration", () => {
  describe("FieldInputCheckbox", () => {
    it("renders checkbox field correctly", () => {
      const field = createMockField({
        type: "checkbox",
        label: "Accept Terms",
      });

      render(
        <FieldInputCheckbox
          field={field}
          value={false}
          onChange={vi.fn()}
        />
      );

      const checkbox = screen.getByRole("checkbox", { name: /accept terms/i });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it("displays checked state correctly", () => {
      const field = createMockField({
        type: "checkbox",
        label: "Subscribe",
      });

      render(
        <FieldInputCheckbox
          field={field}
          value={true}
          onChange={vi.fn()}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("calls onChange when clicked", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const field = createMockField({
        type: "checkbox",
        label: "Test Checkbox",
      });

      render(
        <FieldInputCheckbox
          field={field}
          value={false}
          onChange={onChange}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("displays error message when error is present", () => {
      const field = createMockField({
        type: "checkbox",
        label: "Required Field",
        required: true,
      });

      render(
        <FieldInputCheckbox
          field={field}
          value={false}
          onChange={vi.fn()}
          error="This field is required"
          touched={true}
        />
      );

      expect(screen.getByText("This field is required")).toBeInTheDocument();
    });

    it("displays required indicator", () => {
      const field = createMockField({
        type: "checkbox",
        label: "Required Field",
        required: true,
      });

      render(
        <FieldInputCheckbox
          field={field}
          value={false}
          onChange={vi.fn()}
        />
      );

      // Check that required asterisks are present (there may be multiple due to FieldWrapper and checkbox label)
      const requiredIndicators = screen.getAllByLabelText(/required/i);
      expect(requiredIndicators.length).toBeGreaterThan(0);
      // Verify the checkbox has aria-required attribute
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("aria-required", "true");
    });

    it("respects disabled state", () => {
      const field = createMockField({
        type: "checkbox",
        label: "Disabled Field",
      });

      render(
        <FieldInputCheckbox
          field={field}
          value={false}
          onChange={vi.fn()}
          disabled={true}
        />
      );

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeDisabled();
    });
  });

  describe("FieldInputRadio", () => {
    it("renders radio group correctly", () => {
      const field = createMockField({
        type: "radio",
        label: "Choose Option",
        options: {
          values: ["Option 1", "Option 2", "Option 3"],
        },
      });

      render(
        <FieldInputRadio
          field={field}
          value=""
          onChange={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Option 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Option 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Option 3")).toBeInTheDocument();
    });

    it("displays selected value correctly", () => {
      const field = createMockField({
        type: "radio",
        label: "Choose Option",
        options: {
          values: ["Option 1", "Option 2"],
        },
      });

      render(
        <FieldInputRadio
          field={field}
          value="Option 2"
          onChange={vi.fn()}
        />
      );

      const option2 = screen.getByLabelText("Option 2");
      expect(option2).toBeChecked();
    });

    it("calls onChange when option is selected", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const field = createMockField({
        type: "radio",
        label: "Choose Option",
        options: {
          values: ["Option 1", "Option 2"],
        },
      });

      render(
        <FieldInputRadio
          field={field}
          value=""
          onChange={onChange}
        />
      );

      const option1 = screen.getByLabelText("Option 1");
      await user.click(option1);

      expect(onChange).toHaveBeenCalledWith("Option 1");
    });

    it("displays error message when error is present", () => {
      const field = createMockField({
        type: "radio",
        label: "Required Field",
        required: true,
        options: {
          values: ["Option 1"],
        },
      });

      render(
        <FieldInputRadio
          field={field}
          value=""
          onChange={vi.fn()}
          error="Please select an option"
          touched={true}
        />
      );

      expect(screen.getByText("Please select an option")).toBeInTheDocument();
    });

    it("respects disabled state", () => {
      const field = createMockField({
        type: "radio",
        label: "Disabled Field",
        options: {
          values: ["Option 1"],
        },
      });

      render(
        <FieldInputRadio
          field={field}
          value=""
          onChange={vi.fn()}
          disabled={true}
        />
      );

      const option1 = screen.getByLabelText("Option 1");
      expect(option1).toBeDisabled();
    });

    it("handles empty options array", () => {
      const field = createMockField({
        type: "radio",
        label: "No Options",
        options: {
          values: [],
        },
      });

      render(
        <FieldInputRadio
          field={field}
          value=""
          onChange={vi.fn()}
        />
      );

      // Should render without crashing, just no radio buttons
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    });
  });
});

