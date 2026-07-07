import app from "./app.js";

const PORT = process.env.PORT || 6001;

app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
