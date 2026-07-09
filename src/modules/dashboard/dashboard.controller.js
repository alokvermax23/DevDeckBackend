import { getDashboardSummary } from "./dashboard.service.js";

export const getDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const summary = await getDashboardSummary(userId);
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
