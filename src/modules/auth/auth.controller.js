import { getGithubAuthUrl, getGithubToken, getGithubUser, getGithubUserEmails } from "./github.service.js";
import { getGoogleAuthUrl, getGoogleToken, getGoogleUser } from "./google.service.js";
import prisma from "../../config/db.js";
import jwt from "jsonwebtoken";

export const githublogin = (req, res) => {
    const url = getGithubAuthUrl();
    res.redirect(url);
};

export const githubCallback = async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: "Authorization code not provided!" });
    }

    try {
        const accessToken = await getGithubToken(code);
        if (!accessToken) {
            return res.status(400).json({ error: "Failed to get access token" });
        }

        const user = await getGithubUser(accessToken);
        
        const emails = await getGithubUserEmails(accessToken);
        const primaryEmail = emails.find(email => email.primary)?.email;
        const emailToUse = primaryEmail || user.email;

        if (!emailToUse) {
            return res.status(400).json({ error: "No primary email found from GitHub" });
        }

        let dbUser = await prisma.user.findUnique({
            where: { githubId: String(user.id) }
        });

        if (!dbUser) {
            dbUser = await prisma.user.findUnique({
                where: { email: emailToUse }
            });

            if (dbUser) {
                dbUser = await prisma.user.update({
                    where: { email: emailToUse },
                    data: { githubId: String(user.id), avatarUrl: user.avatar_url || dbUser.avatarUrl }
                });
            } else {
                dbUser = await prisma.user.create({
                    data: {
                        githubId: String(user.id),
                        username: user.login,
                        name: user.name,
                        email: emailToUse,
                        avatarUrl: user.avatar_url
                    }
                });
            }
        }

        const sessionToken = jwt.sign(
            { id: dbUser.id, email: dbUser.email },
            process.env.JWT_SECRET || "fallback_secret_key",
            { expiresIn: "7d" }
        );
        
        res.json({
            message: "Successfully logged in with GitHub",
            user: dbUser,
            token: sessionToken,
            githubAccessToken: accessToken
        });
    } catch (error) {
        console.error("Error during GitHub OAuth callback:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const googleLogin = (req, res) => {
    const url = getGoogleAuthUrl();
    res.redirect(url);
};

export const googleCallback = async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).json({ error: "Authorization code not provided!" });
    }

    try {
        const accessToken = await getGoogleToken(code);
        if (!accessToken) {
            return res.status(400).json({ error: "Failed to get access token" });
        }

        const user = await getGoogleUser(accessToken);
        const emailToUse = user.email;

        if (!emailToUse) {
            return res.status(400).json({ error: "No primary email found from Google" });
        }

        let dbUser = await prisma.user.findUnique({
            where: { googleId: String(user.id) }
        });

        if (!dbUser) {
            dbUser = await prisma.user.findUnique({
                where: { email: emailToUse }
            });

            if (dbUser) {
                dbUser = await prisma.user.update({
                    where: { email: emailToUse },
                    data: { googleId: String(user.id), avatarUrl: user.picture || dbUser.avatarUrl, name: user.name || dbUser.name }
                });
            } else {
                dbUser = await prisma.user.create({
                    data: {
                        googleId: String(user.id),
                        name: user.name,
                        email: emailToUse,
                        avatarUrl: user.picture
                        // username is omitted since Google doesn't provide one
                    }
                });
            }
        }

        const sessionToken = jwt.sign(
            { id: dbUser.id, email: dbUser.email },
            process.env.JWT_SECRET || "fallback_secret_key",
            { expiresIn: "7d" }
        );
        
        res.json({
            message: "Successfully logged in with Google",
            user: dbUser,
            token: sessionToken,
            googleAccessToken: accessToken
        });
    } catch (error) {
        console.error("Error during Google OAuth callback:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
