require('dotenv').config();

const requiredEnvVars = [
    'MONGO_URI',
    'JWT_SECRET',
    'REDIS_URL',
    'CLIENT_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`[Config Error] Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const config = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    redisUrl: process.env.REDIS_URL,
    clientUrl: process.env.CLIENT_URL.split(','),
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:5001'
};

module.exports = config;
