import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import "./DeadlinePicker.css";

const IST_MS   = 5.5 * 60 * 60 * 1000;
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

/* ── IST helpers ─────────────────────────────────────────── */
const toIST   = (date) => new Date(date.getTime() + IST_MS);
const fromIST = (y, m, d, h, min) =>
  new Date(Date.UTC(y, m, d, h, min, 0) - IST_MS);

const getISTNow = () => {
  const d = toIST(new Date());
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
};

const parseValue = (iso) => {
  if (!iso) return null;
  const d = toIST(new Date(iso));
  return {
    y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(),
    h: d.getUTCHours(),    min: d.getUTCMinutes(),
  };
};

const formatDisplay = (iso) => {
  if (!iso) return null;
  const p = parseValue(iso);
  const ampm = p.h >= 12 ? "PM" : "AM";
  const h12  = p.h % 12 || 12;
  const mm   = p.min.toString().padStart(2, "0");
  return `${p.d} ${MONTHS[p.m].slice(0, 3)} ${p.y}  ·  ${h12}:${mm} ${ampm} IST`;
};

/* ── Component ──────────────────────────────────────────────*/
const DeadlinePicker = ({ value, onChange }) => {
  const today  = getISTNow();
  const parsed = parseValue(value);

  const [open,     setOpen]     = useState(false);
  const [vy,       setVy]       = useState(parsed?.y ?? today.y);
  const [vm,       setVm]       = useState(parsed?.m ?? today.m);
  const [selDay,   setSelDay]   = useState(parsed?.d ?? null);
  const [selMon,   setSelMon]   = useState(parsed?.m ?? null);
  const [selYr,    setSelYr]    = useState(parsed?.y ?? null);
  const [hour,     setHour]     = useState(parsed?.h   ?? 23);
  const [minute,   setMinute]   = useState(parsed?.min ?? 59);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 320 });

  const wrapRef     = useRef(null);
  const panelRef    = useRef(null);
  const hourSpinRef = useRef(null);
  const minSpinRef  = useRef(null);

  /* ── Block page scroll when interacting with the panel ──── */
  useEffect(() => {
    if (!open) return;
    const panel   = panelRef.current;
    const hourEl  = hourSpinRef.current;
    const minEl   = minSpinRef.current;

    /* stop page scroll everywhere inside the panel */
    const blockScroll = (e) => e.preventDefault();

    /* spinner-specific: block page AND update value */
    const onHourWheel = (e) => {
      e.preventDefault();
      setHour(h => e.deltaY < 0 ? (h + 1) % 24 : (h - 1 + 24) % 24);
    };
    const onMinWheel = (e) => {
      e.preventDefault();
      setMinute(m => e.deltaY < 0 ? (m + 1) % 60 : (m - 1 + 60) % 60);
    };

    if (panel)  panel.addEventListener("wheel", blockScroll,  { passive: false });
    if (hourEl) hourEl.addEventListener("wheel", onHourWheel, { passive: false });
    if (minEl)  minEl.addEventListener("wheel",  onMinWheel,  { passive: false });

    return () => {
      if (panel)  panel.removeEventListener("wheel", blockScroll);
      if (hourEl) hourEl.removeEventListener("wheel", onHourWheel);
      if (minEl)  minEl.removeEventListener("wheel",  onMinWheel);
    };
  }, [open]);

  /* sync when value changes externally */
  useEffect(() => {
    const p = parseValue(value);
    if (p) {
      setVy(p.y); setVm(p.m);
      setSelDay(p.d); setSelMon(p.m); setSelYr(p.y);
      setHour(p.h); setMinute(p.min);
    } else {
      setSelDay(null); setSelMon(null); setSelYr(null);
      setHour(23); setMinute(59);
    }
  }, [value]);

  /* open panel — position: fixed uses VIEWPORT coords, no scroll offset */
  const openPicker = () => {
    if (wrapRef.current) {
      const r   = wrapRef.current.getBoundingClientRect();
      const w   = Math.max(320, r.width);
      const PANEL_H = 470; // approximate max panel height

      /* horizontal: don't overflow right or left edge */
      let left = r.left;
      if (left + w > window.innerWidth - 12) left = window.innerWidth - w - 12;
      if (left < 8) left = 8;

      /* vertical: open below if enough room, otherwise open above */
      const spaceBelow = window.innerHeight - r.bottom - 8;
      const spaceAbove = r.top - 8;
      const top = spaceBelow >= PANEL_H || spaceBelow >= spaceAbove
        ? r.bottom + 6
        : Math.max(8, r.top - Math.min(PANEL_H, spaceAbove) - 6);

      setPanelPos({ top, left, width: w });
    }
    setOpen(true);
  };

  /* calendar helpers */
  const daysInMonth  = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstWeekday = (y, m) => new Date(y, m, 1).getDay();

  const isPrevDisabled = vy < today.y || (vy === today.y && vm <= today.m);

  const prevMonth = () => {
    if (isPrevDisabled) return;
    if (vm === 0) { setVm(11); setVy(y => y - 1); } else setVm(m => m - 1);
  };
  const nextMonth = () => vm === 11 ? (setVm(0), setVy(y => y + 1)) : setVm(m => m + 1);

  const isPast   = (d) => vy < today.y || (vy === today.y && vm < today.m) || (vy === today.y && vm === today.m && d < today.d);
  const isToday  = (d) => vy === today.y && vm === today.m && d === today.d;
  const isSel    = (d) => selDay === d && selMon === vm && selYr === vy;

  const selectDay = (d) => { if (!isPast(d)) { setSelDay(d); setSelMon(vm); setSelYr(vy); } };

  /* time helpers */
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12  = hour % 12 || 12;
  const mm   = minute.toString().padStart(2, "0");
  const hasSel = selDay !== null && selMon !== null && selYr !== null;

  const previewText = hasSel
    ? `${selDay} ${MONTHS[selMon].slice(0, 3)} ${selYr}  ·  ${h12}:${mm} ${ampm} IST`
    : "Select a date first";

  /* actions */
  const handleConfirm = () => {
    if (!hasSel) return;
    onChange(fromIST(selYr, selMon, selDay, hour, minute).toISOString());
    setOpen(false);
  };

  const handleClear = (e) => {
    e?.stopPropagation();
    setSelDay(null); setSelMon(null); setSelYr(null);
    onChange("");
    setOpen(false);
  };

  /* build grid cells */
  const total   = daysInMonth(vy, vm);
  const blanks  = firstWeekday(vy, vm);
  const cells   = [...Array(blanks).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  const displayText = formatDisplay(value);

  /* ── Portal Panel ── */
  const panel = open && ReactDOM.createPortal(
    <>
      <div className="dp-backdrop" onClick={() => setOpen(false)} />
      <div
        ref={panelRef}
        className="dp-panel"
        style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Month Navigation ── */}
        <div className="dp-nav">
          <button
            type="button"
            className={`dp-nav-btn ${isPrevDisabled ? "dp-nav-btn-disabled" : ""}`}
            onClick={prevMonth}
            disabled={isPrevDisabled}
          >
            <i className="bi bi-chevron-left" />
          </button>
          <div className="dp-month-yr">
            <span className="dp-month-name">{MONTHS[vm]}</span>
            <span className="dp-yr">{vy}</span>
          </div>
          <button type="button" className="dp-nav-btn" onClick={nextMonth}>
            <i className="bi bi-chevron-right" />
          </button>
        </div>

        {/* ── Calendar Grid ── */}
        <div className="dp-grid">
          {WEEKDAYS.map(d => <div key={d} className="dp-wd">{d}</div>)}
          {cells.map((day, i) => (
            <div
              key={i}
              className={[
                "dp-cell",
                !day           ? "dp-blank"  : "",
                day && isPast(day)  ? "dp-past"   : "",
                day && isToday(day) ? "dp-today"  : "",
                day && isSel(day)   ? "dp-sel"    : "",
                day && !isPast(day) && !isSel(day) ? "dp-active" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => day && selectDay(day)}
            >
              <span>{day}</span>
            </div>
          ))}
        </div>

        {/* ── Time Picker ── */}
        <div className="dp-time-section">
          <div className="dp-time-header">
            <i className="bi bi-clock-fill" />
            <span>Pick a Time</span>
            <span className="dp-ist-chip">IST · UTC+5:30</span>
          </div>

          <div className="dp-spinners-row">
            {/* Hour */}
            <div className="dp-spinner-block">
              <div className="dp-spin-label">Hour</div>
              <div ref={hourSpinRef} className="dp-spinner">
                <button type="button" className="dp-spin-btn dp-spin-up"
                  onClick={() => setHour(h => (h + 1) % 24)}
                  onMouseDown={(e) => { e.preventDefault(); }}>
                  <i className="bi bi-chevron-up" />
                </button>
                <div className="dp-spin-val">{h12.toString().padStart(2, "0")}</div>
                <button type="button" className="dp-spin-btn dp-spin-dn"
                  onClick={() => setHour(h => (h - 1 + 24) % 24)}
                  onMouseDown={(e) => { e.preventDefault(); }}>
                  <i className="bi bi-chevron-down" />
                </button>
              </div>
            </div>

            <div className="dp-colon">:</div>

            {/* Minute */}
            <div className="dp-spinner-block">
              <div className="dp-spin-label">Min</div>
              <div ref={minSpinRef} className="dp-spinner">
                <button type="button" className="dp-spin-btn dp-spin-up"
                  onClick={() => setMinute(m => (m + 1) % 60)}
                  onMouseDown={(e) => { e.preventDefault(); }}>
                  <i className="bi bi-chevron-up" />
                </button>
                <div className="dp-spin-val">{mm}</div>
                <button type="button" className="dp-spin-btn dp-spin-dn"
                  onClick={() => setMinute(m => (m - 1 + 60) % 60)}
                  onMouseDown={(e) => { e.preventDefault(); }}>
                  <i className="bi bi-chevron-down" />
                </button>
              </div>
            </div>

            {/* AM/PM Toggle */}
            <div className="dp-spinner-block">
              <div className="dp-spin-label">Period</div>
              <button
                type="button"
                className={`dp-ampm-btn ${ampm === "AM" ? "dp-ampm-am" : "dp-ampm-pm"}`}
                onClick={() => setHour(h => h >= 12 ? h - 12 : h + 12)}
              >
                <span className="dp-ampm-top">{ampm === "AM" ? "PM" : "AM"}</span>
                <span className="dp-ampm-cur">{ampm}</span>
                <span className="dp-ampm-bot">{ampm === "AM" ? "PM" : "AM"}</span>
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className={`dp-preview ${hasSel ? "dp-preview-ready" : ""}`}>
            <i className={`bi ${hasSel ? "bi-calendar2-check-fill" : "bi-calendar2"} me-2`} />
            {previewText}
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="dp-footer">
          <button type="button" className="dp-btn-clear" onClick={handleClear}>
            <i className="bi bi-x-circle me-1" />Clear
          </button>
          <button type="button" className="dp-btn-confirm" onClick={handleConfirm} disabled={!hasSel}>
            <i className="bi bi-check2-circle me-1" />Set Deadline
          </button>
        </div>
      </div>
    </>,
    document.body
  );

  return (
    <div className="dp-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`dp-trigger ${value ? "dp-trigger-filled" : ""}`}
        onClick={() => open ? setOpen(false) : openPicker()}
      >
        <i className={`bi ${value ? "bi-calendar2-check-fill" : "bi-calendar3"} dp-tr-icon`} />
        <span className="dp-tr-text">{displayText || "No deadline — click to set"}</span>
        {value ? (
          <span
            className="dp-tr-x"
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => e.key === "Enter" && handleClear(e)}
          >
            <i className="bi bi-x-lg" />
          </span>
        ) : (
          <i className="bi bi-chevron-down dp-tr-chev" />
        )}
      </button>

      {panel}
    </div>
  );
};

export default DeadlinePicker;
