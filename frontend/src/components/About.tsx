import { useEffect, useState } from "react"
import { authenticatedFetch } from "../api/apiClient";
import Calendar from "./Calendar";

import "./about.css";

interface User {
    username: string,
    email: string,
}

export default function About() {
    const [user, setUser] = useState<User>({
        username: "",
        email: "",
    });

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

    return (
        <>
        <div className="about-page">
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

            <div className="about-calendar">
                <Calendar/>
            </div>
        </div>
        </>
    )
}