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
            <h2>Calendar</h2>
            <div className="calendar-header">
                <button className="calendar-nav" onClick={prevMonth}>&lsaquo;</button>
                <span>{monthName} {year}</span>
                <button className="calendar-nav" onClick={nextMonth}>&rsaquo;</button>
            </div>

            <div className="calendar-day-labels">
                {["S","M","T","W","T","F","S"].map((d, i) => <span key={i}>{d}</span>)}
            </div>

            <div className="calendar-grid">
                
                {cells.map((cell, i) => {
                    const dateKey = `${year}-${String(month+1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                    if (calendar && calendar[dateKey]) {
                    }
                    return (
                        <div key={i} style={{ position: "relative" }}>
                            <button 
                                onClick={() => {
                                    if (cell.current && calendar && calendar[dateKey]) {
                                        navigate(`/workouts/${calendar[dateKey]["id"]}`)
                                    }
                                }}
                                onMouseEnter={() => setHoveredCell(i)}
                                onMouseLeave={() => setHoveredCell(null)}
                                className={`calendar-cell ${!cell.current ? "inactive" : cell.current && calendar && calendar[dateKey] ? "hasWorkout" : ""}`}
                                >
                                {cell.day}
                            </button>
                            
                            {hoveredCell === i && calendar && calendar[dateKey] && cell.current &&
                                <div className="calendar-popup">
                                    <p className="popup-workout-name">{calendar[dateKey]["workout_name"]}</p>
                                    <p className="popup-date">{dateKey}</p>
                                </div>
                            }
                        </div>
                    )
                })}
            </div>
        </div>
    );
}