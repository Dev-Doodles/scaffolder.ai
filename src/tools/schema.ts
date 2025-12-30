import { z } from 'zod';

export enum ProjectTypeEnum {
  TypeScriptApp = 'projen.typescript.TypeScriptAppProject',
  TypeScriptLib = 'projen.typescript.TypeScriptProject',
  JavaApp = 'projen.java.MavenProject',
  CdkTFLib = 'projen.cdktf.Construct',
}

export const ProjectTypeSchema = z.enum([
  ProjectTypeEnum.TypeScriptApp,
  ProjectTypeEnum.TypeScriptLib,
  ProjectTypeEnum.JavaApp,
  ProjectTypeEnum.CdkTFLib,
]);

export type ProjectType = z.infer<typeof ProjectTypeSchema>;

export const ProjectSpecSchema = z.object({
  name: z.string().min(10),
  type: ProjectTypeSchema,
  owner: z.string().min(3),
  repoUrl: z.string(),
  authorName: z.string().min(3),
  authorEmail: z.string().email(),
});

const LifecycleSchema = z.enum(['experimental', 'production', 'deprecated']);
const ComponentTypeSchema = z.enum(['service', 'website', 'library', 'tool']);

export const CatalogSpecSchema = z.object({
  name: z.string().min(3),
  owner: z.string().min(3),
  repoUrl: z.string(),
  description: z.string().optional().nullable(),
  type: ComponentTypeSchema.default('service'),
  lifecycle: LifecycleSchema.default('experimental'),
  system: z.string().default('platform'),
});

export type Lifecycle = z.infer<typeof LifecycleSchema>;
export type ComponentType = z.infer<typeof ComponentTypeSchema>;
export type CatalogSpec = z.infer<typeof CatalogSpecSchema>;

export type BackstageEntity = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    description?: string;
    annotations?: { [key: string]: string };
  };
  spec: {
    type: ComponentType;
    owner: string;
    lifecycle?: Lifecycle;
    repoUrl: string;
    system?: string;
  };
};

export const RepositorySchema = z.object({
  name: z.string().min(6),
  description: z.string().max(256),
  visibility: z.boolean().default(true),
  hasIssues: z.boolean().default(true),
  hasWiki: z.boolean().default(false),
  hasProjects: z.boolean().default(false),
  organisation: z.string().min(3).optional().nullable(),
});

export const DeleteRepositorySchema = z.object({
  name: z.string().min(1).describe('The name of the repository to delete'),
  owner: z
    .string()
    .min(1)
    .describe('The owner of the repository (user or organisation)')
    .optional()
    .nullable(),
});

export type DeleteRepositorySpec = z.infer<typeof DeleteRepositorySchema>;

export const LocalRepoSpecSchema = z.object({
  repositoryUrl: z.string(),
  localPath: z.string(),
  remoteName: z.string().default('origin'),
  message: z.string().default('chore(init): initial commit'),
});

export type LocalRepoSpec = z.infer<typeof LocalRepoSpecSchema>;
export type ProjectSpec = z.infer<typeof ProjectSpecSchema>;
export type RepositorySpec = z.infer<typeof RepositorySchema>;
