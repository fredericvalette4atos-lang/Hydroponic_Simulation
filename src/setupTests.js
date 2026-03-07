import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Optional: Globaler Mock für die Fetch-API, falls du nicht 
// in jedem Test einzeln mocken willst.
global.fetch = vi.fn();
