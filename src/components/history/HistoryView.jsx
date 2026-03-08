import React, { useState, useMemo } from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { es } from "date-fns/locale";
import { useAppContext, entryTypes } from "../../context/AppContext";
import {
  Calendar,
  Euro,
  Clock,
  Plus,
  Trash2,
  X,
  Pencil,
  Check,
} from "lucide-react";

const HistoryView = () => {
  const {
    records,
    settings,
    advances,
    absences,
    setAbsenceValue,
    calculateDayTotalDecimal,
    addEntry,
    deleteEntry,
    updateEntry,
    deleteMonth,
  } = useAppContext();

  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM"),
  );

  const [editingDay, setEditingDay] = useState(null);
  const [newEntryTime, setNewEntryTime] = useState("");
  const [newEntryType, setNewEntryType] = useState(entryTypes[0].id);

  const [editingId, setEditingId] = useState(null);
  const [editTime, setEditTime] = useState("");
  const [editType, setEditType] = useState("");

  const handleStartEdit = (entry) => {
    setEditingId(entry.id);
    setEditTime(entry.time);
    setEditType(entry.type);
  };

  const handleSaveEdit = (dateStr) => {
    if (!editTime) return;
    updateEntry(dateStr, editingId, {
      time: editTime,
      type: editType,
    });
    setEditingId(null);
  };

  const handleAddHistoricalEntry = (dateStr) => {
    if (!newEntryTime) return;
    addEntry(dateStr, {
      type: newEntryType,
      time: newEntryTime,
    });
    setEditingDay(null);
    setNewEntryTime("");
  };

  const monthData = useMemo(() => {
    if (!selectedMonth)
      return {
        days: [],
        totals: { normal: 0, extra: 0, sunday: 0, night: 0, total: 0 },
        baseGross: 0,
        sundayGross: 0,
        extraGross: 0,
        nightPlus: 0,
        smiPlus: 0,
        gross: 0,
        advance: 0,
        net: 0,
        deductions: { irpf: 0, ss: 0, unemp: 0, mei: 0 },
      };

    // Create Date from YYYY-MM
    const [year, month] = selectedMonth.split("-");
    const date = new Date(year, month - 1);

    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const daysInMonth = eachDayOfInterval({ start, end });

    let totals = { normal: 0, extra: 0, sunday: 0, night: 0, total: 0 };
    const days = daysInMonth
      .map((dayDate) => {
        const dateStr = format(dayDate, "yyyy-MM-dd");
        const breakdown = calculateDayTotalDecimal(dateStr);

        totals.normal += breakdown.normal;
        totals.extra += breakdown.extra;
        totals.sunday += breakdown.sunday;
        totals.night += breakdown.night;
        totals.total += breakdown.total;

        return {
          date: dayDate,
          dateStr,
          record: records[dateStr],
          breakdown,
        };
      })
      .filter((d) => d.record && d.record.entries.length > 0);

    const baseGross = totals.normal * settings.hourlyRate;
    const sundayGross = totals.sunday * settings.rateSunday;
    const extraGross = totals.extra * settings.rateOvertime;
    const nightPlus = totals.night * (settings.rateNightPlus || 0);
    const smiPlus = totals.normal * (settings.rateSmiPlus || 0);
    const suprPlus = totals.total * (settings.hourlyBonus || 0);

    const gross =
      baseGross + sundayGross + extraGross + nightPlus + smiPlus + suprPlus;

    const irpf = gross * (settings.irpfPercent / 100);
    const ss = gross * (settings.socialSecurityPercent / 100);
    const unemp = gross * (settings.unemploymentPercent / 100);
    const mei = gross * ((settings.meiPercent || 0) / 100);

    const advance = Number(advances[selectedMonth] || 0);
    const net = gross - irpf - ss - unemp - mei - advance;

    return {
      days,
      totals,
      baseGross,
      sundayGross,
      extraGross,
      nightPlus,
      smiPlus,
      gross,
      advance,
      net,
      deductions: { irpf, ss, unemp, mei },
    };
  }, [selectedMonth, records, settings, calculateDayTotalDecimal]);

  return (
    <div className="history-view animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="view-title mb-0">Resumen y Finanzas</h2>
        <div className="flex gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-picker"
          />
          {monthData.days.length > 0 && (
            <button
              onClick={() => deleteMonth(selectedMonth)}
              className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors border border-rose-100 dark:border-rose-900/40"
              title="Borrar todo el mes"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="summary-cards grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 text-white/80 mb-1">
            <Clock size={16} />
            <span className="text-sm font-medium">Horas Mes</span>
          </div>
          <div className="text-3xl font-bold">
            {monthData.totals.total.toFixed(2)}
            <span className="text-xl font-normal opacity-80">h</span>
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 text-white/80 mb-1">
            <Euro size={16} />
            <span className="text-sm font-medium">
              {settings.salaryType === "fixed" ? "Neto Fijo" : "Neto Est."}
            </span>
          </div>
          <div className="text-3xl font-bold">
            {settings.salaryType === "fixed"
              ? Number(settings.monthlyNet || 0).toFixed(2)
              : monthData.net.toFixed(2)}
            <span className="text-xl font-normal opacity-80">€</span>
          </div>
        </div>
      </div>

      {/* === AUSENCIAS DEL MES === */}
      {(() => {
        const monthAbs = absences[selectedMonth] || {};
        const dailyRate =
          settings.salaryType === "fixed"
            ? Number(settings.monthlyNet || 0) / 30
            : monthData.net / 30;

        const vacDays = Number(monthAbs.vacation || 0);
        const festDays = Number(monthAbs.festivo || 0);
        const scDays = Number(monthAbs.sicknessCommon || 0);
        const slDays = Number(monthAbs.sicknessLaboral || 0);
        const unjDays = Number(monthAbs.unjustified || 0);

        // Baja común deduction
        const unpaidN = Number(settings.sicknessCommonUnpaidDays ?? 3);
        const pct1 = settings.coverSicknessGap
          ? 100
          : Number(settings.sicknessCommonPct1 ?? 0);
        const pct2 = Number(settings.sicknessCommonPct2 ?? 60);
        const pct3 = Number(settings.sicknessCommonPct3 ?? 75);
        const scUnpaid = Math.min(scDays, unpaidN);
        const scMid = Math.max(0, Math.min(scDays - unpaidN, 17));
        const scLate = Math.max(0, scDays - unpaidN - 17);
        const scDeduct =
          dailyRate *
          (scUnpaid * (1 - pct1 / 100) +
            scMid * (1 - pct2 / 100) +
            scLate * (1 - pct3 / 100));

        // Baja laboral deduction
        const pctL = Number(settings.sicknessLaboralPct ?? 75);
        const slDeduct = dailyRate * slDays * (1 - pctL / 100);

        // Unjustified
        const unjDeduct = dailyRate * unjDays;

        const totalDeduct = scDeduct + slDeduct + unjDeduct;
        const baseNet =
          settings.salaryType === "fixed"
            ? Number(settings.monthlyNet || 0)
            : monthData.net;
        const finalNet = baseNet - totalDeduct;

        const absRow = (label, key, emoji, color, deduct) => (
          <div
            key={key}
            className="flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-gray-800"
          >
            <span className="text-sm">{emoji}</span>
            <span className={`text-xs flex-1 ${color}`}>{label}</span>
            <input
              type="text"
              inputMode="numeric"
              value={monthAbs[key] || ""}
              placeholder="0"
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setAbsenceValue(selectedMonth, key, v);
              }}
              className="w-10 text-center text-xs border rounded px-1 py-0.5 dark:bg-gray-800 dark:border-gray-700"
            />
            <span className="text-xs text-gray-400 w-6 text-center">días</span>
            {deduct !== null && (
              <span
                className={`text-xs font-bold w-20 text-right ${deduct > 0 ? "text-rose-500" : "text-gray-400"}`}
              >
                {deduct > 0 ? `-${deduct.toFixed(2)}€` : "0,00€"}
              </span>
            )}
          </div>
        );

        return (
          <div className="card mb-6">
            <h3 className="section-title mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
              📋 Ausencias del Mes
            </h3>
            <div className="text-xs text-gray-400 mb-2 flex justify-between">
              <span>Tipo</span>
              <span className="flex gap-6">
                <span>Días</span>
                <span className="w-20 text-right">Deducción</span>
              </span>
            </div>
            {absRow(
              "Vacaciones",
              "vacation",
              "🏖️",
              "text-sky-600 dark:text-sky-400",
              0,
            )}
            {absRow(
              "Festivos",
              "festivo",
              "📅",
              "text-teal-600 dark:text-teal-400",
              0,
            )}
            {absRow(
              "Baja Común",
              "sicknessCommon",
              "🩺",
              "text-amber-600 dark:text-amber-400",
              scDeduct,
            )}
            {absRow(
              "Baja Laboral",
              "sicknessLaboral",
              "🦺",
              "text-orange-600 dark:text-orange-400",
              slDeduct,
            )}
            {absRow(
              "Falta Injustificada",
              "unjustified",
              "❌",
              "text-rose-600 dark:text-rose-400",
              unjDeduct,
            )}

            {totalDeduct > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Neto base</span>
                  <span>{baseNet.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-xs text-rose-500 font-medium">
                  <span>Total deducciones por baja</span>
                  <span>-{totalDeduct.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm font-black text-emerald-600 dark:text-emerald-400 pt-1 border-t border-emerald-100 dark:border-emerald-900/30">
                  <span>NETO A PERCIBIR</span>
                  <span>{finalNet.toFixed(2)}€</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <div className="card mb-6">
        <h3 className="section-title mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
          Desglose Económico
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-gray-600 dark:text-gray-300 text-sm">
            <span>Hora Convenio ({monthData.totals.normal.toFixed(2)}h)</span>
            <span className="font-medium">
              {monthData.baseGross.toFixed(2)}€
            </span>
          </div>
          {monthData.totals.sunday > 0 && (
            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 text-sm">
              <span>H. Festivas ({monthData.totals.sunday.toFixed(2)}h)</span>
              <span className="font-medium">
                {monthData.sundayGross.toFixed(2)}€
              </span>
            </div>
          )}
          {monthData.totals.extra > 0 && (
            <div className="flex justify-between items-center text-purple-600 dark:text-purple-400 text-sm">
              <span>
                H. Extras (+9h) ({monthData.totals.extra.toFixed(2)}h)
              </span>
              <span className="font-medium">
                {monthData.extraGross.toFixed(2)}€
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-indigo-500 text-sm">
            <span>Complemento SMI ({settings.rateSmiPlus}€/h)</span>
            <span className="font-medium">{monthData.smiPlus.toFixed(2)}€</span>
          </div>
          {monthData.nightPlus > 0 && (
            <div className="flex justify-between items-center text-blue-500 text-sm">
              <span>Plus Nocturnidad</span>
              <span className="font-medium">
                {monthData.nightPlus.toFixed(2)}€
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-gray-800 dark:text-gray-100 font-semibold border-t border-gray-50 dark:border-gray-800/50 pt-2">
            <span>Total Bruto</span>
            <span>{monthData.gross.toFixed(2)}€</span>
          </div>

          <div className="space-y-1 pt-2">
            <div className="flex justify-between items-center text-red-500/80 text-xs">
              <span>IRPF ({settings.irpfPercent}%)</span>
              <span>-{monthData.deductions.irpf.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between items-center text-red-500/80 text-xs">
              <span>Seguridad Social ({settings.socialSecurityPercent}%)</span>
              <span>-{monthData.deductions.ss.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between items-center text-red-500/80 text-xs">
              <span>Desempleo ({settings.unemploymentPercent}%)</span>
              <span>-{monthData.deductions.unemp.toFixed(2)}€</span>
            </div>
            {monthData.deductions.mei > 0 && (
              <div className="flex justify-between items-center text-red-500/80 text-xs">
                <span>MEI ({settings.meiPercent}%)</span>
                <span>-{monthData.deductions.mei.toFixed(2)}€</span>
              </div>
            )}
            {monthData.advance > 0 && (
              <div className="flex justify-between items-center text-orange-600 dark:text-orange-400 font-medium py-1">
                <span>Anticipo / Adelanto</span>
                <span>-{monthData.advance.toFixed(2)}€</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center font-bold text-lg">
            <span>Total a percibir</span>
            <span className="text-emerald-500">
              {monthData.net.toFixed(2)}€
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title border-b border-gray-100 dark:border-gray-800 pb-2 mb-4">
          Días Trabajados
        </h3>
        {monthData.days.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No hay registros este mes
          </p>
        ) : (
          <div className="space-y-4">
            {monthData.days.map((day, i) => (
              <div
                key={day.dateStr}
                className="py-3 border-b border-gray-50 dark:border-gray-800/50 last:border-0"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                      {format(day.date, "d")}
                    </div>
                    <div>
                      <span className="block font-medium capitalize">
                        {format(day.date, "EEEE", { locale: es })}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {day.record.entries.length} registros
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setEditingDay(
                          editingDay === day.dateStr ? null : day.dateStr,
                        )
                      }
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-colors"
                      title="Añadir registro"
                    >
                      <Plus size={18} />
                    </button>
                    <div className="text-right">
                      <span className="font-bold text-lg">
                        {day.breakdown.total.toFixed(2)}h
                      </span>
                      {day.breakdown.night > 0 && (
                        <span className="block text-[10px] text-blue-400 font-mono">
                          🌙 {day.breakdown.night.toFixed(2)}h
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formulario rápido para añadir histórico */}
                {editingDay === day.dateStr && (
                  <div className="ml-13 mb-4 p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/40 animate-fade-in">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[120px]">
                        <label className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">
                          Tipo
                        </label>
                        <select
                          value={newEntryType}
                          onChange={(e) => setNewEntryType(e.target.value)}
                          className="w-full text-xs py-1"
                        >
                          {entryTypes.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">
                          Hora
                        </label>
                        <input
                          type="time"
                          value={newEntryTime}
                          onChange={(e) => setNewEntryTime(e.target.value)}
                          className="w-full text-xs py-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddHistoricalEntry(day.dateStr)}
                          className="btn-primary py-1 px-3 text-xs"
                        >
                          Añadir
                        </button>
                        <button
                          onClick={() => setEditingDay(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de fichajes del día */}
                <div className="ml-13 pl-3 border-l-2 border-indigo-100 dark:border-indigo-900/40 space-y-1">
                  {(() => {
                    let cumulativeHours = 0;
                    let currentStart = null;
                    const isSunday = day.date.getDay() === 0;

                    return day.record.entries
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((entry) => {
                        const typeInfo = entryTypes.find(
                          (t) => t.id === entry.type,
                        );
                        let earnings = null;

                        if (typeInfo?.type === "start") {
                          currentStart = entry;
                        } else if (typeInfo?.type === "end" && currentStart) {
                          const duration =
                            entry.timeDecimal - currentStart.timeDecimal;

                          // Nocturnity calculation (22-06)
                          const startH = currentStart.timeDecimal;
                          const endH = entry.timeDecimal;
                          let nightInTramo = 0;
                          nightInTramo += Math.max(
                            0,
                            Math.min(endH, 6) - startH,
                          );
                          nightInTramo += Math.max(
                            0,
                            endH - Math.max(startH, 22),
                          );

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
                            durationStr: `${Math.floor(duration)}h ${Math.round((duration % 1) * 60)}m`,
                          };

                          cumulativeHours += duration;
                          currentStart = null;
                        }

                        if (editingId === entry.id) {
                          return (
                            <div
                              key={entry.id}
                              className="flex items-center gap-2 py-2 px-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-lg border border-indigo-100 dark:border-indigo-900/30"
                            >
                              <select
                                value={editType}
                                onChange={(e) => setEditType(e.target.value)}
                                className="text-[10px] py-1 rounded w-32"
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
                                className="text-[10px] py-1 rounded w-20"
                              />
                              <div className="flex gap-1 ml-auto">
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1 text-gray-400 hover:text-gray-600"
                                >
                                  <X size={14} />
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(day.dateStr)}
                                  className="p-1 text-emerald-500 hover:text-emerald-700 font-bold"
                                >
                                  <Check size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={entry.id}
                            className="flex flex-col gap-0.5 text-xs group py-1"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${typeInfo?.color || "bg-gray-400"}`}
                              ></span>
                              <span className="text-gray-600 dark:text-gray-300 font-mono">
                                {entry.time}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 truncate">
                                {typeInfo?.label}
                              </span>
                              <div className="flex gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleStartEdit(entry)}
                                  className="p-1 text-indigo-400 hover:text-indigo-600"
                                  title="Editar"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() =>
                                    deleteEntry(day.dateStr, entry.id)
                                  }
                                  className="p-1 text-rose-300 hover:text-rose-500 transition-colors"
                                  title="Borrar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            {earnings && (
                              <span className="ml-4 text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold w-fit">
                                Bruto: {earnings.gross.toFixed(2)}€ | Neto:{" "}
                                {earnings.net.toFixed(2)}€ (
                                {earnings.durationStr})
                              </span>
                            )}
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
