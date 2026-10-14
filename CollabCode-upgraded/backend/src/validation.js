const { z } = require('zod');

const registerSchema = z.object({
  username: z.string().trim().min(2).max(30).regex(/^[\p{L}\p{N}_ -]+$/u),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(1).max(72)
});

module.exports = { registerSchema, loginSchema };
