import app from "./app.js";

import { setupRepeatableJobs } from "./modules/platforms/sync/scheduler.js";

const PORT = process.env.PORT || 6001;

app.listen(PORT, async () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    try {
        await setupRepeatableJobs();
        console.log("Repeatable sync jobs scheduled.");
    } catch (err) {
        console.error("Failed to schedule repeatable jobs:", err);
    }
});
