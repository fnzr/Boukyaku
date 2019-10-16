import winston from 'winston';

const loggerDEV = winston.createLogger({
    //    level: 'debug',
    level: 'verbose',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'boukyaku.log' })
    ]
});

const loggerPROD = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [
        new winston.transports.File({ filename: 'boukyaku.log' })
    ]
});

export default process.env.NODE_ENV === "production" ? loggerPROD : loggerDEV;