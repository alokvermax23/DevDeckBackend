import dotenv from "dotenv";
dotenv.config();

export const getGoogleAuthUrl = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL;
    if (!clientId || !redirectUri) {
        throw new Error("Missing Google OAuth config in .env");
    }
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        access_type: "offline",
        prompt: "consent"
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const getGoogleToken = async (code) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALLBACK_URL;
    
    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Google token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
};

export const getGoogleUser = async (accessToken) => {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Google user info: ${response.statusText}`);
    }

    return response.json();
};
