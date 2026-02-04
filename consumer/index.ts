import {
  allRecentMeasurements,
  countChannelSwitches,
  dwellTimePerChannel,
  measurementsWithinPresence,
} from './constroller';
import './mqtt/client';
import * as http from 'http';

http
  .createServer(async (req, res) => {
    const { url, method } = req;
    switch (method) {
      case 'GET':
        if (url?.includes('/all')) {
          await allRecentMeasurements(res);
        } else if (url?.includes('/presence')) {
          const { userPseudoId, threshold } = require('url').parse(
            req.url,
            true,
          ).query;
          await measurementsWithinPresence(res, userPseudoId, threshold);
        } else if (url?.includes('/dwell')) {
          const { userPseudoId, channelId } = require('url').parse(
            req.url,
            true,
          ).query;
          await dwellTimePerChannel(res, userPseudoId, channelId);
        } else if (url?.includes('/switches')) {
          const { userPseudoId } = require('url').parse(req.url, true).query;
          await countChannelSwitches(res, userPseudoId);
        } else res.end();
        break;
      default:
        console.log('Method not recognized');
    }
  })
  .listen(3001, () => console.log('Server running on port 3001'));
