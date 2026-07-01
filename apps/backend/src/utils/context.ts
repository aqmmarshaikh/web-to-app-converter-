import { AsyncLocalStorage } from 'async_hooks';

export interface RequestStore {
  requestId: string;
  userId?: string;
}

export const requestStorage = new AsyncLocalStorage<RequestStore>();

/**
 * Helper to retrieve the current request's ID from async storage.
 */
export const getRequestId = (): string | undefined => {
  return requestStorage.getStore()?.requestId;
};
