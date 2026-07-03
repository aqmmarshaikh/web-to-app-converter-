const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface FetchOptions extends RequestInit {
  token?: string;
}

/**
 * API client for communicating with the AppForge backend.
 * Handles authentication tokens, error responses, and JSON parsing.
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    // Wait for auth to initialize if needed
    await auth.authStateReady();
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken(true);
      } catch (err) {
        console.error("Token refresh via getIdToken(true) failed:", err);
        try {
          return await auth.currentUser.getIdToken();
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  async fetch<T = any>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;
    const accessToken = token || await this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const isPolling = endpoint.includes('/builds') || endpoint.includes('/projects/');

    if (isPolling) {
      console.log("Polling request");
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (isPolling) {
      console.log("Status:", response.status);
      console.log("Token:", accessToken);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || 'Request failed',
        response.status,
        data.details
      );
    }

    return data;
  }

  async register(email: string, password: string, name: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });
      
      // Save user to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: name,
        role: 'USER',
        createdAt: new Date().toISOString(),
      });

      return { success: true, data: { user } };
    } catch (error: any) {
      console.log("Firebase Register Error Code:", error.code);
      console.log("Firebase Register Error Message:", error.message);

      let customMessage = error.message;
      switch (error.code) {
        case "auth/email-already-in-use":
          customMessage = "The email address is already in use by another account.";
          break;
        case "auth/invalid-email":
          customMessage = "The email address is badly formatted.";
          break;
        case "auth/weak-password":
          customMessage = "The password must be 6 characters long or more.";
          break;
        case "auth/network-request-failed":
          customMessage = "A network error occurred. Please check your connection.";
          break;
        case "auth/operation-not-allowed":
        case "auth/configuration-not-found":
          customMessage = "Email/Password sign-in provider is disabled or configuration was not found. Please enable it in Firebase Console -> Authentication -> Sign-in method -> Email/Password.";
          break;
        default:
          customMessage = error.message;
      }
      throw new ApiError(`[${error.code}] ${customMessage}`, 400);
    }
  }

  async login(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, data: { user: userCredential.user } };
    } catch (error: any) {
      console.log("Firebase Login Error Code:", error.code);
      console.log("Firebase Login Error Message:", error.message);

      let customMessage = error.message;
      switch (error.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          customMessage = "Invalid email or password.";
          break;
        case "auth/user-disabled":
          customMessage = "This user account has been disabled.";
          break;
        case "auth/network-request-failed":
          customMessage = "A network error occurred. Please check your connection.";
          break;
        case "auth/operation-not-allowed":
        case "auth/configuration-not-found":
          customMessage = "Email/Password sign-in provider is disabled or configuration was not found. Please enable it in Firebase Console -> Authentication -> Sign-in method -> Email/Password.";
          break;
        default:
          customMessage = error.message;
      }
      throw new ApiError(`[${error.code}] ${customMessage}`, 400);
    }
  }

  async logout() {
    await signOut(auth);
  }

  async getMe() {
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error('Not authenticated');
    
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userDoc.data();
    
    return {
      success: true,
      data: {
        id: auth.currentUser.uid,
        email: auth.currentUser.email,
        name: auth.currentUser.displayName,
        role: userData?.role || 'USER',
      }
    };
  }

  async forgotPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: 'Password reset email sent' };
  }

  async resetPassword(token: string, password: string) {
    // Usually handled directly by Firebase redirect URL
    throw new Error('Please use the link in your email to reset password');
  }

  // Projects
  async getProjects(page = 1, limit = 12, search = '') {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
    });
    return this.fetch(`/api/projects?${params}`);
  }

  async getProject(id: string) {
    return this.fetch(`/api/projects/${id}`);
  }

  async createProject(data: any) {
    return this.fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: any) {
    return this.fetch(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string) {
    return this.fetch(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async duplicateProject(id: string) {
    return this.fetch(`/api/projects/${id}/duplicate`, {
      method: 'POST',
    });
  }

  // Builds
  async createBuild(projectId: string, buildType: string) {
    return this.fetch('/api/builds', {
      method: 'POST',
      body: JSON.stringify({ projectId, buildType }),
    });
  }

  async getBuild(id: string) {
    return this.fetch(`/api/builds/${id}`);
  }

  async getBuilds(page = 1, limit = 20, status = '') {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(status && { status }),
    });
    return this.fetch(`/api/builds?${params}`);
  }

  async downloadBuild(id: string) {
    return this.fetch(`/api/builds/${id}/download`);
  }

  async uploadIcon(file: File) {
    const token = await this.getToken();
    const formData = new FormData();
    formData.append('icon', file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // NOTE: Do NOT set Content-Type — the browser auto-sets it with the correct multipart boundary

    const response = await fetch(`${this.baseUrl}/api/icons/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data.error || 'Icon upload failed', response.status, data.details);
    }
    return data;
  }

  // Dashboard
  async getDashboardStats() {
    return this.fetch('/api/builds/dashboard/stats');
  }

  // Admin
  async getAdminStats() {
    return this.fetch('/api/admin/stats');
  }

  async getAdminUsers(page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
    });
    return this.fetch(`/api/admin/users?${params}`);
  }

  async getAdminBuilds(page = 1, limit = 20, status = '') {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(status && { status }),
    });
    return this.fetch(`/api/admin/builds?${params}`);
  }
}

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export const api = new ApiClient(API_URL);
