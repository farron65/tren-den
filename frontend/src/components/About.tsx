import { useEffect, useState } from "react"
import { authenticatedFetch } from "../api/apiClient";
import Calendar from "./Calendar";

import "./about.css";

interface User {
    username: string,
    email: string,
}

interface UserStats {
    total_workouts: number,
    current_month_workouts: number,

}

export default function About() {
    const [user, setUser] = useState<User>({
        username: "",
        email: "",
    });

    const [userStats, setUserStats] = useState<UserStats>({
        total_workouts: 0,
        current_month_workouts: 0,
    })

    // To get user img
    useEffect(() => {
        const getUser = async () => {
            try {
                const response = await authenticatedFetch("/about", "GET");
                if (!response.ok) {
                    return;
                }
                const result = await response.json();
                setUser(result);
            }
            catch(error) {
                throw error;
            }
        }
        getUser();
    }, []);

    // to get user stats
    useEffect(() => {
        const getUser = async () => {
            try {
                const response = await authenticatedFetch("/stats", "GET");
                if (!response.ok) {
                    return;
                }
                const result = await response.json();
                setUserStats(result);
            }
            catch(error) {
                throw error;
            }
        }
        getUser();
    }, []);

   return (
    <div className="about-page">
        <div className="about-left">
            <div className="about-profile">
                <div className="about-avatar">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                </div>
                <div className="about-info">
                    <h2>{user.username}</h2>
                    <p>{user.email}</p>
                </div>
            </div>

            <div className="about-stats">
                <div className="stat-item">
                    <span className="stat-label">Total Workouts</span>
                    <span className="stat-value">{userStats.total_workouts}</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">This Month</span>
                    <span className="stat-value">{userStats.current_month_workouts}</span>
                </div>
            </div>

            <div className="about-motivation">
                <p className="motivation-text">
                    Everyone has something keeping them comfortable. Your phone. A job that pays enough. 
                    A life that's safe enough to stay in but not good enough to be proud of. 
                    Comfort doesn't feel like a trap — that's what makes it dangerous.
                </p>
                <p className="motivation-text">
                    Anything that feels safe but quietly keeps you from becoming who you're supposed to be — that's the enemy. 
                    Not failure. Comfort.
                </p>
                <p className="motivation-sub">
                    {userStats.total_workouts} workouts logged. {userStats.current_month_workouts} this month. You showed up. Keep going.
                </p>
            </div>
        </div>

        <div className="about-calendar">
            <Calendar/>
        </div>
    </div>
    );
}