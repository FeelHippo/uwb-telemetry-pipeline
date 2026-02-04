import { DwellTimePerChannel } from './constroller';
import './mqtt/client';
import * as http from 'http';

http
  .createServer(async (req, res) => {
    const { url, method } = req;
    switch (method) {
      case 'GET':
        if (url === '/presence') {
          const { userPseudoId, channelId } = require('url').parse(
            req.url,
            true,
          ).query;
          await DwellTimePerChannel(res, userPseudoId, channelId);
        } else if (url === '/dwell') {
          const { userPseudoId, channelId } = require('url').parse(
            req.url,
            true,
          ).query;
          await DwellTimePerChannel(res, userPseudoId, channelId);
        } else if (url === '/switches') {
          const { userPseudoId, channelId } = require('url').parse(
            req.url,
            true,
          ).query;
          await DwellTimePerChannel(res, userPseudoId, channelId);
        } else res.end();
        break;
      default:
        console.log('Method not recognized');
    }
  })
  .listen(3000, () => console.log('Server running on port 3000'));
