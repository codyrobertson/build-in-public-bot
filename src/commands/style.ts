import { logger } from '../utils/logger';
import { ConfigService } from '../services/config';
import { prompt, confirm, select } from '../utils/prompts';
import chalk from 'chalk';
import { Config } from '../types';

export async function styleCommand(options: any): Promise<void> {
  const configService = ConfigService.getInstance();

  try {
    const config = await configService.load();

    if (options.reset) {
      const confirmReset = await confirm(
        'Are you sure you want to reset style preferences to defaults?'
      );
      
      if (confirmReset) {
        const defaultStyle: Config['style'] = {
          tone: 'casual-technical',
          emojis: {
            frequency: 'moderate',
            preferred: ['🚀', '💡', '🔧', '✨', '🎯', '💻', '🛠️', '⚡']
          },
          hashtags: {
            always: ['#buildinpublic'],
            contextual: ['#webdev', '#typescript', '#nodejs', '#opensource']
          },
          examples: [
            'Just shipped a new feature that makes X 10x faster 🚀 Used Y technique to optimize Z. The difference is wild! #buildinpublic',
            'Debugging session turned into a refactoring marathon 🔧 Sometimes the best features come from fixing bugs. Added proper error handling and the UX is so much smoother now ✨',
            'TIL: You can use X to solve Y problem. Been struggling with this for hours and the solution was so simple 💡 Love when things just click! #buildinpublic #webdev'
          ]
        };

        await configService.update({ style: defaultStyle });
        logger.success('Style preferences reset to defaults!');
      } else {
        logger.info('Reset cancelled.');
      }
      return;
    }

    console.log(chalk.bold('\n🎨 Configure Tweet Style\n'));

    // Current settings
    console.log(chalk.bold('Current Settings:'));
    console.log(`  Tone: ${chalk.cyan(config.style.tone)}`);
    console.log(`  Emoji frequency: ${chalk.cyan(config.style.emojis.frequency)}`);
    console.log(`  Always hashtags: ${chalk.cyan(config.style.hashtags.always.join(', ') || 'none')}`);
    console.log();

    const action = await select('What would you like to configure?', [
      { value: 'tone', label: 'Writing tone' },
      { value: 'emojis', label: 'Emoji usage' },
      { value: 'hashtags', label: 'Hashtag preferences' },
      { value: 'examples', label: 'Example tweets' },
      { value: 'done', label: 'Done (save and exit)' }
    ]);

    if (action === 'done') {
      return;
    }

    switch (action) {
      case 'tone': {
        const tone = await select('Select writing tone:', [
          { value: 'casual-technical', label: 'Casual Technical (friendly but informative)' },
          { value: 'professional', label: 'Professional (formal and structured)' },
          { value: 'enthusiastic', label: 'Enthusiastic (excited and energetic)' },
          { value: 'minimalist', label: 'Minimalist (concise and to the point)' }
        ]);
        
        config.style.tone = tone;
        break;
      }

      case 'emojis': {
        const frequency = await select('How often should emojis be used?', [
          { value: 'none', label: 'Never use emojis' },
          { value: 'low', label: 'Sparingly (max 1 per tweet)' },
          { value: 'moderate', label: 'Moderate (1-2 per tweet)' },
          { value: 'high', label: 'Frequently (2-3 per tweet)' }
        ]);

        config.style.emojis.frequency = frequency;

        if (frequency !== 'none') {
          const customEmojis = await confirm('Would you like to customize preferred emojis?');
          if (customEmojis) {
            const emojiList = await prompt(
              'Enter preferred emojis (separated by spaces)',
              { default: config.style.emojis.preferred.join(' ') }
            );
            config.style.emojis.preferred = emojiList.split(' ').filter(e => e.trim());
          }
        }
        break;
      }

      case 'hashtags': {
        const alwaysHashtags = await prompt(
          'Hashtags to always include (separated by spaces)',
          { default: config.style.hashtags.always.join(' ') }
        );
        
        const contextualHashtags = await prompt(
          'Contextual hashtags to consider (separated by spaces)',
          { default: config.style.hashtags.contextual.join(' ') }
        );

        config.style.hashtags.always = alwaysHashtags.split(' ')
          .filter(h => h.trim())
          .map(h => h.startsWith('#') ? h : `#${h}`);
          
        config.style.hashtags.contextual = contextualHashtags.split(' ')
          .filter(h => h.trim())
          .map(h => h.startsWith('#') ? h : `#${h}`);
        break;
      }

      case 'examples': {
        console.log('\nCurrent example tweets:');
        config.style.examples.forEach((ex, i) => {
          console.log(`${i + 1}. ${ex}`);
        });

        const addExample = await confirm('\nWould you like to add an example tweet?');
        if (addExample) {
          const example = await prompt('Enter example tweet');
          config.style.examples.push(example);
        }

        const removeExample = await confirm('Would you like to remove an example?');
        if (removeExample && config.style.examples.length > 0) {
          const indexStr = await prompt(
            `Which example to remove? (1-${config.style.examples.length})`,
            {
              validate: (input) => {
                const num = parseInt(input, 10);
                if (isNaN(num) || num < 1 || num > config.style.examples.length) {
                  return `Please enter a number between 1 and ${config.style.examples.length}`;
                }
                return true;
              }
            }
          );
          config.style.examples.splice(parseInt(indexStr, 10) - 1, 1);
        }
        break;
      }
    }

    // Save changes
    await configService.save(config);
    logger.success('Style preferences updated!');

    // Ask if they want to continue configuring
    const continueConfig = await confirm('Continue configuring?', true);
    if (continueConfig) {
      await styleCommand({});
    }
  } catch (error) {
    logger.error('Failed to update style preferences');
    throw error;
  }
}