import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useSelectors } from "../hooks/useSelectors";
import { getTypeName } from "../utils/helpers";

export default function CalendarPage() {
  const { state, setState } = useApp();
  const { getVisibleProjects, getCalendarPromotions, getProject } = useSelectors();
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const activeCalendar = useRef(null);
  const projects = getVisibleProjects();

  useEffect(() => {
    const el = calendarRef.current;
    if (!el) return;

    if (activeCalendar.current) {
      activeCalendar.current.destroy();
      activeCalendar.current = null;
    }

    if (!window.FullCalendar) {
      el.innerHTML = '<div class="empty">Calendar library could not be loaded. Check your internet connection and refresh.</div>';
      return;
    }

    const promotions = getCalendarPromotions();
    const initialDate = promotions[0]?.scheduledDate || new Date().toISOString().slice(0, 10);
    const colors = {
      Draft: "#6b7280",
      "Pending Approval": "#b7791f",
      Approved: "#237a57",
      "Revision Required": "#c94c4c",
      Published: "#0f7895",
    };

    activeCalendar.current = new window.FullCalendar.Calendar(el, {
      initialView: "dayGridMonth",
      initialDate,
      height: "auto",
      navLinks: true,
      nowIndicator: true,
      eventDisplay: "block",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "timeGridDay,timeGridWeek,dayGridMonth,dayGridYear",
      },
      buttonText: { today: "Today", day: "Day", week: "Week", month: "Month", year: "Year" },
      events: promotions.map((promo) => ({
        id: promo.id,
        title: `${promo.title} · ${getTypeName(promo.type, state.promotionTypes)}`,
        start: promo.scheduledDate,
        allDay: true,
        backgroundColor: colors[promo.status] || "#2d6cdf",
        borderColor: colors[promo.status] || "#2d6cdf",
      })),
      eventClick(info) {
        const promo = state.promotions.find((p) => p.id === info.event.id);
        if (promo) navigate(`/promotions/${promo.id}`);
      },
    });
    activeCalendar.current.render();

    return () => {
      if (activeCalendar.current) {
        activeCalendar.current.destroy();
        activeCalendar.current = null;
      }
    };
  }, [state.calendarProjectFilter, state.promotions]);

  return (
    <>
      <section className="page-head">
        <div>
          <h1>Promotions Calendar</h1>
          <p className="muted">Day, week, month, and year views powered by FullCalendar.</p>
        </div>
        <select
          aria-label="Project"
          value={state.calendarProjectFilter}
          onChange={(e) => setState({ calendarProjectFilter: e.target.value })}
        >
          <option value="all">All visible projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </section>
      <section className="calendar-shell">
        <div ref={calendarRef} id="promotion-calendar" />
      </section>
    </>
  );
}
