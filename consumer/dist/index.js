"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const constroller_1 = require("./constroller");
require("./mqtt/client");
const http = require("http");
http.createServer((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { url, method } = req;
    switch (method) {
        case 'GET':
            if (url === '/presence') {
                const { userPseudoId, channelId } = require('url').parse(req.url, true).query;
                yield (0, constroller_1.DwellTimePerChannel)(res, userPseudoId, channelId);
            }
            else if (url === '/dwell') {
                const { userPseudoId, channelId } = require('url').parse(req.url, true).query;
                yield (0, constroller_1.DwellTimePerChannel)(res, userPseudoId, channelId);
            }
            else if (url === '/switches') {
                const { userPseudoId, channelId } = require('url').parse(req.url, true).query;
                yield (0, constroller_1.DwellTimePerChannel)(res, userPseudoId, channelId);
            }
            else
                res.end();
            break;
        default:
            console.log('Method not recognized');
    }
})).listen(3000, () => console.log('Server running on port 3000'));
