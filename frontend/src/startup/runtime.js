import { createStartup } from './controller.js';

// One cold-start session; navigation and native Back share this exact instance.
export const startup = createStartup({ document });
