﻿import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().uri().required(),
  DIRECT_URL: Joi.string().uri().required(),

  REDIS_URL: Joi.string().uri().required(),

  JWT_SECRET: Joi.string().min(64).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),

  RUSH_MODE_THRESHOLD: Joi.number().default(15),           // nb commandes actives déclenchant le rush
RUSH_MODE_PROXIMITY_MINUTES: Joi.number().default(15),   // créneau "proche" = dans les 15 min
RUSH_MODE_DELAY_NORMAL_MINUTES: Joi.number().default(10),
RUSH_MODE_DELAY_RUSH_MINUTES: Joi.number().default(25),
  GOOGLE_CLIENT_ID: Joi.string().required(),
  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().required(),

  WALLET_API_URL: Joi.string().uri().required(),
  WALLET_API_KEY: Joi.string().allow('a-completer').required(),
  WALLET_SECRET_KEY: Joi.string().allow('a-completer').required(),

  SUPABASE_URL: Joi.string().uri().required(),
 SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),

  CORS_ORIGINS: Joi.string().default('http://localhost:3000'),
}).unknown(true);
