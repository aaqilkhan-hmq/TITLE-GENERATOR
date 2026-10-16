function isEmptySpec(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return true;
  if (/^(unknown|n\/a|na|none|null|generic|-|not visible|not specified|unspecified|not shown|unavailable)$/i.test(text)) {
    return true;
  }
  return /\b(not visible|not specified|unspecified|not shown|unknown)\b/i.test(text);
}

function val(specs: Record<string, unknown>, key: string) {
  const text = String(specs[key] ?? "").trim();
  return isEmptySpec(text) ? "" : text;
}

function departmentForGw(specs: Record<string, unknown>) {
  const gender = val(specs, "Gender");
  if (/^men/i.test(gender)) return "Men";
  if (/^women/i.test(gender)) return "Women";
  if (/^kid/i.test(gender)) return "Kids";
  const department = val(specs, "Department");
  if (/^men/i.test(department)) return "Men";
  if (/^women/i.test(department)) return "Women";
  return "";
}

export function specsToFields(specs: Record<string, unknown>) {
  const lines: string[] = [];
  const draft = val(specs, "Product Name");
  if (draft) lines.push(`Title: ${draft}`);
  const pairs: [string, string][] = [
    ["Brand", val(specs, "Brand")],
    ["Type", val(specs, "Type")],
    ["Color", val(specs, "Color")],
    ["Size", val(specs, "Size")],
    ["Department", departmentForGw(specs)],
    ["Model", val(specs, "Model")],
    ["Model Number", val(specs, "Model Number")],
    ["Condition", val(specs, "Condition")],
  ];
  for (const [field, value] of pairs) {
    if (value) lines.push(`${field}: ${value}`);
  }
  return lines.join("\n");
}
