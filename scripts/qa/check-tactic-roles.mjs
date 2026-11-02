import { templates } from '../../shared/templates.js';
import { validateTacticCatalog } from '../../shared/tactic-roles.js';
import { getBodyTypes, filterTacticsByBodyType } from '../../shared/tactic-body-types.js';

validateTacticCatalog(templates);
for (const mode of ['3v3', '4v4']) for (const kind of ['offense', 'defense']) for (const type of getBodyTypes(mode)) {
  if (!filterTacticsByBodyType(templates, { mode, kind, bodyType: type.id }).length) throw new Error(`${mode}/${kind}/${type.id}：体型分类没有可浏览战术`);
}
console.log(`战术完整性：${templates.length}套 / ${templates.reduce((sum, template) => sum + template.roles.length, 0)}位职责 / 全部体型分类，通过`);
