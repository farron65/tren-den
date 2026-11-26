import { useEffect, useState } from "react";
import "./calendar.css";
import { authenticatedFetch } from "../api/apiClient";
import { useNavigate } from "react-router-dom";

type calendarWorkouts = {
    workout_name: string;
    id: number;
}

type Dictionary = Record <string, calendarWorkouts>;

export default function Calendar() {
    const [current, setCurrent] = useState(new Date());
    const [calendar, setCalendar] = useState<Dictionary>();
    const navigate = useNavigate();

    const [hoveredCell, setHoveredCell] = useState<number | null>(null);

    const year = current.getFullYear();
    const month = current.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const monthName = current.toLocaleString("default", { month: "long" });

    const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrent(new Date(year, month + 1, 1));
    const goToToday = () => setCurrent(new Date());

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const toDateKey = (y: number, m: number, d: number) =>
        `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

    const monthPrefix = toDateKey(year, month, 1).slice(0, 8); // "YYYY-MM-"
    const monthWorkoutCount = calendar
        ? Object.keys(calendar).filter((key) => key.startsWith(monthPrefix)).length
        : 0;

    const formatPopupDate = (day: number) =>
        new Date(year, month, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    // Build grid: leading empty slots + current month days
    const cells = [];

    for (let i = firstDay - 1; i >= 0; i--) {
        cells.push({ day: daysInPrevMonth - i, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, current: true });
    }
    while (cells.length % 7 !== 0) {
        cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false });
    }

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
        weeks.push(cells.slice(i, i + 7));
    }

    useEffect(() => {
        const fetchWorkouts = async () => {
            try {
                const response = await authenticatedFetch("/workouts/calendar", "GET");
                
                if (!response.ok) {
                    return;
                }

                const result = await response.json();

                const dict = result.reduce((acc: Dictionary, item: any) => {
                    acc[item.date.slice(0,10)] = {"workout_name": item.workout_name, "id": item.id}; // slice till 10th character to get rid of h/m/s in the dates  
                    return acc;
                }, {})
                setCalendar(dict);
            }
            catch(error) {
                throw error;
            }
        };
        fetchWorkouts();
    }, []);

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <div className="calendar-top-row">
                    <span className="calendar-label">Calendar</span>
                    <button className="calendar-today-btn" onClick={goToToday} disabled={isCurrentMonth}>
                        Today
                    </button>
                </div>
                <div className="calendar-nav-group">
                    <button className="calendar-nav" onClick={prevMonth} aria-label="Previous month">&lsaquo;</button>
                    <h2 className="calendar-month">{monthName} {year}</h2>
                    <button className="calendar-nav" onClick={nextMonth} aria-label="Next month">&rsaquo;</button>
                </div>
                <p className="calendar-month-count">
                    {monthWorkoutCount === 0
                        ? "No workouts"
                        : `${monthWorkoutCount} workout${monthWorkoutCount === 1 ? "" : "s"}`}
                </p>
            </div>

            <div className="calendar-day-labels">
                {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
            </div>

            <div className="calendar-grid">
                
                {cells.map((cell, i) => {
                    const dateKey = toDateKey(year, month, cell.day);
                    const workout = cell.current ? calendar?.[dateKey] : undefined;
                    const isToday = cell.current && dateKey === todayKey;

                    const classes = [
                        "calendar-cell",
                        !cell.current && "inactive",
                        workout && "hasWorkout",
                        isToday && "today",
                    ].filter(Boolean).join(" ");

                    // Keep the popup inside the calendar on the edge columns
                    const column = i % 7;
                    const popupAlign = column <= 1 ? "align-left" : column >= 5 ? "align-right" : "";

                    return (
                        <div key={i} className="calendar-cell-wrapper">
                            {workout ? (
                                <button
                                    className={classes}
                                    onClick={() => navigate(`/workouts/${workout.id}`)}
                                    onMouseEnter={() => setHoveredCell(i)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    onFocus={() => setHoveredCell(i)}
                                    onBlur={() => setHoveredCell(null)}
                                    aria-label={`${workout.workout_name}, ${formatPopupDate(cell.day)}`}
                                >
                                    {cell.day}
                                </button>
                            ) : (
                                <div className={classes}>{cell.day}</div>
                            )}

                            {hoveredCell === i && workout &&
                                <div className={`calendar-popup ${popupAlign}`}>
                                    <p className="popup-workout-name">{workout.workout_name}</p>
                                    <p className="popup-date">{formatPopupDate(cell.day)}</p>
                                </div>
                            }
                        </div>
                    )
                })}
            </div>
        </div>
    );
}