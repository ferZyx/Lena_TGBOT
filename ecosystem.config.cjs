module.exports = {
    apps: [
        {
            name: "tolyan-lena-bot",
            script: "npm",
            args: "run start",
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            autorestart: true,
        }
    ]
}
