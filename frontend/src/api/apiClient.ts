let refreshPromise: Promise<string> | null = null; 

async function refreshAccessToken(baseURL: string) {
    
    if (refreshPromise) return await refreshPromise;

    // If refresh is already in progress, wait for it to finish instead of calling it again.
    refreshPromise = (async () => {
        const refreshToken = localStorage.getItem("refresh_token");
    
        if (!refreshToken) {
            throw Error("Refresh token doesn't exist");
        }
    
        const url = `${baseURL}/auth/refresh`;
    
        const formData = new URLSearchParams();
        formData.append("refresh_token", refreshToken);
    
        const requestOptions = {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: formData
        }
    
        const response = await fetch(url, requestOptions);
    
        if (!response.ok) {
            throw new Error("Error");
        }
    
        const result = await response.json();
        localStorage.setItem("refresh_token", result.refresh_token);
        localStorage.setItem("access_token", result.access_token);
        
        return result.access_token;      
    })();

    const result = await refreshPromise;
    refreshPromise = null;
    return result;

}

export async function authenticatedFetch(path: string, method: string, body?: object, customHeaders?: object) {
    const baseURL = import.meta.env.VITE_API_URL;
    const access_token = localStorage.getItem("access_token");

    if (!access_token) {
        throw Error("Access token needed");
    }

    const requestOptions = {
        method: method,
        headers: {
            "Authorization": `Bearer ${access_token}`,
            "Content-Type": "application/json",
            ...customHeaders
        },
        body: body ? JSON.stringify(body) : null 
    }
    
    const response = await fetch(`${baseURL}${path}`, requestOptions);

    if (response.status === 401) {
        const new_access_token = await refreshAccessToken(baseURL);
        
        if (new_access_token) {
            const new_requestOptions = {
                method: method,
                headers: {
                    "Authorization": `Bearer ${new_access_token}`,
                    "Content-Type": "application/json",
                    ...customHeaders
                },
                body: body ? JSON.stringify(body) : null 
            }
            const response = await fetch(`${baseURL}${path}`, new_requestOptions);

            return response;
        }
    }

    return response;
}