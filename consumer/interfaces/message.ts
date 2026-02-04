export type Message = {
  ts: string;
  dongleId: string;
  tvId: string;
  userPseudoId: string;
  channelId: string;
  distanceCm: number;
  rssi: number;
  seq: number;
};
