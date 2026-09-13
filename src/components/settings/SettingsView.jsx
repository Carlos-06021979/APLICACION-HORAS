import React, { useRef, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { Save, Download, Upload, Plus, Trash2, Calendar } from "lucide-react";

const SettingsView = () => {
  const {
    settings,
    setSettings,
    records,
    advances,
    setAdvances,
    holidays,
    addHoliday,
    deleteHoliday,
    updateAllRecordsSettings,
  } = useAppContext();
  const [advMonth, setAdvMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [newHoliDate, setNewHoliDate] = useState("");
  const [newHoliName, setNewHoliName] = useState("");
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ settings, records, advances }));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "control_horas_backup.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (importedData.settings && importedData.records) {
          if (
            window.confirm(
              "¿Estás seguro de que quieres sobrescribir tus datos actuales con esta copia de seguridad?",
            )
          ) {
            setSettings(importedData.settings);
            // Si el setRecords no está en el Context, necesitaríamos exportar setRecords directamente
            // Vamos a asumi que la app necesita un refresh o añadimos un evento custom
            window.localStorage.setItem(
              "hoursApp_settings",
              JSON.stringify(importedData.settings),
            );
            window.localStorage.setItem(
              "hoursApp_records",
              JSON.stringify(importedData.records),
            );
            if (importedData.advances) {
              window.localStorage.setItem(
                "hoursApp_advances",
                JSON.stringify(importedData.advances),
              );
            }
            window.location.reload();
          }
        } else {
          alert("El archivo no tiene el formato correcto.");
        }
      } catch (err) {
        alert("Error al leer el archivo de copia de seguridad.");
      }
    };
    reader.readAsText(file);
    // Resetear input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleNumberInput = (key, value) => {
    // Reemplazamos coma por punto para compatibilidad con teclados españoles
    const cleaned = value.replace(",", ".");
    // Solo permitimos dígitos y un punto (o vacío)
    if (cleaned === "" || /^\d*\.?\d*$/.test(cleaned)) {
      updateSetting(key, cleaned);
    }
  };

  return (
    <div className="settings-view animate-fade-in">
      <h2 className="view-title">Ajustes</h2>

      <div className="card space-y-6">
        {/* === SALARY MODE SELECTOR === */}
        <section>
          <h3 className="section-title">Tipo de Salario</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => updateSetting("salaryType", "hourly")}
              className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                settings.salaryType !== "fixed"
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-500"
              }`}
            >
              ⏱️ Por Horas
            </button>
            <button
              type="button"
              onClick={() => updateSetting("salaryType", "fixed")}
              className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                settings.salaryType === "fixed"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "border-gray-200 dark:border-gray-700 text-gray-500"
              }`}
            >
              📅 Fijo Mensual
            </button>
          </div>

          {settings.salaryType === "fixed" && (
            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3 font-medium">
                Cobra siempre el mismo salario neto mensual, independientemente
                de las horas trabajadas.
              </p>
              <div className="form-group">
                <label className="text-sm font-medium">Neto Mensual (€)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ej: 1450"
                  value={settings.monthlyNet || ""}
                  onChange={(e) =>
                    handleNumberInput("monthlyNet", e.target.value)
                  }
                  className="w-full mt-1 text-lg font-bold"
                />
              </div>
            </div>
          )}
        </section>

        {settings.salaryType !== "fixed" && (
          <section>
            <h3 className="section-title">Precios por Hora (€)</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group">
                <label className="text-sm">Base Convenio</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.hourlyRate}
                  onChange={(e) =>
                    handleNumberInput("hourlyRate", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
              <div className="form-group">
                <label className="text-sm">Hora Festiva</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.rateFestive ?? settings.rateSunday ?? 11.31}
                  onChange={(e) =>
                    handleNumberInput("rateFestive", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
              <div className="form-group">
                <label className="text-sm">Hora Domingo</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.rateSunday}
                  onChange={(e) =>
                    handleNumberInput("rateSunday", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
              <div className="form-group">
                <label className="text-sm">Hora Extra</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.rateOvertime}
                  onChange={(e) =>
                    handleNumberInput("rateOvertime", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
              <div className="form-group">
                <label className="text-sm">Plus Nocturno (€/h)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.rateNightPlus}
                  onChange={(e) =>
                    handleNumberInput("rateNightPlus", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
              <div className="form-group">
                <label className="text-sm">Plus Suplemento (€/h)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.hourlyBonus}
                  onChange={(e) =>
                    handleNumberInput("hourlyBonus", e.target.value)
                  }
                  className="w-full mt-1"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="form-group mt-4">
              <label className="text-sm">Plus SMI (€/h)</label>
              <input
                type="text"
                inputMode="decimal"
                value={settings.rateSmiPlus}
                onChange={(e) =>
                  handleNumberInput("rateSmiPlus", e.target.value)
                }
                className="w-full mt-1"
              />
            </div>
          </section>
        )}

        <section>
          <h3 className="section-title">🌙 Horario Nocturno</h3>
          <p className="text-xs text-gray-400 mb-3">
            Define la franja horaria que la aplicación considerará como nocturna para calcular el Plus Nocturno.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="text-sm font-medium">Inicio Nocturnidad</label>
              <input
                type="time"
                value={settings.nightStart || "22:00"}
                onChange={(e) => updateSetting("nightStart", e.target.value)}
                className="w-full mt-1"
              />
            </div>
            <div className="form-group">
              <label className="text-sm font-medium">Fin Nocturnidad</label>
              <input
                type="time"
                value={settings.nightEnd || "06:00"}
                onChange={(e) => updateSetting("nightEnd", e.target.value)}
                className="w-full mt-1"
              />
            </div>
          </div>
        </section>

        {settings.salaryType !== "fixed" && (
          <section>
            <h3 className="section-title">Deducciones (%)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="form-group">
                <label className="text-sm">IRPF</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.irpfPercent}
                  onChange={(e) =>
                    handleNumberInput("irpfPercent", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
              <div className="form-group">
                <label className="text-sm">Desemp.</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.unemploymentPercent}
                  onChange={(e) =>
                    handleNumberInput("unemploymentPercent", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
              <div className="form-group">
                <label className="text-sm">SS</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.socialSecurityPercent}
                  onChange={(e) =>
                    handleNumberInput("socialSecurityPercent", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
              <div className="form-group">
                <label className="text-sm">MEI</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={settings.meiPercent}
                  onChange={(e) =>
                    handleNumberInput("meiPercent", e.target.value)
                  }
                  className="w-full mt-1"
                />
              </div>
            </div>
          </section>
        )}

        {/* === SICK LEAVE CONFIG (both modes) === */}
        <section>
          <h3 className="section-title">Configuración de Bajas</h3>
          <p className="text-xs text-gray-400 mb-3">
            Valores precargados según legislación española. Puedes modificarlos
            según tu convenio.
          </p>

          {/* Toggle: empresa cubre días 1-3 */}
          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-4 border border-amber-100 dark:border-amber-900/40">
            <div>
              <p className="text-sm font-medium">
                Empresa cubre días 1-3 (baja común)
              </p>
              <p className="text-xs text-gray-400">
                Si tu convenio lo cubre, actívalo
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                updateSetting("coverSicknessGap", !settings.coverSicknessGap)
              }
              className={`w-12 h-6 rounded-full transition-colors ${settings.coverSicknessGap ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${settings.coverSicknessGap ? "translate-x-6" : "translate-x-0"}`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                🩺 Baja Común (EC)
              </p>
              <div className="space-y-2">
                <div className="form-group">
                  <label className="text-xs">Días sin SS (inicio)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings.sicknessCommonUnpaidDays ?? 3}
                    onChange={(e) =>
                      handleNumberInput(
                        "sicknessCommonUnpaidDays",
                        e.target.value,
                      )
                    }
                    className="w-full mt-0.5"
                  />
                </div>
                {!settings.coverSicknessGap && (
                  <div className="form-group">
                    <label className="text-xs">
                      % días 1-{settings.sicknessCommonUnpaidDays ?? 3}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={settings.sicknessCommonPct1 ?? 0}
                      onChange={(e) =>
                        handleNumberInput("sicknessCommonPct1", e.target.value)
                      }
                      className="w-full mt-0.5"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="text-xs">% días 4-20</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings.sicknessCommonPct2 ?? 60}
                    onChange={(e) =>
                      handleNumberInput("sicknessCommonPct2", e.target.value)
                    }
                    className="w-full mt-0.5"
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs">% días 21+</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings.sicknessCommonPct3 ?? 75}
                    onChange={(e) =>
                      handleNumberInput("sicknessCommonPct3", e.target.value)
                    }
                    className="w-full mt-0.5"
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-2">
                🦺 Baja Laboral (AT)
              </p>
              <div className="form-group">
                <label className="text-xs">% desde día 1</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={settings.sicknessLaboralPct ?? 75}
                  onChange={(e) =>
                    handleNumberInput("sicknessLaboralPct", e.target.value)
                  }
                  className="w-full mt-0.5"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                La SS paga desde el día siguiente al accidente.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="section-title">Anticipos por Mes (€)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="text-xs mb-1 block">Seleccionar Mes</label>
              <input
                type="month"
                value={advMonth}
                onChange={(e) => setAdvMonth(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="form-group">
              <label className="text-xs mb-1 block">Importe Anticipo (€)</label>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={advances[advMonth] || ""}
                onChange={(e) => {
                  const val = e.target.value.replace(",", ".");
                  if (val === "" || /^\d*\.?\d*$/.test(val)) {
                    setAdvances((prev) => ({ ...prev, [advMonth]: val }));
                  }
                }}
                className="w-full"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            El anticipo se restará del neto final en el resumen del historial.
          </p>
        </section>

        <section>
          <h3 className="section-title">📅 Festivos Locales / Nacionales</h3>
          <p className="text-xs text-gray-400 mb-3">
            Añade festivos de tu municipio o comunidad para que la app aplique la tarifa de Hora Festiva automáticamente.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <input
              type="date"
              value={newHoliDate}
              onChange={(e) => setNewHoliDate(e.target.value)}
              className="w-full text-sm"
            />
            <input
              type="text"
              placeholder="Nombre del festivo (ej: San Ginés / Cartagena)"
              value={newHoliName}
              onChange={(e) => setNewHoliName(e.target.value)}
              className="w-full text-sm"
            />
            <button
              type="button"
              onClick={() => {
                if (newHoliDate) {
                  addHoliday(newHoliDate, newHoliName);
                  setNewHoliDate("");
                  setNewHoliName("");
                }
              }}
              className="btn-primary flex items-center justify-center gap-1 py-2 text-sm"
            >
              <Plus size={16} /> Añadir Festivo
            </button>
          </div>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
            {Object.keys(holidays || {}).length === 0 ? (
              <span className="text-xs text-gray-400 p-2">No hay festivos guardados.</span>
            ) : (
              Object.entries(holidays)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dStr, name]) => (
                  <div
                    key={dStr}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full text-xs font-semibold border border-teal-100 dark:border-teal-900/50"
                  >
                    <span>📅 {dStr}: {name}</span>
                    <button
                      type="button"
                      onClick={() => deleteHoliday(dStr)}
                      className="text-teal-500 hover:text-rose-500 transition-colors"
                      title="Eliminar festivo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
            )}
          </div>
        </section>

        <section>
          <h3 className="section-title">Preferencias Diarias</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span>¿Almuerzo remunerado por defecto?</span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.paidLunchDefault}
                  onChange={(e) => {
                    updateSetting("paidLunchDefault", e.target.checked);
                    updateAllRecordsSettings({ paidLunch: e.target.checked });
                  }}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="form-group p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <label className="text-sm font-medium block mb-1">
                Descanso / Bocadillo no pagado por defecto (minutos)
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej: 15, 30, 45"
                value={settings.breakMinutesDefault ?? 0}
                onChange={(e) =>
                  handleNumberInput("breakMinutesDefault", e.target.value)
                }
                className="w-full mt-1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Se restará automáticamente del cómputo de horas de trabajo efectivo del día.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="section-title">Apariencia</h3>
          <select
            value={settings.theme}
            onChange={(e) => updateSetting("theme", e.target.value)}
            className="w-full"
          >
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
            <option value="system">Sistema</option>
          </select>
        </section>

        <section className="pt-4 border-t border-gray-100 dark:border-gray-800">
          <h3 className="section-title">Datos</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Exportar Copia de Seguridad
            </button>

            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImport}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
            >
              <Upload size={18} />
              Importar Datos
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            Guarda un archivo con todos tus registros o recupera una copia
            anterior.
          </p>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
