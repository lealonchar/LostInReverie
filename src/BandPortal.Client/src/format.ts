export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatMoney(value: number) {
  const currency = import.meta.env.VITE_CURRENCY ?? "MKD";

  if (currency.toUpperCase() === "MKD") {
    return `${new Intl.NumberFormat(undefined, {
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2
    }).format(value)} den`;
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency
  }).format(value);
}
