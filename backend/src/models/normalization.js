export const collapseWhitespace = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().replace(/\s+/g, " ");
};

export const normalizeStringField = (doc, fieldName) => {
  if (typeof doc[fieldName] !== "string") {
    return;
  }

  doc[fieldName] = collapseWhitespace(doc[fieldName]);
};
