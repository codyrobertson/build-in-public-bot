/**
 * Service Registry Pattern
 * 
 * Provides a centralized registry for service instances, enabling
 * loose coupling and better testability.
 */

import { logger } from '../utils/logger';

export class ServiceRegistry {
  private static services = new Map<string, any>();
  private static factories = new Map<string, () => any>();
  private static singletons = new Set<string>();

  /**
   * Register a service instance
   */
  static register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
    logger.debug(`Service registered: ${name}`);
  }

  /**
   * Register a service factory function
   */
  static registerFactory<T>(name: string, factory: () => T, singleton: boolean = true): void {
    this.factories.set(name, factory);
    if (singleton) {
      this.singletons.add(name);
    }
    logger.debug(`Service factory registered: ${name} (singleton: ${singleton})`);
  }

  /**
   * Get a service instance
   */
  static get<T>(name: string): T {
    // Check if instance already exists
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Check if factory exists
    if (this.factories.has(name)) {
      const factory = this.factories.get(name)!;
      const instance = factory();
      
      // Cache if singleton
      if (this.singletons.has(name)) {
        this.services.set(name, instance);
      }
      
      return instance as T;
    }

    throw new Error(`Service not found: ${name}`);
  }

  /**
   * Check if service is registered
   */
  static has(name: string): boolean {
    return this.services.has(name) || this.factories.has(name);
  }

  /**
   * Unregister a service
   */
  static unregister(name: string): void {
    this.services.delete(name);
    this.factories.delete(name);
    this.singletons.delete(name);
    logger.debug(`Service unregistered: ${name}`);
  }

  /**
   * Clear all services (useful for testing)
   */
  static clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
    logger.debug('Service registry cleared');
  }

  /**
   * Get all registered service names
   */
  static getRegisteredServices(): string[] {
    const instanceNames = Array.from(this.services.keys());
    const factoryNames = Array.from(this.factories.keys());
    return [...new Set([...instanceNames, ...factoryNames])];
  }

  /**
   * Get service statistics
   */
  static getStats(): {
    totalServices: number;
    activeInstances: number;
    factories: number;
    singletons: number;
  } {
    return {
      totalServices: this.getRegisteredServices().length,
      activeInstances: this.services.size,
      factories: this.factories.size,
      singletons: this.singletons.size,
    };
  }
}

// Service registration helper with type safety
export function registerService<T>(name: string, serviceClass: new () => T, singleton: boolean = true): void {
  ServiceRegistry.registerFactory(name, () => new serviceClass(), singleton);
}

// Decorator for automatic service registration
export function Service(name: string, singleton: boolean = true) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    ServiceRegistry.registerFactory(name, () => new constructor(), singleton);
    return constructor;
  };
}