import { useEffect, useState } from "react";

export default function ListTemplates() {
    const [templates, setTemplates] = useState<any[]>([]);
    const access_token = localStorage.getItem("access_token");
    const url = "http://127.0.0.1:8000/templates"

    useEffect(() => {

        const fetchTemplates = async () => {
            if (!access_token) {
                alert("Access token needed");
                return;
            }
            const headers = {"Authorization": `Bearer ${access_token}`}

            try {
                const response = await fetch(url, {headers: headers});
                
                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }
                const result = await response.json();
                setTemplates(result);
            }
            catch (error) {
                alert(error);
            }
        }
        fetchTemplates();
    }, []);

    return <div>Template</div>
}