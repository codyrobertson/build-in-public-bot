import { logger } from '../utils/logger';
import { StorageService } from '../services/storage';
import chalk from 'chalk';
import { Tweet, Draft } from '../types';
import { select, confirm } from '../utils/prompts';

export async function historyCommand(options: any): Promise<void> {
  const storageService = StorageService.getInstance();
  const limit = parseInt(options.limit, 10);

  try {
    // Ask what type of history to view
    const historyType = await select('What would you like to view?', [
      { value: 'posted', label: 'Posted tweets' },
      { value: 'drafts', label: 'Draft tweets' },
      { value: 'both', label: 'Both posted and drafts' }
    ]);

    // Fetch history
    let posts: Tweet[] = [];
    let drafts: Draft[] = [];

    if (historyType === 'posted' || historyType === 'both') {
      posts = await storageService.getHistory(limit);
    }

    if (historyType === 'drafts' || historyType === 'both') {
      drafts = await storageService.getDrafts();
    }

    // Display results
    if (historyType === 'posted' || historyType === 'both') {
      console.log(chalk.bold('\n📮 Posted Tweets:\n'));
      
      if (posts.length === 0) {
        console.log(chalk.gray('No posted tweets yet.'));
      } else {
        posts.forEach((post, index) => {
          console.log(chalk.cyan(`${index + 1}. `) + formatDate(post.createdAt));
          console.log(post.text);
          if (post.mediaUrls && post.mediaUrls.length > 0) {
            console.log(chalk.gray(`   📷 ${post.mediaUrls.length} attachment(s)`));
          }
          console.log();
        });
      }
    }

    if (historyType === 'drafts' || historyType === 'both') {
      console.log(chalk.bold('\n📝 Draft Tweets:\n'));
      
      if (drafts.length === 0) {
        console.log(chalk.gray('No drafts saved.'));
      } else {
        drafts.forEach((draft, index) => {
          console.log(chalk.yellow(`${index + 1}. `) + formatDate(draft.createdAt));
          console.log(draft.text);
          if (draft.includeScreenshot && draft.screenshotPath) {
            console.log(chalk.gray(`   📷 Screenshot attached`));
          }
          console.log(chalk.gray(`   ID: ${draft.id}`));
          console.log();
        });

        // Offer draft actions
        if (drafts.length > 0) {
          const manageDrafts = await confirm('\nWould you like to manage drafts?');
          if (manageDrafts) {
            const action = await select('What would you like to do?', [
              { value: 'post', label: 'Post a draft' },
              { value: 'delete', label: 'Delete a draft' },
              { value: 'cancel', label: 'Cancel' }
            ]);

            if (action === 'post') {
              // This would integrate with Twitter API in the future
              logger.info('Draft posting will be available when Twitter integration is complete.');
            } else if (action === 'delete') {
              const draftIndex = await select('Which draft to delete?', 
                drafts.map((d, i) => ({
                  value: i.toString(),
                  label: `${i + 1}. ${d.text.substring(0, 50)}...`
                }))
              );
              
              const draft = drafts[parseInt(draftIndex, 10)];
              await storageService.deleteDraft(draft.id!);
              logger.success('Draft deleted successfully!');
            }
          }
        }
      }
    }

    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`  Posted tweets: ${posts.length}`);
    console.log(`  Drafts: ${drafts.length}`);
    console.log(`  Total: ${posts.length + drafts.length}`);

  } catch (error) {
    logger.error('Failed to fetch history');
    throw error;
  }
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return chalk.gray(`${diffMinutes} minutes ago`);
  } else if (diffHours < 24) {
    return chalk.gray(`${diffHours} hours ago`);
  } else if (diffDays < 7) {
    return chalk.gray(`${diffDays} days ago`);
  } else {
    return chalk.gray(d.toLocaleDateString());
  }
}