export const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // replace spaces and non-alphanumerics with "-"
    .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes
};
