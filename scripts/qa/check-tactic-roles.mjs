import { templates } from '../../shared/templates.js';
import { validateTacticCatalog } from '../../shared/tactic-roles.js';

validateTacticCatalog(templates);
console.log(`战术角色完整性：${templates.length}套 / ${templates.reduce((sum, template) => sum + template.roles.length, 0)}位职责，通过`);
