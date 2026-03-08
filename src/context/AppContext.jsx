import React, { createContext, useContext, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
} from "date-fns";
import { timeToDecimal } from "../utils/timeUtils";

const AppContext = createContext();

export const entryTypes = [
  {
    id: "work_in",
    label: "Entrada al trabajo",
    color: "bg-emerald-500",
    isWorktime: true,
    type: "start",
  },
  {
    id: "lunch_out",
    label: "Salida al almuerzo",
    color: "bg-amber-500",
    isWorktime: false,
    type: "end",
  },
  {
    id: "lunch_in",
    label: "Entrada del almuerzo al trabajo",
    color: "bg-emerald-400",
    isWorktime: true,
    type: "start",
  },
  {
    id: "eat_out",
    label: "Salida a comer",
    color: "bg-orange-500",
    isWorktime: false,
    type: "end",
  },
  {
    id: "eat_in",
    label: "Entrada de la comida al trabajo",
    color: "bg-emerald-600",
    isWorktime: true,
    type: "start",
  },
  {
    id: "errand_out",
    label: "Salida asuntos",
    color: "bg-purple-500",
    isWorktime: false,
    type: "end",
  },
  {
    id: "errand_in",
    label: "Entrada de asuntos al trabajo",
    color: "bg-purple-400",
    isWorktime: true,
    type: "start",
  },
  {
    id: "medical_out",
    label: "Salida al Médico (pagado)",
    color: "bg-blue-500",
    isWorktime: true,
    type: "start",
  },
  {
    id: "medical_in",
    label: "Entrada del médico al trabajo",
    color: "bg-blue-400",
    isWorktime: true,
    type: "start",
  },
  {
    id: "training_out",
    label: "Salida a formación",
    color: "bg-indigo-500",
    isWorktime: true,
    type: "start",
  },
  {
    id: "work_out",
    label: "Salida del trabajo",
    color: "bg-rose-500",
    isWorktime: false,
    type: "end",
  },
  // Full-day absence types
  {
    id: "vacation",
    label: "🏖️ Vacaciones",
    color: "bg-sky-400",
    isWorktime: false,
    type: "fullDay",
    fullDay: true,
  },
  {
    id: "festivo",
    label: "📅 Festivo",
    color: "bg-teal-400",
    isWorktime: false,
    type: "fullDay",
    fullDay: true,
  },
  {
    id: "sickness_common",
    label: "🩺 Baja Enfermedad Común",
    color: "bg-amber-400",
    isWorktime: false,
    type: "fullDay",
    fullDay: true,
  },
  {
    id: "sickness_laboral",
    label: "🦺 Baja Laboral (AT)",
    color: "bg-orange-500",
    isWorktime: false,
    type: "fullDay",
    fullDay: true,
  },
  {
    id: "unjustified",
    label: "❌ Falta Injustificada",
    color: "bg-red-500",
    isWorktime: false,
    type: "fullDay",
    fullDay: true,
  },
];

export const AppProvider = ({ children }) => {
  // Configuración global persistida
  const [settings, setSettings] = useLocalStorage("hoursApp_settings", {
    salaryType: "hourly",
    monthlyNet: 0,
    hourlyRate: 8.31,
    rateSunday: 11.31,
    rateOvertime: 8.73,
    rateNightPlus: 1.4,
    rateSmiPlus: 0.81,
    hourlyBonus: 0.54,
    irpfPercent: 6.0,
    socialSecurityPercent: 4.7,
    unemploymentPercent: 1.55,
    meiPercent: 0.12,
    paidLunchDefault: false,
    theme: "system",
    // Baja configuration (Spanish law defaults)
    coverSicknessGap: false, // Does employer cover days 1-3?
    sicknessCommonUnpaidDays: 3, // Days without pay at start
    sicknessCommonPct1: 0, // % received days 1-3
    sicknessCommonPct2: 60, // % received days 4-20
    sicknessCommonPct3: 75, // % received days 21+
    sicknessLaboralPct: 75, // % received laboral accident (from day 1)
  });

  // Anticipos por mes: { "YYYY-MM": number }
  const [advances, setAdvances] = useLocalStorage("hoursApp_advances", {});

  // Ausencias por mes: { "YYYY-MM": { vacation:0, festivo:0, sicknessCommon:0, sicknessLaboral:0, unjustified:0 } }
  const [absences, setAbsences] = useLocalStorage("hoursApp_absences", {});

  const setAbsenceValue = (yearMonth, type, value) => {
    setAbsences((prev) => ({
      ...prev,
      [yearMonth]: { ...(prev[yearMonth] || {}), [type]: Number(value) || 0 },
    }));
  };

  // Registros de horas: Formato { "YYYY-MM-DD": { entries: [...], paidLunch: boolean } }
  const [records, setRecords] = useLocalStorage("hoursApp_records", {});

  // Funciones de utilidad para el contexto
  const addEntry = (date, entry) => {
    setRecords((prev) => {
      const dayRecord = prev[date] || {
        entries: [],
        paidLunch: settings.paidLunchDefault,
      };
      return {
        ...prev,
        [date]: { ...dayRecord, entries: [...dayRecord.entries, entry] },
      };
    });
  };

  const deleteEntry = (date, entryId) => {
    setRecords((prev) => {
      if (!prev[date]) return prev;
      return {
        ...prev,
        [date]: {
          ...prev[date],
          entries: prev[date].entries.filter((e) => e.id !== entryId),
        },
      };
    });
  };

  const updateEntry = (date, entryId, updatedEntry) => {
    setRecords((prev) => {
      if (!prev[date]) return prev;
      return {
        ...prev,
        [date]: {
          ...prev[date],
          entries: prev[date].entries.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  ...updatedEntry,
                  timeDecimal: updatedEntry.time
                    ? timeToDecimal(updatedEntry.time)
                    : e.timeDecimal,
                }
              : e,
          ),
        },
      };
    });
  };

  const deleteMonth = (yearMonth) => {
    if (
      !window.confirm(
        `¿Estás seguro de que quieres borrar todos los registros de ${yearMonth}?`,
      )
    )
      return;
    setRecords((prev) => {
      const newRecords = { ...prev };
      Object.keys(newRecords).forEach((date) => {
        if (date.startsWith(yearMonth)) {
          delete newRecords[date];
        }
      });
      return newRecords;
    });
  };

  const updateDaySettings = (date, overrides) => {
    setRecords((prev) => {
      const dayRecord = prev[date] || {
        entries: [],
        paidLunch: settings.paidLunchDefault,
      };
      return {
        ...prev,
        [date]: { ...dayRecord, ...overrides },
      };
    });
  };

  const updateAllRecordsSettings = (overrides) => {
    setRecords((prev) => {
      const newRecords = { ...prev };
      Object.keys(newRecords).forEach((date) => {
        newRecords[date] = { ...newRecords[date], ...overrides };
      });
      return newRecords;
    });
  };

  const calculateDayTotalDecimal = (dateStr) => {
    const day = records[dateStr];
    if (!day || !day.entries || day.entries.length === 0) {
      return { total: 0, normal: 0, extra: 0, sunday: 0, night: 0 };
    }

    const date = parseISO(dateStr);
    const isSunday = date.getDay() === 0; // 0 = Domingo

    let totalDecimal = 0;
    let nightDecimal = 0;
    let currentStartTime = null;
    let currentStartTimeStr = null;
    let currentLunchOutTime = null; // Track lunch out time for paid lunch calculation

    const sortedEntries = [...day.entries].sort((a, b) =>
      a.time.localeCompare(b.time),
    );

    sortedEntries.forEach((entry) => {
      const typeInfo = entryTypes.find((t) => t.id === entry.type);
      if (!typeInfo) return;

      if (typeInfo.type === "start") {
        currentStartTime = entry.timeDecimal;
        currentStartTimeStr = entry.time;

        // If this is the end of lunch ("Entrada del almuerzo"), calculate paid lunch duration
        if (
          entry.type === "lunch_in" &&
          currentLunchOutTime !== null &&
          day.paidLunch
        ) {
          const lunchDuration = entry.timeDecimal - currentLunchOutTime;
          totalDecimal += lunchDuration;

          // Re-check night hours for lunch period if applicable just in case
          const startH = currentLunchOutTime;
          const endH = entry.timeDecimal;
          const nightMorningEnd = 6;
          const nightEveningStart = 22;
          let nightInTramo = 0;
          nightInTramo += Math.max(0, Math.min(endH, nightMorningEnd) - startH);
          nightInTramo += Math.max(
            0,
            endH - Math.max(startH, nightEveningStart),
          );
          nightDecimal += nightInTramo > 0 ? nightInTramo : 0;
        }
        currentLunchOutTime = null; // Reset
      } else if (typeInfo.type === "end") {
        // If this is the start of lunch ("Salida al almuerzo"), track the time
        if (entry.type === "lunch_out") {
          currentLunchOutTime = entry.timeDecimal;
        }

        if (currentStartTime !== null) {
          const duration = entry.timeDecimal - currentStartTime;
          totalDecimal += duration;

          // Cálculo de nocturnidad (22:00 a 06:00)
          // Simplificado: si el tramo toca la noche, calculamos cuánto.
          const startH = currentStartTime;
          const endH = entry.timeDecimal;

          // Caso simple: tramo dentro del mismo día
          // Noche Mañana: 0-6, Noche Tarde: 22-24
          const nightMorningEnd = 6;
          const nightEveningStart = 22;

          let nightInTramo = 0;
          // Intersección con 0-6
          nightInTramo += Math.max(0, Math.min(endH, nightMorningEnd) - startH);
          // Intersección con 22-24
          nightInTramo += Math.max(
            0,
            endH - Math.max(startH, nightEveningStart),
          );

          nightDecimal += nightInTramo > 0 ? nightInTramo : 0;

          currentStartTime = null;
        }
      }
    });

    const total = totalDecimal >= 0 ? totalDecimal : 0;
    let breakdown = {
      total,
      normal: 0,
      extra: 0,
      sunday: 0,
      night: nightDecimal,
    };

    if (isSunday) {
      breakdown.sunday = total;
    } else {
      breakdown.normal = Math.min(total, 9);
      breakdown.extra = Math.max(0, total - 9);
    }

    return breakdown;
  };

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      records,
      advances,
      setAdvances,
      absences,
      setAbsenceValue,
      addEntry,
      deleteEntry,
      updateEntry,
      deleteMonth,
      updateDaySettings,
      updateAllRecordsSettings,
      calculateDayTotalDecimal,
    }),
    [settings, records, advances, absences],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
