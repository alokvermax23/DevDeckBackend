import prisma from "../../config/db.js";

// @route   GET /api/user/check-username
// @desc    Check if a username is available
// @access  Public
export const checkUsernameAvailability = async (req, res) => {
    try {
        const { username } = req.query;

        if (!username) {
            return res.status(400).json({ error: "Username query parameter is required" });
        }

        // Validate basic constraints (e.g. alphanumeric, min 3 chars) to avoid useless db queries
        const isValidFormat = /^[a-zA-Z0-9_]{3,30}$/.test(username);
        if (!isValidFormat) {
            return res.status(400).json({ 
                error: "Username must be 3-30 characters long and contain only letters, numbers, and underscores" 
            });
        }

        // B-Tree indexed O(log N) lookup
        const existingUser = await prisma.user.findUnique({
            where: { username },
            select: { id: true } // Only select ID to minimize payload and memory overhead
        });

        res.json({ available: !existingUser });
    } catch (error) {
        console.error("Error checking username:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// @route   PATCH /api/user/username
// @desc    Update the authenticated user's username
// @access  Private
export const updateUsername = async (req, res) => {
    try {
        const { username } = req.body;
        const userId = req.user.id; // Extracted from auth middleware

        if (!username) {
            return res.status(400).json({ error: "Username is required in the request body" });
        }

        const isValidFormat = /^[a-zA-Z0-9_]{3,30}$/.test(username);
        if (!isValidFormat) {
            return res.status(400).json({ 
                error: "Username must be 3-30 characters long and contain only letters, numbers, and underscores" 
            });
        }

        // Ensure username is not already taken
        const existingUser = await prisma.user.findUnique({
            where: { username },
            select: { id: true }
        });

        // If the username is taken and it's not the current user's own username
        if (existingUser && existingUser.id !== userId) {
            return res.status(409).json({ error: "Username is already taken" });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { username },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                avatarUrl: true
            }
        });

        res.json({
            message: "Username updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Error updating username:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// @route   GET /api/user/me
// @desc    Get the authenticated user's profile details
// @access  Private
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                avatarUrl: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({
            message: "User profile fetched successfully",
            user
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};
