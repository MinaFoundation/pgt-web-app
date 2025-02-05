import Bree from 'bree';
import Graceful from '@ladjs/graceful';
import logger from '@/logging';
import path from 'path';

const bree = new Bree({
  root: path.join(process.cwd(), 'dist', 'tasks'),
  jobs: [
    {
      name: 'ocv-vote-counting',
      path: path.join(process.cwd(), 'dist', 'tasks', 'ocv-vote-counting.js'),
      interval: '10m', // run every 10 minutes
      timeout: false, // prevent starting on initialization
      closeWorkerAfterMs: 9 * 60 * 1000 // Kill after 9 minutes if stuck
    },
    {
      name: 'gpt-survey-processing',
      path: path.join(process.cwd(), 'dist', 'tasks', 'gpt-survey-processing.js'),
      timeout: false, // prevent starting on initialization
      closeWorkerAfterMs: 9 * 60 * 1000 // Kill after 9 minutes if stuck
    }
  ],
  errorHandler: (error, workerMetadata) => {
    logger.error(`[Bree Runner] Worker ${workerMetadata.name} encountered an error:`, error);
  },
  workerMessageHandler: (message, workerMetadata) => {
    if (message === 'completed') {
      logger.info(`[Bree Runner] Worker ${workerMetadata.name} completed successfully`);
    }
  }
});

// Only create the graceful shutdown handler if we're running the script directly
if (require.main === module) {
  const graceful = new Graceful({ brees: [bree] });
  graceful.listen();

  // Start the OCV vote counting job
  (async () => {
    await bree.start('ocv-vote-counting');
    logger.info('Bree OCV vote counting started successfully');
  })();
}

// Export bree instance to be used by the API route
export default bree;
