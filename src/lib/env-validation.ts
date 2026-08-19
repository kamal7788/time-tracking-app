// Environment variable validation and secure defaults

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test'
  DATABASE_URL: string
  JWT_SECRET: string
  JWT_EXPIRES_IN: string
  NEXT_PUBLIC_APP_URL: string
  SMTP_HOST: string
  SMTP_PORT: string
  SMTP_USER: string
  SMTP_PASS: string
  SMTP_FROM_EMAIL: string
  SMTP_FROM_NAME: string
  DISABLE_PUBLIC_REGISTRATION: string
  ADMIN_EMAIL: string
  ADMIN_PASSWORD: string
  ADMIN_NAME: string
}

// Required variables in production
const REQUIRED_IN_PRODUCTION = ['DATABASE_URL', 'JWT_SECRET']

// Optional but recommended
const RECOMMENDED = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM_EMAIL']

function validateRequired(varName: string, value: string | undefined, required: boolean = false): string | null {
  if (!value) {
    if (required) return `Required environment variable ${varName} is missing`
    return null
  }
  
  // Additional validation for specific variables
  if (varName === 'JWT_SECRET' && value.length < 32) {
    return `JWT_SECRET must be at least 32 characters (current: ${value.length})`
  }
  
  if (varName === 'SMTP_PORT') {
    const port = parseInt(value)
    if (isNaN(port) || port < 1 || port > 65535) {
      return `SMTP_PORT must be a valid port number (1-65535, current: ${value})`
    }
  }
  
  if (varName === 'DATABASE_URL' && !value.startsWith('postgresql://')) {
    return `DATABASE_URL must use postgresql:// protocol`
  }
  
  return null
}

function validateEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Check all environment variables exist
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('NEXT_PUBLIC_') || key.startsWith('SMTP_') || 
        key === 'DATABASE_URL' || key === 'JWT_SECRET' || 
        key === 'JWT_EXPIRES_IN' || key === 'NODE_ENV' ||
        key === 'DISABLE_PUBLIC_REGISTRATION' ||
        key === 'ADMIN_EMAIL' || key === 'ADMIN_PASSWORD' || key === 'ADMIN_NAME') {
      const error = validateRequired(key, process.env[key] as string, isProduction && REQUIRED_IN_PRODUCTION.includes(key))
      if (error) errors.push(error)
    }
  }
  
  // Check missing required variables
  if (isProduction) {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!process.env[key]) {
        errors.push(`Missing required environment variable in production: ${key}`)
      }
    }
  }
  
  // Validate URL format for app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_APP_URL)
    } catch {
      errors.push('NEXT_PUBLIC_APP_URL must be a valid URL')
    }
  }
  
  return { isValid: errors.length === 0, errors }
}

function getSecureDefaults() {
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/time_tracking?schema=public',
    JWT_SECRET: process.env.JWT_SECRET || 'change-me-to-a-secure-random-secret-at-least-32-chars',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    SMTP_HOST: process.env.SMTP_HOST || '',
    SMTP_PORT: process.env.SMTP_PORT || '587',
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASS: process.env.SMTP_PASS || '',
    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || '',
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Time Tracking App',
    DISABLE_PUBLIC_REGISTRATION: process.env.DISABLE_PUBLIC_REGISTRATION || 'false',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'change-me-admin-password',
    ADMIN_NAME: process.env.ADMIN_NAME || 'Administrator',
  }
}

export { validateEnvironment, getSecureDefaults }