const settlementCreatedAt = 1782808238; // Example timestamp from error: Tue, 30 Jun 2026 08:30:38 GMT
const date = new Date(settlementCreatedAt * 1000);
const dateString = date.toLocaleDateString("en-US", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const [month, day, year] = dateString.split("/");
console.log({ dateString, year, month, day });
