import { tool, Tool } from '@openai/agents';
import { ProjenTool } from '../projen.js';
import { Injectable } from '@nestjs/common';
import {
  CatalogSpec,
  CatalogSpecSchema,
  ProjectSpec,
  ProjectSpecSchema,
} from '../schema.js';

@Injectable()
export class OpenAIProjenTool extends ProjenTool<Tool> {
  constructor() {
    super();
  }

  getTools(): Tool[] {
    return [
      tool({
        name: 'scaffold_project',
        description: 'A tool to scaffold new projects using Projen.',
        parameters: ProjectSpecSchema,
        strict: true,
        execute: (input: ProjectSpec) => this.scaffoldCode(input),
      }),
      tool({
        name: 'generate_catalog',
        description:
          'A tool to generate Backstage catalog-info.yaml for the project.',
        parameters: CatalogSpecSchema,
        isEnabled: true,
        strict: true,
        execute: (input: CatalogSpec) => this.generateCatalog(input),
      }),
    ];
  }
}
