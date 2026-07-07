import dotenv from "dotenv";
dotenv.config();

export const getGithubAuthUrl = () => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;
    if (!clientId || !redirectUri) {
        throw new Error("Missing GitHub OAuth config in .env");
    }
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: "read:user user:email",
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

export const getGithubToken = async (code) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    
    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
    });

    const response = await fetch(`https://github.com/login/oauth/access_token?${params.toString()}`, {
        method: "POST",
        headers: {
            "Accept": "application/json"
        }
    });

    const data = await response.json();
    return data.access_token;
};

export const getGithubUser = async (accessToken) => {
    const response = await fetch("https://api.github.com/user", {
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json"
        }
    });
    return response.json();
};

export const getGithubUserEmails = async (accessToken) => {
    const response = await fetch("https://api.github.com/user/emails", {
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Accept": "application/json"
        }
    });
    return response.json();
};
