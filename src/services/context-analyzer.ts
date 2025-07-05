import { EventEmitter } from 'events';
import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs/promises';
import { FileChange } from './watcher';
import { logger } from '../utils/logger';

export interface CodingContext {
  projectName: string;
  recentChanges: FileChange[];
  currentBranch: string;
  uncommittedFiles: string[];
  lastCommitMessage?: string;
  workingSummary: string;
  suggestedTweet?: string;
  language?: string;
  framework?: string;
}

export class ContextAnalyzerService extends EventEmitter {
  private static instance: ContextAnalyzerService;
  private git: SimpleGit;
  private recentChanges: FileChange[] = [];
  private maxRecentChanges = 50;

  private constructor() {
    super();
    this.git = simpleGit();
  }

  static getInstance(): ContextAnalyzerService {
    if (!ContextAnalyzerService.instance) {
      ContextAnalyzerService.instance = new ContextAnalyzerService();
    }
    return ContextAnalyzerService.instance;
  }

  addFileChange(change: FileChange): void {
    this.recentChanges.unshift(change);
    
    // Keep only the most recent changes
    if (this.recentChanges.length > this.maxRecentChanges) {
      this.recentChanges = this.recentChanges.slice(0, this.maxRecentChanges);
    }

    // Emit event for real-time updates
    this.emit('contextUpdate', change);
  }

  async analyzeCurrentContext(): Promise<CodingContext> {
    const context: CodingContext = {
      projectName: path.basename(process.cwd()),
      recentChanges: this.recentChanges.slice(0, 10), // Last 10 changes
      currentBranch: 'main',
      uncommittedFiles: [],
      workingSummary: '',
    };

    try {
      // Get git information
      const status = await this.git.status();
      context.currentBranch = status.current || 'main';
      context.uncommittedFiles = [
        ...status.modified,
        ...status.created,
        ...status.deleted,
        ...status.renamed.map(r => r.to),
      ];

      // Get last commit message
      try {
        const log = await this.git.log({ n: 1 });
        if (log.latest) {
          context.lastCommitMessage = log.latest.message;
        }
      } catch (error) {
        logger.debug('Could not get git log:', error);
      }

      // Detect language and framework
      const detection = await this.detectProjectType();
      context.language = detection.language;
      context.framework = detection.framework;

      // Generate working summary
      context.workingSummary = this.generateWorkingSummary(context);

    } catch (error) {
      logger.warn('Could not get git information:');
      logger.debug('Git error details:', error);
    }

    return context;
  }

  private async detectProjectType(): Promise<{ language?: string; framework?: string }> {
    const result: { language?: string; framework?: string } = {};

    try {
      // Check for package.json
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        result.language = 'JavaScript/TypeScript';

        // Detect framework from dependencies
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps.react) result.framework = 'React';
        else if (deps.vue) result.framework = 'Vue';
        else if (deps.angular) result.framework = 'Angular';
        else if (deps.next) result.framework = 'Next.js';
        else if (deps.express) result.framework = 'Express';
        else if (deps.fastify) result.framework = 'Fastify';
      } catch {
        // Not a Node.js project
      }

      // Check for other language files
      if (!result.language) {
        const files = await fs.readdir(process.cwd());
        
        if (files.some(f => f.endsWith('.py'))) {
          result.language = 'Python';
          if (files.includes('requirements.txt')) {
            const requirements = await fs.readFile(path.join(process.cwd(), 'requirements.txt'), 'utf-8');
            if (requirements.includes('django')) result.framework = 'Django';
            else if (requirements.includes('flask')) result.framework = 'Flask';
            else if (requirements.includes('fastapi')) result.framework = 'FastAPI';
          }
        } else if (files.some(f => f.endsWith('.go'))) {
          result.language = 'Go';
        } else if (files.some(f => f.endsWith('.rs'))) {
          result.language = 'Rust';
        } else if (files.some(f => f.endsWith('.java'))) {
          result.language = 'Java';
        }
      }
    } catch (error) {
      logger.debug('Error detecting project type:', error);
    }

    return result;
  }

  private generateWorkingSummary(context: CodingContext): string {
    const parts: string[] = [];

    // Add project info
    if (context.language) {
      parts.push(`Working on a ${context.language} project`);
      if (context.framework) {
        parts[0] += ` using ${context.framework}`;
      }
    }

    // Add branch info if not on main/master
    if (context.currentBranch && !['main', 'master'].includes(context.currentBranch)) {
      parts.push(`on branch "${context.currentBranch}"`);
    }

    // Summarize recent changes
    if (context.recentChanges.length > 0) {
      const fileTypes = new Set<string>();
      const actions = new Set<string>();

      context.recentChanges.forEach(change => {
        const ext = path.extname(change.path);
        if (ext) fileTypes.add(ext);
        actions.add(change.type);
      });

      const actionSummary = [];
      if (actions.has('add')) actionSummary.push('adding');
      if (actions.has('change')) actionSummary.push('modifying');
      if (actions.has('unlink')) actionSummary.push('removing');

      parts.push(`${actionSummary.join(' and ')} ${fileTypes.size} file type(s)`);
    }

    // Add uncommitted files info
    if (context.uncommittedFiles.length > 0) {
      parts.push(`with ${context.uncommittedFiles.length} uncommitted changes`);
    }

    return parts.join(', ');
  }

  async generateTweetSuggestion(context: CodingContext): Promise<string> {
    // This is a simple rule-based suggestion generator
    // In a real implementation, this could use AI to generate better suggestions

    const suggestions: string[] = [];

    // Based on recent file changes
    if (context.recentChanges.length > 0) {
      const latestChange = context.recentChanges[0];
      const fileName = path.basename(latestChange.path);
      
      if (latestChange.type === 'add') {
        suggestions.push(`Just created ${fileName} - building something new!`);
      } else if (latestChange.type === 'change') {
        suggestions.push(`Refactoring ${fileName} for better performance`);
      }
    }

    // Based on uncommitted files
    if (context.uncommittedFiles.length > 5) {
      suggestions.push(`Major progress today with ${context.uncommittedFiles.length} files updated`);
    }

    // Based on framework
    if (context.framework) {
      suggestions.push(`Building with ${context.framework} - loving the developer experience`);
    }

    // Based on last commit
    if (context.lastCommitMessage) {
      const cleanMessage = context.lastCommitMessage.split('\n')[0].trim();
      suggestions.push(`Just committed: "${cleanMessage}"`);
    }

    // Return a random suggestion or a default
    return suggestions.length > 0 
      ? suggestions[Math.floor(Math.random() * suggestions.length)]
      : `Making progress on ${context.projectName}`;
  }

  clearRecentChanges(): void {
    this.recentChanges = [];
  }

  getRecentChanges(limit?: number): FileChange[] {
    return limit ? this.recentChanges.slice(0, limit) : this.recentChanges;
  }
}