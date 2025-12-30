import { writeFileSync, existsSync, rmdirSync, mkdirSync } from 'fs';
import * as path from 'path';
import { Projects } from 'projen';
import yaml from 'yaml';
import { ToolProvider } from '../interfaces/index.js';
import {
  BackstageEntity,
  CatalogSpec,
  ProjectSpec,
  ProjectTypeEnum,
} from './schema.js';
import { ToolResponse } from './response.js';

interface ScaffoldOutput {
  projectPath: string;
  message: string;
}

interface GenerateCatalogOutput {
  catalogPath: string;
}

const SCAFFOLDER_BASE_PATH = '/tmp/scaffolder';
const CATALOG_FILE_NAME = 'catalog-info.yaml';
const DEFAULT_RELEASE_BRANCH = 'main';
const DEFAULT_DESCRIPTION = 'TBD';
const DEFAULT_LIFECYCLE = 'production';
const DEFAULT_SYSTEM = '';

const TYPESCRIPT_PROJECT_TYPES: ProjectTypeEnum[] = [
  ProjectTypeEnum.TypeScriptApp,
  ProjectTypeEnum.CdkTFLib,
  ProjectTypeEnum.TypeScriptLib,
];

const createBackstageEntity = ({
  name,
  owner,
  repoUrl,
  type,
  description,
  lifecycle,
  system,
}: CatalogSpec): BackstageEntity => ({
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name,
    description,
    annotations: {
      'backstage.io/source-location': `url:${repoUrl}`,
      'github.com/project-slug': name,
    },
  },
  spec: {
    type,
    lifecycle,
    owner,
    repoUrl,
    system,
  },
});

export abstract class ProjenTool<T> extends ToolProvider<T> {
  constructor() {
    super();
  }

  private getProjectPath(name: string): string {
    return path.join(SCAFFOLDER_BASE_PATH, name);
  }

  private isTypeScriptProject(type: ProjectTypeEnum): boolean {
    return TYPESCRIPT_PROJECT_TYPES.includes(type);
  }

  private ensureProjectDirectory(projectPath: string): void {
    try {
      if (existsSync(projectPath)) {
        rmdirSync(projectPath, { recursive: true });
      }
      mkdirSync(projectPath, { recursive: true });
      this.logger.log(`Creating new project directory: ${projectPath}`);
    } catch (error) {
      this.handleError(
        error,
        `Failed to ensure project directory: ${projectPath}`,
        'ensureProjectDirectory',
      );
    }
  }

  async scaffoldCode(spec: ProjectSpec): Promise<ToolResponse<ScaffoldOutput>> {
    const projectPath = this.getProjectPath(spec.name);
    const isTypeScript = this.isTypeScriptProject(spec.type);

    try {
      this.ensureProjectDirectory(projectPath);

      Projects.createProject({
        dir: projectPath,
        projectFqn: spec.type,
        projectOptions: {
          name: spec.name,
          defaultReleaseBranch: DEFAULT_RELEASE_BRANCH,
          repoUrl: spec.repoUrl,
          authorName: spec.authorName,
          authorEmail: spec.authorEmail,
          projenrcTs: isTypeScript,
          packageManager: isTypeScript ? 'pnpm' : undefined,
          githubOptions: {
            mergify: false,
          },
        },
        post: false,
      });
    } catch (error) {
      this.handleError(
        error,
        `Failed to scaffold project: ${spec.name} (type: ${spec.type})`,
        'scaffoldCode',
      );
    }

    return {
      body: {
        projectPath,
        message: `Project ${spec.name} scaffolded successfully at ${projectPath}.`,
      },
      status: 'success',
    };
  }

  async generateCatalog(
    spec: CatalogSpec,
  ): Promise<ToolResponse<GenerateCatalogOutput>> {
    const projectPath = this.getProjectPath(spec.name);
    const catalogPath = path.join(projectPath, CATALOG_FILE_NAME);

    if (!existsSync(projectPath)) {
      this.logger.error(
        `Scaffolder base directory does not exist: ${projectPath}`,
      );

      this.handleError(
        new Error(
          'Base directory missing. You need to scaffold the project first.',
        ),
        `Scaffolder base directory does not exist: ${projectPath}`,
        'generateCatalog',
      );
    }

    const entity = createBackstageEntity({
      name: spec.name,
      owner: spec.owner,
      repoUrl: spec.repoUrl,
      type: spec.type,
      description: spec.description ?? DEFAULT_DESCRIPTION,
      lifecycle: spec.lifecycle ?? DEFAULT_LIFECYCLE,
      system: spec.system ?? DEFAULT_SYSTEM,
    });

    try {
      const entityYaml = yaml.stringify(entity, { indent: 2 });
      writeFileSync(catalogPath, entityYaml);
    } catch (error) {
      this.handleError(
        error,
        `Failed to generate catalog-info.yaml for project: ${spec.name} at path: ${projectPath}`,
        'generateCatalog',
      );
    }

    return {
      body: { catalogPath },
      status: 'success',
    };
  }
}
