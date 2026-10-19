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
  onSaveProfile,
  profile,
}) {
  const [professionTemplate, setProfessionTemplate] = React.useState(
    profile.profession_template || "",
  );
  const [name, setName] = React.useState("");
  const [fieldType, setFieldType] = React.useState("tags");
  const [options, setOptions] = React.useState("");
  const [isFilterable, setIsFilterable] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setProfessionTemplate(profile.profession_template || "");
  }, [profile.profession_template]);

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    try {
      await onSaveProfile({ profession_template: professionTemplate });
    } catch (saveError) {
      setError(saveError.message);
    }
  }

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
        is_filterable: isFilterable,
        options: fieldOptions,
      });
      setName("");
      setOptions("");
    } catch (createError) {
      setError(createError.message);
    }
  }

  return (
    <section className="custom-field-manager" aria-label="Custom tracking fields">
      <h2>Custom data and tracking settings</h2>
      <form className="editor-grid" onSubmit={saveProfile}>
        <label>
          Profession template
          <input
            maxLength={100}
            onChange={(event) => setProfessionTemplate(event.target.value)}
            placeholder="e.g. Software / DevOps, Cybersecurity, Legal"
            value={professionTemplate}
          />
        </label>
        <button className="primary-button" type="submit">Save profile</button>
      </form>

      <form className="custom-field-form" onSubmit={createField}>
        <h3>Custom fields</h3>
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
                placeholder="AWS, Azure, GCP"
                required
                value={options}
              />
            </label>
          )}
          <label className="checkbox">
            <input
              checked={isFilterable}
              onChange={(event) => setIsFilterable(event.target.checked)}
              type="checkbox"
            />
            Searchable filter
          </label>
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
                {field.is_filterable ? " · Filterable" : " · Not filterable"}
                {field.options?.length > 0 ? ` · ${field.options.join(", ")}` : ""}
              </span>
              <button
                aria-label={`Delete ${field.name}`}
                className="icon-button danger-button"
                onClick={() => onDeleteField(field)}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No custom fields yet. Add fields that fit your profession.</p>
      )}
    </section>
  );
}
