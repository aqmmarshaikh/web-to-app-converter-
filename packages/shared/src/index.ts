import { z } from 'zod';

export function normalizePackageName(name: string): string {
  // Convert to lowercase and replace spaces/hyphens
  let clean = name.toLowerCase().trim().replace(/[-\s]+/g, '_');
  // Remove any character that is not a lowercase letter, digit, underscore, or dot
  clean = clean.replace(/[^a-z0-9_.]/g, '');
  
  const parts = clean.split('.').filter(Boolean);
  
  if (parts.length === 0) {
    return 'com.example.app';
  }
  
  if (parts.length === 1) {
    return `com.example.${parts[0]}`;
  }
  
  if (parts.length === 2) {
    const tlds = ['com', 'org', 'net', 'io', 'co', 'app', 'live', 'dev', 'xyz', 'info'];
    if (tlds.includes(parts[0]) && !tlds.includes(parts[1])) {
      return `com.${parts[1]}.${parts[0]}`;
    }
    if (tlds.includes(parts[1]) && !tlds.includes(parts[0])) {
      return `com.${parts[0]}.${parts[1]}`;
    }
    return `com.${parts[0]}.${parts[1]}`;
  }
  
  return parts.join('.');
}

// ============================================================
// Enums
// ============================================================

export const BuildStatus = {
  QUEUED: 'QUEUED',
  PREPARING: 'PREPARING',
  BUILDING: 'BUILDING',
  SIGNING: 'SIGNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type BuildStatus = (typeof BuildStatus)[keyof typeof BuildStatus];

export const BuildType = {
  APK: 'APK',
  AAB: 'AAB',
  SIGNED_APK: 'SIGNED_APK',
} as const;

export type BuildType = (typeof BuildType)[keyof typeof BuildType];

export const AppType = {
  WEBVIEW: 'WEBVIEW',
  TWA: 'TWA',
  NATIVE_WRAPPER: 'NATIVE_WRAPPER',
} as const;

export type AppType = (typeof AppType)[keyof typeof AppType];

export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const Permission = {
  CAMERA: 'CAMERA',
  LOCATION: 'LOCATION',
  MICROPHONE: 'MICROPHONE',
  NOTIFICATIONS: 'NOTIFICATIONS',
  STORAGE: 'STORAGE',
  CONTACTS: 'CONTACTS',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

// ============================================================
// Validation Schemas
// ============================================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const projectConfigSchema = z.object({
  // Basic
  appName: z.string().min(1, 'App name is required').max(50),
  packageName: z.preprocess(
    (val) => (typeof val === 'string' ? normalizePackageName(val) : val),
    z.string().regex(
      /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/,
      'Invalid package name (e.g., com.example.myapp)'
    )
  ),
  versionName: z.string().default('1.0.0'),
  versionCode: z.number().int().positive().default(1),
  description: z.string().max(500).optional(),

  // Branding
  themeColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#000000'),
  darkMode: z.boolean().default(false),

  // Navigation
  bottomNavigation: z.boolean().default(false),
  navigationDrawer: z.boolean().default(false),
  floatingActionButton: z.boolean().default(false),
  pullToRefresh: z.boolean().default(true),

  // Permissions
  permissions: z.array(z.nativeEnum(Permission)).default([]),

  // Android Features
  offlineMode: z.boolean().default(false),
  splashScreen: z.boolean().default(true),
  customLoadingScreen: z.boolean().default(false),
  pushNotifications: z.boolean().default(false),
  backButtonHandling: z.boolean().default(true),
  downloadSupport: z.boolean().default(true),
  fileUploadSupport: z.boolean().default(true),
  deepLinks: z.boolean().default(false),
  orientationLock: z.enum(['PORTRAIT', 'LANDSCAPE', 'UNSPECIFIED']).default('UNSPECIFIED'),
});

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  websiteUrl: z.string().url('Invalid URL'),
  appType: z.nativeEnum(AppType).default('WEBVIEW'),
  config: projectConfigSchema,
});

export const updateProjectSchema = createProjectSchema.partial();

export const createBuildSchema = z.object({
  projectId: z.string().min(1),
  buildType: z.nativeEnum(BuildType).default('APK'),
});

// ============================================================
// API Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  websiteUrl: string;
  appType: AppType;
  config: z.infer<typeof projectConfigSchema>;
  iconUrl?: string;
  splashUrl?: string;
  createdAt: string;
  updatedAt: string;
  builds?: BuildResponse[];
  _count?: {
    builds: number;
  };
}

export interface BuildResponse {
  id: string;
  projectId: string;
  status: BuildStatus;
  buildType: BuildType;
  downloadUrl?: string;
  logOutput?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  project?: {
    name: string;
    websiteUrl: string;
  };
}

export interface BuildLogEntry {
  id: string;
  buildId: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  timestamp: string;
}

export interface DashboardStats {
  totalProjects: number;
  totalBuilds: number;
  successfulBuilds: number;
  failedBuilds: number;
  recentBuilds: BuildResponse[];
}

export interface AdminStats extends DashboardStats {
  totalUsers: number;
  activeUsers: number;
  buildsToday: number;
  queueLength: number;
}

// ============================================================
// WebSocket Events
// ============================================================

export interface BuildStatusUpdate {
  buildId: string;
  status: BuildStatus;
  message?: string;
  progress?: number;
  log?: string;
}

export const WS_EVENTS = {
  BUILD_STATUS: 'build:status',
  BUILD_LOG: 'build:log',
  BUILD_COMPLETE: 'build:complete',
  BUILD_FAILED: 'build:failed',
  JOIN_BUILD: 'build:join',
  LEAVE_BUILD: 'build:leave',
} as const;
