import React, { useState, useEffect, useMemo, useRef } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAppContext, entryTypes } from "../../context/AppContext";
import { timeToDecimal } from "../../utils/timeUtils";
import {
  PlusCircle,
  Trash2,
  Euro,
  Pencil,
  Check,
  X,
  Calendar,
} from "lucide-react";

const Dashboard = () => {
  const {
    records,
    settings,
    addEntry,
    deleteEntry,
    updateEntry,
    calculateDayTotalDecimal,
  } = useAppContext();
  const [currentTime, setCurrentTime] = useState("");
  const [selectedType, setSelectedType] = useState(entryTypes[0].id);
  const [manualTime, setManualTime] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState("");

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const dateRecord = records[selectedDate] || { entries: [] };
  const safeEntries = dateRecord.entries || [];

  const dateInputRef = useRef(null);

  const handleDateClick = () => {
    if (
      dateInputRef.current &&
      typeof dateInputRef.current.showPicker === "function"
    ) {
      try {
        dateInputRef.current.showPicker();
      } catch (e) {
        // Fallback for older browsers
      }
    }
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(format(now, "HH:mm"));
    };
    updateTime();
    const interval = setInterval(updateTime, 15000); // Update every 15s for live counter
    return () => clearInterval(interval);
  }, []);

  const handleAddEntry = (e) => {
    e.preventDefault();

    // Full-day absence types don't need a time
    if (isFullDayType) {
      const newEntry = {
        id: Date.now().toString(),
        type: selectedType,
        time: "00:00",
        timeDecimal: 0,
        fullDay: true,
        timestamp: new Date().toISOString(),
      };
      addEntry(selectedDate, newEntry);
      return;
    }

    const timeToUse = manualTime || currentTime;
    if (!timeToUse) return;

    const newEntry = {
      id: Date.now().toString(),
      type: selectedType,
      time: timeToUse,
      timeDecimal: timeToDecimal(timeToUse),
      timestamp: new Date().toISOString(),
    };

    addEntry(selectedDate, newEntry);
    setManualTime("");
  };

  // Check if selected type is a full-day absence
  const isFullDayType = entryTypes.find((t) => t.id === selectedType)?.fullDay;

  const handleTimeInput = (value) => {
    // Remove non-digits
    let digits = value.replace(/\D/g, "");
    if (digits.length > 4) digits = digits.slice(0, 4);
    // Auto-insert colon after 2 digits
    if (digits.length >= 3) {
      const hh = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      // Validate hours 0-23 and minutes 0-59
      if (parseInt(hh) > 23) return;
      if (mm && parseInt(mm) > 59) return;
      setManualTime(hh + ":" + mm);
    } else {
      setManualTime(digits);
    }
  };

  const handleStartEdit = (entry) => {
    setEditingId(entry.id);
    setEditTime(entry.time);
    setEditType(entry.type);
  };

  const handleSaveEdit = () => {
    if (!editTime) return;
    updateEntry(selectedDate, editingId, {
      time: editTime,
      type: editType,
    });
    setEditingId(null);
  };

  const totalDecimal = calculateDayTotalDecimal(selectedDate);

  // Detect if there's an open session (start without matching end) for live counter
  const liveSession = useMemo(() => {
    const sorted = [...safeEntries].sort((a, b) =>
      a.time.localeCompare(b.time),
    );
    let lastStart = null;
    for (const e of sorted) {
      const t = entryTypes.find((et) => et.id === e.type);
      if (t?.type === "start") lastStart = e;
      else if (t?.type === "end") lastStart = null;
    }
    return lastStart; // null = no open session
  }, [safeEntries]);

  const isToday = selectedDate === format(new Date(), "yyyy-MM-dd");

  const dayEarnings = useMemo(() => {
    // Build a synthetic entry list that adds the current time as provisional end if live
    let entriesForCalc = [...safeEntries];
    let isLive = false;
    if (isToday && liveSession && currentTime) {
      isLive = true;
      entriesForCalc = [
        ...entriesForCalc,
        {
          id: "__live__",
          type: "work_out", // provisional end
          time: currentTime,
          timeDecimal: timeToDecimal(currentTime),
        },
      ];
    }

    const sorted = entriesForCalc.sort((a, b) => a.time.localeCompare(b.time));
    const dateObj = new Date(selectedDate);
    const isSunday = dateObj.getDay() === 0;
    let cumulativeHours = 0;
    let currentStart = null;
    let currentLunchOutTime = null;
    let totalGross = 0;
    let totalNet = 0;

    for (const entry of sorted) {
      const typeInfo = entryTypes.find((t) => t.id === entry.type);

      if (typeInfo?.type === "start") {
        currentStart = entry;

        if (
          entry.type === "lunch_in" &&
          currentLunchOutTime !== null &&
          dateRecord.paidLunch
        ) {
          const duration = entry.timeDecimal - currentLunchOutTime;

          if (duration > 0) {
            const hoursRemainingNormal = Math.max(0, 9 - cumulativeHours);
            const normalInSeg = isSunday
              ? 0
              : Math.min(duration, hoursRemainingNormal);
            const extraInSeg = isSunday
              ? 0
              : Math.max(0, duration - normalInSeg);
            const sundayInSeg = isSunday ? duration : 0;

            const startH = currentLunchOutTime;
            const endH = entry.timeDecimal;
            let nightInTramo = Math.max(0, Math.min(endH, 6) - startH);
            nightInTramo += Math.max(0, endH - Math.max(startH, 22));

            const gross =
              normalInSeg * Number(settings.hourlyRate) +
              sundayInSeg * Number(settings.rateSunday) +
              extraInSeg * Number(settings.rateOvertime) +
              nightInTramo * Number(settings.rateNightPlus || 0) +
              normalInSeg * Number(settings.rateSmiPlus || 0) +
              duration * Number(settings.hourlyBonus || 0);

            const deductions =
              (Number(settings.irpfPercent) +
                Number(settings.socialSecurityPercent) +
                Number(settings.unemploymentPercent) +
                Number(settings.meiPercent || 0)) /
              100;

            totalGross += gross;
            totalNet += gross * (1 - deductions);
            cumulativeHours += duration;
          }
        }
        currentLunchOutTime = null;
      } else if (typeInfo?.type === "end") {
        if (entry.type === "lunch_out") {
          currentLunchOutTime = entry.timeDecimal;
        }

        if (currentStart) {
          const duration = entry.timeDecimal - currentStart.timeDecimal;
          if (duration <= 0) {
            currentStart = null;
            continue;
          }

          const hoursRemainingNormal = Math.max(0, 9 - cumulativeHours);
          const normalInSeg = isSunday
            ? 0
            : Math.min(duration, hoursRemainingNormal);
          const extraInSeg = isSunday ? 0 : Math.max(0, duration - normalInSeg);
          const sundayInSeg = isSunday ? duration : 0;

          const startH = currentStart.timeDecimal;
          const endH = entry.timeDecimal;
          let nightInTramo = Math.max(0, Math.min(endH, 6) - startH);
          nightInTramo += Math.max(0, endH - Math.max(startH, 22));

          const gross =
            normalInSeg * Number(settings.hourlyRate) +
            sundayInSeg * Number(settings.rateSunday) +
            extraInSeg * Number(settings.rateOvertime) +
            nightInTramo * Number(settings.rateNightPlus || 0) +
            normalInSeg * Number(settings.rateSmiPlus || 0) +
            duration * Number(settings.hourlyBonus || 0);

          const deductions =
            (Number(settings.irpfPercent) +
              Number(settings.socialSecurityPercent) +
              Number(settings.unemploymentPercent) +
              Number(settings.meiPercent || 0)) /
            100;

          totalGross += gross;
          totalNet += gross * (1 - deductions);
          cumulativeHours += duration;
          currentStart = null;
        }
      }
    }

    return { gross: totalGross, net: totalNet, isLive };
  }, [safeEntries, liveSession, currentTime, settings, selectedDate]);

  return (
    <div className="dashboard-view animate-fade-in">
      <div className="card date-header">
        <div className="flex justify-center items-center w-full mb-3 mt-1">
          <div
            onClick={handleDateClick}
            className="relative inline-flex items-center gap-3 px-4 py-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
          >
            <h2 className="text-3xl md:text-4xl font-extrabold capitalize text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors pointer-events-none">
              {format(new Date(selectedDate), "EEEE, d MMMM yyyy", {
                locale: es,
              })}
            </h2>
            <div className="text-emerald-500 rounded-full bg-emerald-100 dark:bg-emerald-900/30 p-2 pointer-events-none mt-1">
              <Calendar size={26} />
            </div>
            {/* Invisible input that covers the whole text to trigger the native picker */}
            <input
              ref={dateInputRef}
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              style={{ padding: 0, margin: 0 }}
            />
          </div>
        </div>
        <div className="current-time text-4xl font-light tracking-wider my-2">
          {currentTime}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="card entry-form-container">
          <h3 className="section-title">Nuevo Registro</h3>
          <form onSubmit={handleAddEntry} className="entry-form">
            <div className="form-group row">
              <div className="flex-1 min-w-0">
                <label>Tipo de movimiento</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full mt-1"
                >
                  {entryTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              {!isFullDayType && (
                <div style={{ minWidth: "110px", width: "110px" }}>
                  <label>Hora manual</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="HH:MM"
                    value={manualTime}
                    onChange={(e) => handleTimeInput(e.target.value)}
                    maxLength={5}
                    className="w-full mt-1"
                    style={{ fontSize: "16px", letterSpacing: "0.05em" }}
                  />
                </div>
              )}
            </div>

            {isFullDayType && (
              <p className="text-xs text-center text-gray-400 mt-2 mb-1">
                Se registrará el día completo sin hora específica.
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
            >
              <PlusCircle size={20} />
              {isFullDayType
                ? `Registrar día: ${entryTypes.find((t) => t.id === selectedType)?.label}`
                : `Fichar ahora ${manualTime ? `(${manualTime})` : `(${currentTime})`}`}
            </button>
          </form>
        </div>

        <div className="card earnings-summary bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-100 dark:border-emerald-900/50">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-4">
            <Euro size={20} />
            <h3 className="section-title mb-0 text-emerald-600 dark:text-emerald-400 flex-1">
              {settings.salaryType === "fixed"
                ? "Salario del Mes"
                : "Ganancia de Hoy"}
            </h3>
            {dayEarnings.isLive && settings.salaryType !== "fixed" && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span>
                En curso
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Horas totales hoy
              </span>
              <span className="text-2xl font-bold text-gray-800 dark:text-white">
                {totalDecimal.total.toFixed(2)}h
              </span>
            </div>

            {settings.salaryType === "fixed" ? (
              <div className="py-3 border-y border-emerald-100/50 dark:border-emerald-900/30">
                <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block font-bold mb-1">
                  Neto Mensual Fijo
                </span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {Number(settings.monthlyNet || 0).toFixed(2)}€
                </span>
                <p className="text-xs text-gray-400 mt-1">
                  Salario fijo — mismo importe todos los meses
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 py-3 border-y border-emerald-100/50 dark:border-emerald-900/30">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 block">
                      Bruto Estimado
                    </span>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                      {dayEarnings.gross.toFixed(2)}€
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block font-bold">
                      Neto Estimado
                    </span>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {dayEarnings.net.toFixed(2)}€
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {totalDecimal.sunday > 0 && (
                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded-full">
                      FESTIVO: {totalDecimal.sunday.toFixed(2)}h
                    </span>
                  )}
                  {totalDecimal.extra > 0 && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded-full">
                      EXTRA: {totalDecimal.extra.toFixed(2)}h
                    </span>
                  )}
                  {totalDecimal.night > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded-full">
                      NOCHE: {totalDecimal.night.toFixed(2)}h
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card today-summary mt-4">
        <h3 className="section-title border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">
          Registros de hoy
        </h3>

        {safeEntries.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No hay registros hoy</p>
        ) : (
          <ul className="entry-list">
            {(() => {
              let cumulativeHours = 0;
              let currentStart = null;
              let currentLunchOutTime = null;
              const dateObj = new Date(selectedDate); // Assuming todayStr should be selectedDate
              const isSunday = dateObj.getDay() === 0;

              return safeEntries
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((entry) => {
                  const typeInfo = entryTypes.find((t) => t.id === entry.type);
                  let earnings = null;

                  if (typeInfo?.type === "start") {
                    currentStart = entry;

                    if (
                      entry.type === "lunch_in" &&
                      currentLunchOutTime !== null &&
                      dateRecord.paidLunch
                    ) {
                      const duration = entry.timeDecimal - currentLunchOutTime;

                      if (duration > 0) {
                        const hoursRemainingNormal = Math.max(
                          0,
                          9 - cumulativeHours,
                        );
                        const normalInSegment = isSunday
                          ? 0
                          : Math.min(duration, hoursRemainingNormal);
                        const extraInSegment = isSunday
                          ? 0
                          : Math.max(0, duration - normalInSegment);
                        const sundayInSegment = isSunday ? duration : 0;

                        const startH = currentLunchOutTime;
                        const endH = entry.timeDecimal;
                        let nightInTramo = Math.max(
                          0,
                          Math.min(endH, 6) - startH,
                        );
                        nightInTramo += Math.max(
                          0,
                          endH - Math.max(startH, 22),
                        );

                        const baseG =
                          normalInSegment * Number(settings.hourlyRate);
                        const sundayG =
                          sundayInSegment * Number(settings.rateSunday);
                        const extraG =
                          extraInSegment * Number(settings.rateOvertime);
                        const nightP =
                          nightInTramo * Number(settings.rateNightPlus || 0);
                        const smiP =
                          normalInSegment * Number(settings.rateSmiPlus || 0);
                        const suprP =
                          duration * Number(settings.hourlyBonus || 0);

                        const gross =
                          baseG + sundayG + extraG + nightP + smiP + suprP;
                        const deductions =
                          Number(settings.irpfPercent) +
                          Number(settings.socialSecurityPercent) +
                          Number(settings.unemploymentPercent) +
                          Number(settings.meiPercent || 0);
                        const net = gross * (1 - deductions / 100);

                        earnings = {
                          gross,
                          net,
                          duration,
                          durationStr: `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m (Almuerzo pagado)`,
                        };

                        cumulativeHours += duration;
                      }
                    }
                    currentLunchOutTime = null;
                  } else if (typeInfo?.type === "end") {
                    if (entry.type === "lunch_out") {
                      currentLunchOutTime = entry.timeDecimal;
                    }

                    if (currentStart) {
                      const duration =
                        entry.timeDecimal - currentStart.timeDecimal;

                      // Nocturnity calculation (22-06)
                      const startH = currentStart.timeDecimal;
                      const endH = entry.timeDecimal;
                      let nightInTramo = 0;
                      nightInTramo += Math.max(0, Math.min(endH, 6) - startH);
                      nightInTramo += Math.max(0, endH - Math.max(startH, 22));

                      // Financials for this segment
                      const hoursRemainingNormal = Math.max(
                        0,
                        9 - cumulativeHours,
                      );
                      const normalInSegment = isSunday
                        ? 0
                        : Math.min(duration, hoursRemainingNormal);
                      const extraInSegment = isSunday
                        ? 0
                        : Math.max(0, duration - normalInSegment);
                      const sundayInSegment = isSunday ? duration : 0;

                      const baseG =
                        normalInSegment * Number(settings.hourlyRate);
                      const sundayG =
                        sundayInSegment * Number(settings.rateSunday);
                      const extraG =
                        extraInSegment * Number(settings.rateOvertime);
                      const nightP =
                        nightInTramo * Number(settings.rateNightPlus || 0);
                      const smiP =
                        normalInSegment * Number(settings.rateSmiPlus || 0);
                      const suprP =
                        duration * Number(settings.hourlyBonus || 0);

                      const gross =
                        baseG + sundayG + extraG + nightP + smiP + suprP;
                      const deductions =
                        Number(settings.irpfPercent) +
                        Number(settings.socialSecurityPercent) +
                        Number(settings.unemploymentPercent) +
                        Number(settings.meiPercent || 0);
                      const net = gross * (1 - deductions / 100);

                      earnings = {
                        gross,
                        net,
                        duration,
                        durationStr: `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m`,
                      };

                      cumulativeHours += duration;
                      currentStart = null;
                    }
                  }

                  if (editingId === entry.id) {
                    return (
                      <li
                        key={entry.id}
                        className="entry-item flex flex-col gap-3 py-4 border-b border-indigo-100 dark:border-indigo-900/30 last:border-0"
                      >
                        <div className="flex flex-wrap gap-2">
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="flex-1 py-1 text-sm rounded-lg"
                          >
                            {entryTypes.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-32 py-1 text-sm rounded-lg"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 px-3 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex items-center gap-1"
                          >
                            <X size={14} /> Cancelar
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 px-3 text-sm bg-emerald-500 text-white rounded-lg flex items-center gap-1 hover:bg-emerald-600 transition-colors"
                          >
                            <Check size={14} /> Guardar
                          </button>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={entry.id}
                      className="entry-item flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-3 h-3 rounded-full ${typeInfo?.color || "bg-gray-400"}`}
                        ></span>
                        <div>
                          <span className="font-medium block">
                            {typeInfo?.label}
                          </span>
                          <div className="flex flex-col gap-1 mt-0.5">
                            <span className="text-sm text-gray-500 font-mono">
                              {entry.time}
                            </span>
                            {earnings && settings.salaryType !== "fixed" && (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold w-fit">
                                  Bruto: {earnings.gross.toFixed(2)}€
                                </span>
                                <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800/40 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold w-fit">
                                  Neto: {earnings.net.toFixed(2)}€ (
                                  {earnings.durationStr})
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStartEdit(entry)}
                          className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => deleteEntry(selectedDate, entry.id)}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                          title="Borrar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </li>
                  );
                });
            })()}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
