import { templateDefinitions as originalTemplates } from './tactics/legacy.js';
import { threeOnThree } from './tactics/three-on-three.js';
import { fourOnFour } from './tactics/four-on-four.js';
import { threeOnThreeDefense } from './tactics/defense-three-on-three.js';
import { fourOnFourDefense } from './tactics/defense-four-on-four.js';
import { offenseExpansion } from './tactics/offense-expansion.js';

const originalCategories = ['挡拆配合', '传切配合', '无球掩护', '传切配合'];

// Keep all twenty existing entries stable; append the approved six-offense pack.
export const templateDefinitions = [
  ...originalTemplates.map((template, index) => ({ ...template, category: originalCategories[index], difficulty: '基础' })),
  ...threeOnThree,
  ...fourOnFour,
  ...threeOnThreeDefense,
  ...fourOnFourDefense,
  ...offenseExpansion
];
