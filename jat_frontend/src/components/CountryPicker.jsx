import React from "react";

export function CountryPicker({
  allowAll = false,
  countries,
  label,
  onChange,
  value,
}) {
  const selectedCountry = countries.find((country) => country.code === value);
  const [query, setQuery] = React.useState(selectedCountry?.name || "");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (selectedCountry) setQuery(selectedCountry.name);
    else if (value) setQuery(value);
  }, [selectedCountry?.code, selectedCountry?.name]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingCountries = normalizedQuery
    ? countries.filter((country) =>
        country.name.toLocaleLowerCase().startsWith(normalizedQuery),
      )
    : [];

  function chooseCountry(country) {
    onChange(country.code);
    setQuery(country.name);
    setOpen(false);
  }

  return (
    <div className="country-picker">
      <label>
        {label}
        <input
          aria-autocomplete="list"
          aria-controls={`${label.replace(/\s+/g, "-").toLowerCase()}-options`}
          aria-expanded={open && matchingCountries.length > 0}
          autoComplete="off"
          required={!allowAll}
          onBlur={() => window.setTimeout(() => setOpen(false), 100)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            onChange("");
          }}
          onFocus={() => {
            if (normalizedQuery) setOpen(true);
          }}
          role="combobox"
          value={query}
        />
      </label>
      {allowAll && (
        <button
          className="country-clear"
          onClick={() => {
            onChange("");
            setQuery("");
            setOpen(false);
          }}
          type="button"
        >
          All countries
        </button>
      )}
      {open && matchingCountries.length > 0 && (
        <ul
          className="country-options"
          id={`${label.replace(/\s+/g, "-").toLowerCase()}-options`}
          role="listbox"
        >
          {matchingCountries.map((country) => (
            <li key={country.code} role="presentation">
              <button
                aria-selected={country.code === value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseCountry(country)}
                role="option"
                type="button"
              >
                {country.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
