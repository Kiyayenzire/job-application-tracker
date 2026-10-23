import React from "react";
import { Trash2 } from "lucide-react";

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "tags", label: "Multi-select / tags" },
  { value: "select", label: "Single select" },
  { value: "boolean", label: "Checkbox / boolean" },
  { value: "number", label: "Number" },
];

export function CustomFieldManager({
  fields,
  onCreateField,
  onDeleteField,
  scope,
}) {
  const [name, setName] = React.useState("");
  const [fieldType, setFieldType] = React.useState("tags");
  const [options, setOptions] = React.useState("");
  const [error, setError] = React.useState("");
  const scopeLabel = scope === "company" ? "company" : "application";

  async function createField(event) {
    event.preventDefault();
    setError("");
    const fieldOptions = fieldType === "select"
      ? options.split(",").map((option) => option.trim()).filter(Boolean)
      : [];
    try {
      await onCreateField({
        name: name.trim(),
        field_type: fieldType,
        options: fieldOptions,
        scope,
      });
      setName("");
      setOptions("");
    } catch (createError) {
      setError(createError.message);
    }
  }

  async function deleteField(field) {
    setError("");
    try {
      await onDeleteField(field);
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  return (
    <section className="custom-field-manager" aria-label={`${scopeLabel} custom fields`}>
      <h2>Customize {scopeLabel} fields</h2>
      <p className="muted">
        Add fields that match your needs, such as a legal practice area or a technical stack.
      </p>

      <form className="custom-field-form" onSubmit={createField}>
        <div className="editor-grid">
          <label>
            Field name
            <input
              maxLength={50}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          <label>
            Field type
            <select
              onChange={(event) => setFieldType(event.target.value)}
              value={fieldType}
            >
              {fieldTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
          {fieldType === "select" && (
            <label>
              Options
              <input
                onChange={(event) => setOptions(event.target.value)}
                placeholder="Employment, Immigration, Corporate"
                required
                value={options}
              />
            </label>
          )}
        </div>
        <button className="primary-button" type="submit">Add custom field</button>
      </form>

      {error && <div className="error" role="alert">{error}</div>}
      {fields.length > 0 ? (
        <ul className="custom-field-list">
          {fields.map((field) => (
            <li key={field.id}>
              <span>
                <strong>{field.name}</strong>
                {" · "}
                {fieldTypes.find((type) => type.value === field.field_type)?.label || field.field_type}
                {field.options?.length > 0 ? ` · ${field.options.join(", ")}` : ""}
              </span>
              <button
                aria-label={`Delete ${field.name}`}
                className="icon-button danger-button"
                onClick={() => deleteField(field)}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No custom {scopeLabel} fields yet. Add fields that fit your needs.</p>
      )}
    </section>
  );
}
