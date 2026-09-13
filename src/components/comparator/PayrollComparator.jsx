import React, { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useAppContext } from "../../context/AppContext";
import { Scale, CheckCircle2, AlertTriangle, Euro, Clock, ArrowRight, HelpCircle } from "lucide-react";

const PayrollComparator = () => {
  const {
    records,
    settings,
    advances,
    otherIncome,
    calculateDayTotalDecimal,
  } = useAppContext();

  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );

  // Datos introducidos de la nómina real en papel
  const [payrollInput, setPayrollInput] = useState({
    gross: "",
    net: "",
    hours: "",
  });

  const handleInputChange = (field, val) => {
    const cleaned = val.replace(",", ".");
    if (cleaned === "" || /^\d*\.?\d*$/.test(cleaned)) {
      setPayrollInput((prev) => ({ ...prev, [field]: cleaned }));
    }
  };

  // Cálculo mensual según la App
  const appData = useMemo(() => {
    if (!selectedMonth) return { totalHours: 0, gross: 0, net: 0 };

    const [year, month] = selectedMonth.split("-");
    const date = new Date(year, month - 1);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const daysInMonth = eachDayOfInterval({ start, end });

    let totals = { normal: 0, extra: 0, sunday: 0, festive: 0, night: 0, total: 0 };
    daysInMonth.forEach((dayDate) => {
      const dateStr = format(dayDate, "yyyy-MM-dd");
      const breakdown = calculateDayTotalDecimal(dateStr);
      totals.normal += breakdown.normal;
      totals.extra += breakdown.extra;
      totals.sunday += breakdown.sunday;
      totals.festive += breakdown.festive || 0;
      totals.night += breakdown.night;
      totals.total += breakdown.total;
    });

    const baseGross = totals.normal * settings.hourlyRate;
    const sundayGross = totals.sunday * settings.rateSunday;
    const festiveGross = totals.festive * (settings.rateFestive ?? settings.rateSunday ?? 11.31);
    const extraGross = totals.extra * settings.rateOvertime;
    const nightPlus = totals.night * (settings.rateNightPlus || 0);
    const smiPlus = totals.normal * (settings.rateSmiPlus || 0);
    const suprPlus = totals.total * (settings.hourlyBonus || 0);

    const bonusOther = Number(otherIncome[selectedMonth] || 0);
    const gross =
      baseGross + sundayGross + festiveGross + extraGross + nightPlus + smiPlus + suprPlus + bonusOther;

    const irpf = gross * (settings.irpfPercent / 100);
    const ss = gross * (settings.socialSecurityPercent / 100);
    const unemp = gross * (settings.unemploymentPercent / 100);
    const mei = gross * ((settings.meiPercent || 0) / 100);

    const advance = Number(advances[selectedMonth] || 0);
    const net = gross - irpf - ss - unemp - mei - advance;

    return {
      totalHours: totals.total,
      gross,
      net: settings.salaryType === "fixed" ? Number(settings.monthlyNet || 0) : net,
    };
  }, [selectedMonth, records, settings, advances, otherIncome, calculateDayTotalDecimal]);

  // Comparativas
  const realGross = Number(payrollInput.gross) || 0;
  const realNet = Number(payrollInput.net) || 0;
  const realHours = Number(payrollInput.hours) || 0;

  const diffGross = realGross ? realGross - appData.gross : 0;
  const diffNet = realNet ? realNet - appData.net : 0;
  const diffHours = realHours ? realHours - appData.totalHours : 0;

  const hasData = realGross > 0 || realNet > 0 || realHours > 0;

  return (
    <div className="payroll-comparator animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="view-title flex items-center gap-2 mb-1">
            <Scale className="text-indigo-500" size={26} />
            Comparador "App vs Nómina"
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Compara la nómina en papel que recibes de la empresa con la estimación calculada por la aplicación.
          </p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="month-picker self-start sm:self-auto"
        />
      </div>

      {/* Formulario de entrada de nómina real */}
      <div className="card space-y-4">
        <h3 className="section-title text-sm font-bold text-gray-700 dark:text-gray-200">
          📄 Datos de la Nómina Real de la Empresa ({selectedMonth})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="form-group">
            <label className="text-xs font-medium">Horas Cobradas en Nómina (h)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ej: 160.00"
              value={payrollInput.hours}
              onChange={(e) => handleInputChange("hours", e.target.value)}
              className="w-full mt-1 font-semibold"
            />
          </div>

          <div className="form-group">
            <label className="text-xs font-medium">Total Bruto en Nómina (€)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ej: 1450.50"
              value={payrollInput.gross}
              onChange={(e) => handleInputChange("gross", e.target.value)}
              className="w-full mt-1 font-semibold"
            />
          </div>

          <div className="form-group">
            <label className="text-xs font-medium">Líquido / Neto en Nómina (€)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ej: 1280.00"
              value={payrollInput.net}
              onChange={(e) => handleInputChange("net", e.target.value)}
              className="w-full mt-1 font-black text-emerald-600 dark:text-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Tarjetas de Contraste y Diagnóstico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Horas */}
        <div className="card space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1"><Clock size={14} /> Horas Trabajadas</span>
            <span className="text-[10px] uppercase">App vs Nómina</span>
          </div>
          <div className="flex justify-between items-end pt-1">
            <div>
              <span className="text-xs text-gray-400 block">App Estimado</span>
              <span className="text-xl font-bold">{appData.totalHours.toFixed(2)}h</span>
            </div>
            <ArrowRight size={16} className="text-gray-300 mb-1" />
            <div className="text-right">
              <span className="text-xs text-gray-400 block">Nómina Real</span>
              <span className="text-xl font-bold">
                {realHours ? `${realHours.toFixed(2)}h` : "---"}
              </span>
            </div>
          </div>

          {hasData && realHours > 0 && (
            <div
              className={`mt-2 p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                Math.abs(diffHours) < 0.1
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  : diffHours < 0
                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {Math.abs(diffHours) < 0.1 ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              <span>
                {Math.abs(diffHours) < 0.1
                  ? "Las horas coinciden exactamente"
                  : diffHours < 0
                  ? `Te han pagado ${Math.abs(diffHours).toFixed(2)}h de menos`
                  : `Te han pagado ${diffHours.toFixed(2)}h de más`}
              </span>
            </div>
          )}
        </div>

        {/* Bruto */}
        <div className="card space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1"><Euro size={14} /> Total Bruto</span>
            <span className="text-[10px] uppercase">App vs Nómina</span>
          </div>
          <div className="flex justify-between items-end pt-1">
            <div>
              <span className="text-xs text-gray-400 block">App Estimado</span>
              <span className="text-xl font-bold">{appData.gross.toFixed(2)}€</span>
            </div>
            <ArrowRight size={16} className="text-gray-300 mb-1" />
            <div className="text-right">
              <span className="text-xs text-gray-400 block">Nómina Real</span>
              <span className="text-xl font-bold">
                {realGross ? `${realGross.toFixed(2)}€` : "---"}
              </span>
            </div>
          </div>

          {hasData && realGross > 0 && (
            <div
              className={`mt-2 p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                Math.abs(diffGross) < 1.0
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  : diffGross < 0
                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {Math.abs(diffGross) < 1.0 ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              <span>
                {Math.abs(diffGross) < 1.0
                  ? "El salario bruto coincide"
                  : diffGross < 0
                  ? `Diferencia: ${diffGross.toFixed(2)}€ (Menor en nómina)`
                  : `Diferencia: +${diffGross.toFixed(2)}€ (Mayor en nómina)`}
              </span>
            </div>
          )}
        </div>

        {/* Neto */}
        <div className="card space-y-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-500">
            <span className="flex items-center gap-1"><Euro size={14} /> Neto a Percibir</span>
            <span className="text-[10px] uppercase">App vs Nómina</span>
          </div>
          <div className="flex justify-between items-end pt-1">
            <div>
              <span className="text-xs text-gray-400 block">App Estimado</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {appData.net.toFixed(2)}€
              </span>
            </div>
            <ArrowRight size={16} className="text-gray-300 mb-1" />
            <div className="text-right">
              <span className="text-xs text-gray-400 block">Nómina Real</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {realNet ? `${realNet.toFixed(2)}€` : "---"}
              </span>
            </div>
          </div>

          {hasData && realNet > 0 && (
            <div
              className={`mt-2 p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                Math.abs(diffNet) < 1.0
                  ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                  : diffNet < 0
                  ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {Math.abs(diffNet) < 1.0 ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertTriangle size={16} />
              )}
              <span>
                {Math.abs(diffNet) < 1.0
                  ? "El importe neto percibido coincide"
                  : diffNet < 0
                  ? `Te han ingresado ${Math.abs(diffNet).toFixed(2)}€ menos de lo estimado`
                  : `Te han ingresado +${diffNet.toFixed(2)}€ más de lo estimado`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Consejo o guía */}
      <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-800 dark:text-indigo-300 flex items-start gap-3">
        <HelpCircle size={20} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold mb-1">¿Cómo usar el comparador?</p>
          <p>
            Rellena los valores de la nómina que te entrega la empresa cada mes. Si encuentras diferencias marcadas en rojo, revisa el parte de horas exportable en el Historial para presentarlo a recursos humanos o tu representante sindical.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayrollComparator;
