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
  let start = timeToDecimal(startTime);
  let end = timeToDecimal(endTime);
  if (end < start) {
    end += 24; // Turno que cruza la medianoche
  }
  return end - start;
};

export const calculateNightHours = (
  startH,
  endH,
  nightStartStr = "22:00",
  nightEndStr = "06:00"
) => {
  if (startH === undefined || endH === undefined) return 0;

  // Si endH es menor que startH, asumimos que la salida es al día siguiente (+24h)
  let sH = startH;
  let eH = endH < startH ? endH + 24 : endH;
  if (sH >= eH) return 0;

  const nightStartH = timeToDecimal(nightStartStr || "22:00");
  const nightEndH = timeToDecimal(nightEndStr || "06:00");

  let nightHours = 0;

  if (nightStartH > nightEndH) {
    // Franja nocturna que cruza la medianoche (ej: 22:00 a 06:00)
    // Tramo 1: Mañana del primer día [0, nightEndH]
    const morning1 = Math.max(0, Math.min(eH, nightEndH) - sH);
    // Tramo 2: Noche del primer día [nightStartH, 24]
    const evening1 = Math.max(
      0,
      Math.min(eH, 24) - Math.max(sH, nightStartH)
    );
    // Tramo 3: Mañana del segundo día [24, 24 + nightEndH]
    const morning2 = Math.max(
      0,
      Math.min(eH, 24 + nightEndH) - Math.max(sH, 24)
    );
    // Tramo 4: Noche del segundo día [24 + nightStartH, 48]
    const evening2 = Math.max(
      0,
      Math.min(eH, 48) - Math.max(sH, 24 + nightStartH)
    );

    nightHours =
      Math.max(0, morning1) +
      Math.max(0, evening1) +
      Math.max(0, morning2) +
      Math.max(0, evening2);
  } else if (nightStartH < nightEndH) {
    // Franja nocturna dentro del mismo día (ej: 20:00 a 23:00)
    const day1Overlap = Math.max(
      0,
      Math.min(eH, nightEndH) - Math.max(sH, nightStartH)
    );
    const day2Overlap = Math.max(
      0,
      Math.min(eH, 24 + nightEndH) - Math.max(sH, 24 + nightStartH)
    );
    nightHours = Math.max(0, day1Overlap) + Math.max(0, day2Overlap);
  }

  return nightHours;
};

export const calculateSegmentEarnings = (
  duration,
  startH,
  endH,
  isSunday,
  isFestivo,
  settings,
  cumulativeHours = 0,
  breakMinutes = 0
) => {
  // Deducir descanso no pagado de la duración si aplica
  const breakHours = (Number(breakMinutes) || 0) / 60;
  const effectiveDuration = Math.max(0, duration - breakHours);

  if (effectiveDuration <= 0) {
    return {
      gross: 0,
      net: 0,
      duration: 0,
      effectiveDuration: 0,
      nightInTramo: 0,
      normalInSeg: 0,
      extraInSeg: 0,
      sundayInSeg: 0,
      festiveInSeg: 0,
    };
  }

  const hoursRemainingNormal = Math.max(0, 9 - cumulativeHours);
  const isSpecialDay = isSunday || isFestivo;

  const normalInSeg = isSpecialDay
    ? 0
    : Math.min(effectiveDuration, hoursRemainingNormal);
  const extraInSeg = isSpecialDay
    ? 0
    : Math.max(0, effectiveDuration - normalInSeg);
  const sundayInSeg = isSunday ? effectiveDuration : 0;
  const festiveInSeg = !isSunday && isFestivo ? effectiveDuration : 0;

  const nightInTramo = calculateNightHours(
    startH,
    endH,
    settings.nightStart,
    settings.nightEnd
  );

  const baseG = normalInSeg * Number(settings.hourlyRate || 0);
  const sundayG = sundayInSeg * Number(settings.rateSunday || 0);
  const festiveG =
    festiveInSeg * Number(settings.rateFestive || settings.rateSunday || 0);
  const extraG = extraInSeg * Number(settings.rateOvertime || 0);
  const nightP = nightInTramo * Number(settings.rateNightPlus || 0);
  const smiP = normalInSeg * Number(settings.rateSmiPlus || 0);
  const suprP = effectiveDuration * Number(settings.hourlyBonus || 0);

  const gross = baseG + sundayG + festiveG + extraG + nightP + smiP + suprP;
  const deductionsPct =
    Number(settings.irpfPercent || 0) +
    Number(settings.socialSecurityPercent || 0) +
    Number(settings.unemploymentPercent || 0) +
    Number(settings.meiPercent || 0);

  const net = gross * (1 - deductionsPct / 100);

  return {
    gross,
    net,
    duration,
    effectiveDuration,
    nightInTramo,
    normalInSeg,
    extraInSeg,
    sundayInSeg,
    festiveInSeg,
  };
};

