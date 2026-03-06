/**
 * Utility functions for generating random noise in sensor readings
 */

/**
 * Generate Gaussian (normal) distributed random noise using Box-Muller transform
 * @param mean - Mean of the distribution (default: 0)
 * @param stddev - Standard deviation of the distribution (default: 1)
 * @returns A random number from the Gaussian distribution
 */
export function generateGaussianNoise(mean: number = 0, stddev: number = 1): number {
  // Box-Muller transform to generate Gaussian noise from uniform random
  const u1 = Math.random();
  const u2 = Math.random();
  
  // Avoid log(0)
  const u1Safe = u1 === 0 ? Number.EPSILON : u1;
  
  const z0 = Math.sqrt(-2.0 * Math.log(u1Safe)) * Math.cos(2.0 * Math.PI * u2);
  
  return mean + z0 * stddev;
}

/**
 * Clamp a value between min and max bounds
 * @param value - Value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
