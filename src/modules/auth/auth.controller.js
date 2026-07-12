import { getGithubAuthUrl, getGithubToken, getGithubUser, getGithubUserEmails } from "./github.service.js";
import { getGoogleAuthUrl, getGoogleToken, getGoogleUser } from "./google.service.js";
import prisma from "../../config/db.js";
import jwt from "jsonwebtoken";
import { fetchProfile as fetchGithub } from "../platforms/fetchers/github.fetcher.js";

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

        let isNewUser = false;

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
                isNewUser = true;
                dbUser = await prisma.user.create({
                    data: {
                        githubId: String(user.id),
                        name: user.name,
                        email: emailToUse,
                        avatarUrl: user.avatar_url
                    }
                });
            }
        }

        // Auto-link GitHub platform
        if (user.login) {
            const githubLink = await prisma.platformLink.findUnique({
                where: {
                    userId_platform: {
                        userId: dbUser.id,
                        platform: "GITHUB"
                    }
                }
            });

            if (!githubLink) {
                const result = await fetchGithub(user.login);
                if (result.success) {
                    const newLink = await prisma.platformLink.create({
                        data: {
                            userId: dbUser.id,
                            platform: "GITHUB",
                            externalUsername: user.login,
                            lastSyncedAt: new Date(),
                            lastSyncStatus: "SUCCESS",
                        }
                    });

                    await prisma.platformStats.create({
                        data: {
                            platformLinkId: newLink.id,
                            problemsSolved: result.data.problemsSolved ?? null,
                            rating: result.data.rating ?? null,
                            maxRating: result.data.maxRating ?? null,
                            rank: result.data.rank ?? null,
                            easyCount: result.data.easyCount ?? null,
                            mediumCount: result.data.mediumCount ?? null,
                            hardCount: result.data.hardCount ?? null,
                            heatmapData: result.data.heatmapData ?? null,
                        }
                    });
                }
            }
        }

        const sessionToken = jwt.sign(
            { id: dbUser.id, email: dbUser.email },
            process.env.JWT_SECRET || "fallback_secret_key",
            { expiresIn: "7d" }
        );
        
        let redirectUrl = `devdeck://callback?token=${sessionToken}`;
        if (dbUser.name) redirectUrl += `&name=${encodeURIComponent(dbUser.name)}`;
        redirectUrl += `&isNewUser=${isNewUser}`;
        res.redirect(redirectUrl);
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

        let isNewUser = false;

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
                isNewUser = true;
                dbUser = await prisma.user.create({
                    data: {
                        googleId: String(user.id),
                        name: user.name,
                        email: emailToUse,
                        avatarUrl: user.picture
                    }
                });
            }
        }

        const sessionToken = jwt.sign(
            { id: dbUser.id, email: dbUser.email },
            process.env.JWT_SECRET || "fallback_secret_key",
            { expiresIn: "7d" }
        );
        
        let redirectUrl = `devdeck://callback?token=${sessionToken}`;
        if (dbUser.name) redirectUrl += `&name=${encodeURIComponent(dbUser.name)}`;
        redirectUrl += `&isNewUser=${isNewUser}`;
        res.redirect(redirectUrl);
    } catch (error) {
        console.error("Error during Google OAuth callback:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
