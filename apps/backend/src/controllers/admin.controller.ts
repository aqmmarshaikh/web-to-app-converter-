import { Response } from 'express';
import { db } from '../config/firebase-admin';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics.
 */
export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [
      usersSnapshot,
      projectsSnapshot,
      buildsSnapshot,
      completedBuildsSnapshot,
      failedBuildsSnapshot,
      todayBuildsSnapshot,
      recentBuildsSnapshot
    ] = await Promise.all([
      db.collection('users').count().get(),
      db.collection('projects').count().get(),
      db.collection('builds').count().get(),
      db.collection('builds').where('status', '==', 'COMPLETED').count().get(),
      db.collection('builds').where('status', '==', 'FAILED').count().get(),
      db.collection('builds').where('createdAt', '>=', todayStart).count().get(),
      db.collection('builds').orderBy('createdAt', 'desc').limit(10).get()
    ]);

    const recentBuilds = recentBuildsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: {
        totalUsers: usersSnapshot.data().count,
        totalProjects: projectsSnapshot.data().count,
        totalBuilds: buildsSnapshot.data().count,
        successfulBuilds: completedBuildsSnapshot.data().count,
        failedBuilds: failedBuildsSnapshot.data().count,
        buildsToday: todayBuildsSnapshot.data().count,
        activeUsers: 0,
        queueLength: 0,
        recentBuilds,
      },
    });
  } catch (error: any) {
    console.log("Request Body:", req.body);
    console.log("Request User ID:", req.userId);
    console.log("Request Headers:", req.headers);
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * GET /api/admin/users
 * List all users (paginated).
 */
export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const usersRef = db.collection('users').orderBy('createdAt', 'desc').limit(limit);
    const usersSnapshot = await usersRef.get();
    
    const users = usersSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: users,
      pagination: {
        page: 1,
        limit,
        total: users.length,
        totalPages: 1,
      },
    });
  } catch (error: any) {
    console.log("Request Body:", req.body);
    console.log("Request User ID:", req.userId);
    console.log("Request Headers:", req.headers);
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};

/**
 * GET /api/admin/builds
 * List all builds (paginated, filterable).
 */
export const listAllBuilds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const status = req.query.status as string;

    let query = db.collection('builds').orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    query = query.limit(limit);

    const buildsSnapshot = await query.get();
    
    const builds = buildsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: builds,
      pagination: {
        page: 1,
        limit,
        total: builds.length,
        totalPages: 1,
      },
    });
  } catch (error: any) {
    console.log("Request Body:", req.body);
    console.log("Request User ID:", req.userId);
    console.log("Request Headers:", req.headers);
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
};
