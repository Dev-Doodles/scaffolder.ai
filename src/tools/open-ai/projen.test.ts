import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProjenTool } from './projen.js';
import { ToolError } from '../../errors/index.js';
import { ProjectTypeEnum } from '../schema.js';
import * as fs from 'fs';
import { Projects } from 'projen';
import { FunctionTool } from '@openai/agents';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  rmdirSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('projen', () => ({
  Projects: {
    createProject: vi.fn(),
  },
}));

vi.mock('@openai/agents', () => ({
  tool: vi.fn((config) => ({
    name: config.name,
    description: config.description,
    parameters: config.parameters,
    strict: config.strict,
    isEnabled: config.isEnabled,
    execute: config.execute,
  })),
}));

describe('ProjenTool', () => {
  let projenTool: ProjenTool;

  beforeEach(() => {
    projenTool = new ProjenTool();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scaffoldCode', () => {
    const baseSpec = {
      name: 'my-backend-service',
      owner: 'group:platform-team',
      repoUrl: 'git@github.com:myorg/my-backend-service.git',
      authorName: 'Platform Team',
      authorEmail: 'platform@example.com',
    };

    describe('TypeScript Projects', () => {
      it('should scaffold TypeScriptApp project with correct configuration', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptApp };

        const result = await projenTool.scaffoldCode(spec);

        expect(result.status).toBe('success');
        expect(result.body?.projectPath).toBe(
          '/tmp/scaffolder/my-backend-service',
        );
        expect(result.body?.message).toContain('scaffolded successfully');

        expect(Projects.createProject).toHaveBeenCalledWith({
          dir: '/tmp/scaffolder/my-backend-service',
          projectFqn: 'projen.typescript.TypeScriptAppProject',
          projectOptions: {
            name: 'my-backend-service',
            defaultReleaseBranch: 'main',
            repoUrl: baseSpec.repoUrl,
            authorName: baseSpec.authorName,
            authorEmail: baseSpec.authorEmail,
            projenrcTs: true,
            packageManager: 'pnpm',
            githubOptions: { mergify: false },
          },
          post: false,
        });
      });

      it('should scaffold TypeScriptLib project with correct configuration', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptLib };

        await projenTool.scaffoldCode(spec);

        const call = vi.mocked(Projects.createProject).mock.calls[0][0];
        expect(call.projectFqn).toBe('projen.typescript.TypeScriptProject');
        expect(call.projectOptions.projenrcTs).toBe(true);
        expect(call.projectOptions.packageManager).toBe('pnpm');
      });

      it('should scaffold CdkTFLib project with TypeScript options', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const spec = { ...baseSpec, type: ProjectTypeEnum.CdkTFLib };

        await projenTool.scaffoldCode(spec);

        const call = vi.mocked(Projects.createProject).mock.calls[0][0];
        expect(call.projectFqn).toBe('projen.cdktf.Construct');
        expect(call.projectOptions.projenrcTs).toBe(true);
        expect(call.projectOptions.packageManager).toBe('pnpm');
      });
    });

    describe('Non-TypeScript Projects', () => {
      it('should scaffold JavaApp project without TypeScript options', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const spec = { ...baseSpec, type: ProjectTypeEnum.JavaApp };

        await projenTool.scaffoldCode(spec);

        const call = vi.mocked(Projects.createProject).mock.calls[0][0];
        expect(call.projectFqn).toBe('projen.java.MavenProject');
        expect(call.projectOptions.projenrcTs).toBe(false);
        expect(call.projectOptions.packageManager).toBeUndefined();
      });
    });

    describe('Directory Management', () => {
      it('should create new directory when it does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptApp };

        await projenTool.scaffoldCode(spec);

        expect(fs.rmdirSync).not.toHaveBeenCalled();
        expect(fs.mkdirSync).toHaveBeenCalledWith(
          '/tmp/scaffolder/my-backend-service',
          { recursive: true },
        );
      });

      it('should remove existing directory before creating new one', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptApp };

        await projenTool.scaffoldCode(spec);

        expect(fs.rmdirSync).toHaveBeenCalledWith(
          '/tmp/scaffolder/my-backend-service',
          { recursive: true },
        );
        expect(fs.mkdirSync).toHaveBeenCalledWith(
          '/tmp/scaffolder/my-backend-service',
          { recursive: true },
        );
      });

      it('should generate correct project path from project name', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const spec = {
          ...baseSpec,
          name: 'custom-project-name',
          type: ProjectTypeEnum.TypeScriptApp,
        };

        const result = await projenTool.scaffoldCode(spec);

        expect(result.body?.projectPath).toBe(
          '/tmp/scaffolder/custom-project-name',
        );
        expect(fs.mkdirSync).toHaveBeenCalledWith(
          '/tmp/scaffolder/custom-project-name',
          { recursive: true },
        );
      });
    });

    describe('Response Structure', () => {
      it('should return success status on successful scaffold', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptApp };

        const result = await projenTool.scaffoldCode(spec);

        expect(result.status).toBe('success');
      });

      it('should return projectPath in response body', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptApp };

        const result = await projenTool.scaffoldCode(spec);

        expect(result.body?.projectPath).toBe(
          `/tmp/scaffolder/${baseSpec.name}`,
        );
      });

      it('should return descriptive message in response body', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptApp };

        const result = await projenTool.scaffoldCode(spec);

        expect(result.body?.message).toBe(
          `Project ${baseSpec.name} scaffolded successfully at /tmp/scaffolder/${baseSpec.name}.`,
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw ToolError when Projen createProject fails', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(Projects.createProject).mockImplementationOnce(() => {
          throw new Error('Projen initialization failed');
        });
        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptApp };

        await expect(projenTool.scaffoldCode(spec)).rejects.toThrow(ToolError);
      });

      it('should throw ToolError when mkdirSync fails', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.mkdirSync).mockImplementationOnce(() => {
          throw new Error('Permission denied');
        });

        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptApp };

        await expect(projenTool.scaffoldCode(spec)).rejects.toThrow(ToolError);
      });

      it('should throw ToolError when rmdirSync fails on existing directory', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.rmdirSync).mockImplementationOnce(() => {
          throw new Error('Directory in use');
        });

        const spec = { ...baseSpec, type: ProjectTypeEnum.TypeScriptApp };

        await expect(projenTool.scaffoldCode(spec)).rejects.toThrow(ToolError);
      });
    });
  });

  describe('generateCatalog', () => {
    const baseSpec = {
      name: 'my-service',
      owner: 'group:platform-team',
      repoUrl: 'https://github.com/myorg/my-service',
      type: 'service' as const,
    };

    describe('Success Cases', () => {
      beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
      });

      it('should generate catalog-info.yaml with all fields provided', async () => {
        const spec = {
          ...baseSpec,
          description: 'My backend service',
          lifecycle: 'production' as const,
          system: 'platform',
        };

        const result = await projenTool.generateCatalog(spec);

        expect(result.status).toBe('success');
        expect(result.body?.catalogPath).toBe(
          '/tmp/scaffolder/my-service/catalog-info.yaml',
        );
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          '/tmp/scaffolder/my-service/catalog-info.yaml',
          expect.any(String),
        );
      });

      it('should use default description when not provided', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('description: TBD');
      });

      it('should use default lifecycle when not provided', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('lifecycle: production');
      });

      it('should use empty string for system when not provided', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('system:');
      });

      it('should handle null description', async () => {
        const spec = { ...baseSpec, description: null };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('description: TBD');
      });

      it('should handle null lifecycle', async () => {
        const spec = { ...baseSpec, lifecycle: null as any };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('lifecycle: production');
      });

      it('should handle null system', async () => {
        const spec = { ...baseSpec, system: null as any };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('system:');
      });
    });

    describe('Component Types', () => {
      beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
      });

      it('should generate catalog for service component', async () => {
        const spec = { ...baseSpec, type: 'service' as const };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('type: service');
      });

      it('should generate catalog for website component', async () => {
        const spec = { ...baseSpec, type: 'website' as const };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('type: website');
      });

      it('should generate catalog for library component', async () => {
        const spec = { ...baseSpec, type: 'library' as const };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('type: library');
      });

      it('should generate catalog for tool component', async () => {
        const spec = { ...baseSpec, type: 'tool' as const };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('type: tool');
      });
    });

    describe('Lifecycle Values', () => {
      beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
      });

      it('should generate catalog with experimental lifecycle', async () => {
        const spec = { ...baseSpec, lifecycle: 'experimental' as const };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('lifecycle: experimental');
      });

      it('should generate catalog with production lifecycle', async () => {
        const spec = { ...baseSpec, lifecycle: 'production' as const };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('lifecycle: production');
      });

      it('should generate catalog with deprecated lifecycle', async () => {
        const spec = { ...baseSpec, lifecycle: 'deprecated' as const };

        await projenTool.generateCatalog(spec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('lifecycle: deprecated');
      });
    });

    describe('Backstage Entity Structure', () => {
      beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
      });

      it('should include correct apiVersion', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('apiVersion: backstage.io/v1alpha1');
      });

      it('should include kind as Component', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('kind: Component');
      });

      it('should include metadata with name', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('name: my-service');
      });

      it('should include source-location annotation', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain(
          `backstage.io/source-location: url:${baseSpec.repoUrl}`,
        );
      });

      it('should include github project-slug annotation', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('github.com/project-slug: my-service');
      });

      it('should include owner in spec', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain('owner: group:platform-team');
      });

      it('should include repoUrl in spec', async () => {
        await projenTool.generateCatalog(baseSpec);

        const writtenContent = vi.mocked(fs.writeFileSync).mock
          .calls[0][1] as string;
        expect(writtenContent).toContain(
          'repoUrl: https://github.com/myorg/my-service',
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw ToolError when project directory does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        await expect(projenTool.generateCatalog(baseSpec)).rejects.toThrow(
          ToolError,
        );
      });

      it('should throw ToolError when writeFileSync fails', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
          throw new Error('Permission denied');
        });

        await expect(projenTool.generateCatalog(baseSpec)).rejects.toThrow(
          ToolError,
        );
      });

      it('should throw ToolError when writeFileSync fails with disk full', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
          throw new Error('ENOSPC: no space left on device');
        });

        await expect(projenTool.generateCatalog(baseSpec)).rejects.toThrow(
          ToolError,
        );
      });
    });

    describe('Response Structure', () => {
      beforeEach(() => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
      });

      it('should return success status on successful generation', async () => {
        const result = await projenTool.generateCatalog(baseSpec);

        expect(result.status).toBe('success');
      });

      it('should return catalogPath in response body', async () => {
        const result = await projenTool.generateCatalog(baseSpec);

        expect(result.body?.catalogPath).toBeDefined();
        expect(result.body?.catalogPath).toBe(
          '/tmp/scaffolder/my-service/catalog-info.yaml',
        );
      });

      it('should return correct catalogPath for different project names', async () => {
        const spec = { ...baseSpec, name: 'another-project' };

        const result = await projenTool.generateCatalog(spec);

        expect(result.body?.catalogPath).toBe(
          '/tmp/scaffolder/another-project/catalog-info.yaml',
        );
      });
    });
  });

  describe('getTools', () => {
    it('should return exactly 2 tools', () => {
      const tools = projenTool.getTools();

      expect(tools).toHaveLength(2);
    });

    it('should include scaffold_project tool', () => {
      const tools = projenTool.getTools();
      const scaffoldTool = tools.find((t) => t.name === 'scaffold_project');

      expect(scaffoldTool).toBeDefined();
      expect(scaffoldTool?.name).toBe('scaffold_project');
    });

    it('should include generate_catalog tool', () => {
      const tools = projenTool.getTools();
      const catalogTool = tools.find((t) => t.name === 'generate_catalog');

      expect(catalogTool).toBeDefined();
      expect(catalogTool?.name).toBe('generate_catalog');
    });

    it('should have correct description for scaffold_project tool', () => {
      const tools = projenTool.getTools();
      const scaffoldTool = tools.find((t) => t.name === 'scaffold_project');

      expect((scaffoldTool as FunctionTool)?.description).toContain('scaffold');
      expect((scaffoldTool as FunctionTool)?.description).toContain('Projen');
    });

    it('should have correct description for generate_catalog tool', () => {
      const tools = projenTool.getTools();
      const catalogTool = tools.find((t) => t.name === 'generate_catalog');

      expect((catalogTool as FunctionTool)?.description).toContain('Backstage');
      expect((catalogTool as FunctionTool)?.description).toContain(
        'catalog-info.yaml',
      );
    });

    it('should return tools with strict mode enabled', () => {
      const tools = projenTool.getTools();

      tools.forEach((tool) => {
        expect((tool as any).strict).toBe(true);
      });
    });

    it('should return tools in consistent order', () => {
      const tools1 = projenTool.getTools();
      const tools2 = projenTool.getTools();

      expect(tools1.map((t) => t.name)).toEqual(tools2.map((t) => t.name));
      expect(tools1[0].name).toBe('scaffold_project');
      expect(tools1[1].name).toBe('generate_catalog');
    });
  });

  describe('Integration: scaffoldCode followed by generateCatalog', () => {
    it('should allow generating catalog after scaffolding project', async () => {
      // Scaffold phase - directory doesn't exist
      vi.mocked(fs.existsSync).mockReturnValueOnce(false);
      vi.mocked(fs.mkdirSync).mockImplementationOnce(undefined);
      vi.mocked(fs.rmdirSync).mockImplementationOnce(undefined);

      const scaffoldSpec = {
        name: 'integration-test',
        type: ProjectTypeEnum.TypeScriptApp,
        owner: 'group:test',
        repoUrl: 'git@github.com:org/integration-test.git',
        authorName: 'Test',
        authorEmail: 'test@test.com',
      };

      await projenTool.scaffoldCode(scaffoldSpec);

      // Catalog phase - directory now exists
      vi.mocked(fs.existsSync).mockReturnValueOnce(true);

      const catalogSpec = {
        name: 'integration-test',
        owner: 'group:test',
        repoUrl: 'https://github.com/org/integration-test',
        type: 'service' as const,
      };

      const result = await projenTool.generateCatalog(catalogSpec);

      expect(result.status).toBe('success');
      expect(result.body?.catalogPath).toBe(
        '/tmp/scaffolder/integration-test/catalog-info.yaml',
      );
    });
  });

  describe('execute callbacks', () => {
    it('should execute scaffoldCode when scaffold_project tool is invoked', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const tools = projenTool.getTools();
      const scaffoldTool = tools.find((t) => t.name === 'scaffold_project');

      const result = await (scaffoldTool as any).execute({
        name: 'test-project',
        type: ProjectTypeEnum.TypeScriptApp,
        owner: 'group:test-team',
        repoUrl: 'git@github.com:org/test-project.git',
        authorName: 'Test Author',
        authorEmail: 'test@example.com',
      });

      expect(result.status).toBe('success');
      expect(result.body?.projectPath).toBe('/tmp/scaffolder/test-project');
      expect(Projects.createProject).toHaveBeenCalled();
    });

    it('should execute generateCatalog when generate_catalog tool is invoked', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const tools = projenTool.getTools();
      const catalogTool = tools.find((t) => t.name === 'generate_catalog');

      const result = await (catalogTool as any).execute({
        name: 'test-catalog',
        owner: 'group:test-team',
        repoUrl: 'https://github.com/org/test-catalog',
        type: 'service',
      });

      expect(result.status).toBe('success');
      expect(result.body?.catalogPath).toBe(
        '/tmp/scaffolder/test-catalog/catalog-info.yaml',
      );
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should propagate errors from scaffoldCode through execute callback', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(Projects.createProject).mockImplementationOnce(() => {
        throw new Error('Projen failed');
      });

      const tools = projenTool.getTools();
      const scaffoldTool = tools.find((t) => t.name === 'scaffold_project');

      await expect(
        (scaffoldTool as any).execute({
          name: 'failing-project',
          type: ProjectTypeEnum.TypeScriptApp,
          owner: 'group:test',
          repoUrl: 'git@github.com:org/failing.git',
          authorName: 'Test',
          authorEmail: 'test@test.com',
        }),
      ).rejects.toThrow(ToolError);
    });

    it('should propagate errors from generateCatalog through execute callback', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const tools = projenTool.getTools();
      const catalogTool = tools.find((t) => t.name === 'generate_catalog');

      await expect(
        (catalogTool as any).execute({
          name: 'failing-catalog',
          owner: 'group:test',
          repoUrl: 'https://github.com/org/failing',
          type: 'service',
        }),
      ).rejects.toThrow(ToolError);
    });
  });
});
