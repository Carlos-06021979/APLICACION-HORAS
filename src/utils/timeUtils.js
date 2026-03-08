export const timeToDecimal = (timeString) => {
  if (!timeString) return 0;
  const [hours, minutes] = timeString.split(":").map(Number);
  const decimalMinutes = minutes / 60;
  return hours + decimalMinutes;
};

export const decimalToTime = (decimalValue) => {
  if (decimalValue === undefined || isNaN(decimalValue)) return "00:00";
  const hours = Math.floor(decimalValue);
  const minutes = Math.round((decimalValue - hours) * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export const formatDecimal = (decimalValue) => {
  return Number(decimalValue).toFixed(2);
};

export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  return timeToDecimal(endTime) - timeToDecimal(startTime);
};
